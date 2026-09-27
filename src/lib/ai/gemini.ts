import { AIProvider } from "./provider";
import { Rule, Scenario, Evaluation, Finding, PatchProposal } from "@/types";
import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";

// Zod is available for parsing if we need, but genai SDK handles schema internally if we pass it,
// though passing Zod to Gemini structured outputs requires some mapping or just relying on text extraction.
// We will instruct Gemini to output JSON and we'll parse it.
import { z } from "zod";
import { 
  rulesResponseSchema, 
  scenariosResponseSchema, 
  evaluationsResponseSchema, 
  findingsResponseSchema,
  patchResponseSchema
} from "../validation/schemas";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  private fallbackModels = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview"
  ];

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });
    this.model = this.fallbackModels[0];
  }

  private async generateContentWithFallback(contents: any, config: any) {
    let lastError = null;
    for (const model of this.fallbackModels) {
      for (let attempt = 1; attempt <= 1; attempt++) {
        try {
          return await this.client.models.generateContent({
            model: model,
            contents: contents,
            config: config
          });
        } catch (e: any) {
          lastError = e;
          console.warn(`[GEMINI] ${model} failed: ${e.message}`);
          
          if (e.message?.includes("400") || e.message?.includes("INVALID_ARGUMENT")) {
             throw e; // Bad request, don't retry with other models
          }
          
          // For any other error (503, 429, 404, etc), we just break the attempt loop 
          // and move to the next model in the fallback array.
          break;
        }
      }
    }
    throw lastError;
  }

  private async callJSON<T>(systemPrompt: string, userPrompt: string, schema: z.ZodType<any, any>): Promise<T> {
    const startTime = Date.now();
    try {
      const response = await this.generateContentWithFallback(
        userPrompt,
        {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      );
      
      let content = response.text || "{}";
      
      const parsed = JSON.parse(content);
      const validated = schema.parse(parsed) as T;
      return validated;
    } catch (e: any) {
      console.error("[GEMINI] callJSON Error:", e.message);
      throw e;
    }
  }

  async cleanPolicy(policyText: string): Promise<string> {
    const sys = `You are a highly advanced document filter. The user will provide a raw web scrape of a policy document.
CRITICAL: You MUST aggressively remove ALL navigational links, "Skip to content", headers, footers, cookie consent banners, menus, search bars, "About us", "Careers", "Investors", and unrelated website boilerplate.
ONLY output the actual text of the policy itself. Ensure the output is clean, professional, and well-structured.
If the input is entirely garbage, output "No valid policy text found."
Do not add any conversational filler. OUTPUT THE CLEAN POLICY ONLY.`;
    
    try {
      const response = await this.generateContentWithFallback(
        `<INPUT>\n${policyText}\n</INPUT>`,
        {
          systemInstruction: sys,
          temperature: 0.1,
        }
      );
      return response.text || policyText;
    } catch (e) {
      console.warn("[GEMINI] cleanPolicy failed", e);
      return policyText;
    }
  }

  async formatPolicy(policyText: string): Promise<string> {
    const sys = `You are a professional legal document formatter.
Your task is to take the provided policy text and perfectly structure it into a beautiful, minimalistic Markdown document.
Remove any leftover unrelated text (like website footer/header leftovers).
Use appropriate headings, bullet points, and bold text for emphasis.
Ensure NO loopholes or contradictions are introduced. Output ONLY the formatted Markdown text.`;
    
    try {
      const response = await this.generateContentWithFallback(
        `<INPUT>\n${policyText}\n</INPUT>`,
        {
          systemInstruction: sys,
          temperature: 0.2,
        }
      );
      return response.text || policyText;
    } catch (e) {
      return policyText;
    }
  }

  async extractRules(policyText: string) {
    const sys = `You are an expert policy analyst. Extract discrete logical rules from the provided policy.
Identify: statement, conditions, exceptions, actions, time constraints, definitions, undefined terms, and source references.
Represent vague terms as semantically undefined unless explicitly defined in the policy.
You MUST return a valid JSON object matching EXACTLY this structure:
{
  "rules": [
    {
      "id": "R01",
      "statement": "string",
      "category": "time_limit" | "exception" | "condition" | "restriction" | "action" | "definition" | "other",
      "conditions": [ { "field": "string", "operator": "string", "value": "string" } ],
      "exceptions": [ "string" ],
      "action": "string",
      "sourceId": "SRC-001"
    }
  ],
  "sources": [
    {
      "id": "SRC-001",
      "text": "string"
    }
  ]
}
Make sure every rule has a unique "id", a valid "category", and a "sourceId" that matches an id in the "sources" array.`;
    const user = `<POLICY_DOCUMENT>\n${policyText}\n</POLICY_DOCUMENT>\n\nExtract rules now.`;
    
    const res = await this.callJSON<any>(sys, user, rulesResponseSchema);
    return { rules: res.rules, sources: res.sources };
  }

  async generateScenarios(rules: Rule[], policyText: string, targetCount: number = 8) {
    const sys = `You are an adversarial QA engineer. Generate EXACTLY ${targetCount} unique scenarios deliberately targeting interactions between the provided rules.
Categories to cover: NORMAL, BOUNDARY, AMBIGUOUS, CONTRADICTION, EXCEPTION_INTERACTION, MISSING_INFORMATION, SEQUENCE, PRECEDENCE, ADVERSARIAL.
Target logical gaps. You MUST return JSON matching EXACTLY this structure:
{
  "scenarios": [
    {
      "id": "S001",
      "type": "NORMAL" | "BOUNDARY" | "AMBIGUOUS" | "CONTRADICTION" | "EXCEPTION_INTERACTION" | "MISSING_INFORMATION" | "SEQUENCE" | "PRECEDENCE" | "ADVERSARIAL",
      "title": "string",
      "facts": { "key": "value" },
      "narrative": "string",
      "targetRules": [ "R01", "R02" ]
    }
  ]
}`;
    const user = `RULES:\n${JSON.stringify(rules)}\n\n<POLICY_DOCUMENT>\n${policyText}\n</POLICY_DOCUMENT>`;
    
    const res = await this.callJSON<any>(sys, user, scenariosResponseSchema);
    return res.scenarios;
  }

  async judgeScenarios(scenarios: Scenario[], rules: Rule[], policyText: string) {
    const sys = `You are a strict logical adjudicator. Evaluate the scenario against the provided rules.
Determine status: PASS, FAIL, AMBIGUOUS, CONTRADICTION, MISSING_RULE, INSUFFICIENT_INFORMATION.
You MUST return JSON matching EXACTLY this structure:
{
  "evaluations": [
    {
      "scenarioId": "S001",
      "status": "PASS" | "FAIL" | "AMBIGUOUS" | "CONTRADICTION" | "MISSING_RULE" | "INSUFFICIENT_INFORMATION",
      "summary": "string",
      "applicableRules": ["R01"],
      "evidence": [ { "ruleId": "R01", "sourceText": "string" } ],
      "reasoning": "string"
    }
  ]
}`;

    const limit = pLimit(5);
    const evaluations = await Promise.all(scenarios.map(scenario => limit(async () => {
      const user = `RULES:\n${JSON.stringify(rules)}\n\nSCENARIO TO EVALUATE:\n${JSON.stringify(scenario)}`;
      const res = await this.callJSON<any>(sys, user, evaluationsResponseSchema);
      return res.evaluations[0];
    })));

    return evaluations;
  }

  async aggregateFindings(evaluations: Evaluation[], rules: Rule[], complianceFramework?: string) {
    const complianceInstruction = complianceFramework && complianceFramework !== "None"
      ? `\nALSO, explicitly analyze if any of these rules or the policy as a whole violates the ${complianceFramework} framework. If they do, flag a finding with type "COMPLIANCE_VIOLATION".`
      : "";

    const findingsSys = `You are a risk analyst. Analyze the evaluations and aggregate them into critical findings (contradictions, gaps, ambiguities).${complianceInstruction}
You MUST return JSON matching EXACTLY this structure:
{
  "findings": [
    {
      "id": "F001",
      "type": "CONTRADICTION" | "AMBIGUITY" | "MISSING_RULE" | "PRECEDENCE_CONFLICT" | "BOUNDARY_GAP" | "INSUFFICIENT_INFORMATION" | "COMPLIANCE_VIOLATION",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "ruleIds": ["R01"],
      "description": "string",
      "evidence": "string",
      "scenarioIds": ["S001"]
    }
  ]
}`;
    const findingsUser = `EVALUATIONS:\n${JSON.stringify(evaluations)}`;
    const findingsRes = await this.callJSON<any>(findingsSys, findingsUser, findingsResponseSchema);
    return findingsRes.findings;
  }

  async challengePolicy(rulesToChallenge: Rule[], policyText: string) {
    const sys = `Generate EXACTLY 6 adversarial scenarios specifically targeting the vulnerabilities in these rules.
You MUST return JSON matching EXACTLY this structure:
{
  "scenarios": [
    {
      "id": "S001",
      "type": "NORMAL" | "BOUNDARY" | "AMBIGUOUS" | "CONTRADICTION" | "EXCEPTION_INTERACTION" | "MISSING_INFORMATION" | "SEQUENCE" | "PRECEDENCE" | "ADVERSARIAL",
      "title": "string",
      "facts": { "key": "value" },
      "narrative": "string",
      "targetRules": [ "R01", "R02" ]
    }
  ]
}`;
    const user = `RULES TO CHALLENGE:\n${JSON.stringify(rulesToChallenge)}\n\n<POLICY_DOCUMENT>\n${policyText}\n</POLICY_DOCUMENT>`;
    
    const res = await this.callJSON<any>(sys, user, scenariosResponseSchema);
    return res.scenarios.map((s: any) => ({ ...s, id: "C" + s.id }));
  }

  async proposePatch(finding: Finding, policyText: string, rules: Rule[]) {
    const sys = `Propose a patch to resolve the given finding in the policy document.
You MUST return JSON matching EXACTLY this structure:
{
  "patch": {
    "id": "P01",
    "findingId": "F001",
    "originalText": "string",
    "proposedText": "string",
    "explanation": "string"
  }
}`;
    const user = `FINDING:\n${JSON.stringify(finding)}\n\n<POLICY_DOCUMENT>\n${policyText}\n</POLICY_DOCUMENT>`;
    
    const res = await this.callJSON<any>(sys, user, patchResponseSchema);
    return res.patch;
  }
}
