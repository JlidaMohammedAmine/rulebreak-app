"use server";

import { streamObject, generateText } from 'ai';
import { 
  ruleSchema, 
  sourceReferenceSchema, 
  scenarioSchema, 
  evaluationSchema, 
  findingSchema, 
  patchProposalSchema 
} from '@/lib/validation/schemas';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

// Helper to configure the model
const getModel = () => {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Missing Gemini API Key. Please add GEMINI_API_KEY to your .env.local file.");
  }
  return google('gemini-3.5-flash'); 
};

export async function cleanPolicyAction(policyText: string) {
  const result = await generateText({
    model: getModel(),
    prompt: `You are a highly advanced document filter. The user will provide a raw web scrape of a policy document.
CRITICAL: You MUST aggressively remove ALL navigational links, "Skip to content", headers, footers, cookie consent banners, menus, search bars, "About us", "Careers", "Investors", and unrelated website boilerplate.
ONLY output the actual text of the policy itself. Ensure the output is clean, professional, and well-structured.
If the input is entirely garbage, output "No valid policy text found."
Do not add any conversational filler. OUTPUT THE CLEAN POLICY ONLY.

<INPUT>
${policyText}
</INPUT>`,
  });
  return result.text;
}

export async function* extractRulesAction(policyText: string) {
  try {
    const result = await streamObject({
      model: getModel(),
      schema: z.object({
        rules: z.array(ruleSchema),
        sources: z.array(sourceReferenceSchema)
      }),
      prompt: `You are an expert AI policy analyst. Extract all rules and source chunks from the following policy document.
      
DOCUMENT:
${policyText}
      `,
    });

    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  } catch (e: any) {
    console.error("extractRulesAction Error:", e);
    yield { error: e.message || "An error occurred during extraction" };
  }
}

export async function* generateScenariosAction(rules: any[], policyText: string) {
  try {
    const result = await streamObject({
      model: getModel(),
      schema: z.object({
        scenarios: z.array(scenarioSchema)
      }),
      prompt: `You are an expert red-teamer. Given the following extracted rules and policy, generate 3-5 HIGHLY ADVERSARIAL test scenarios to challenge the policy logic.
Your goal is to find contradictions, edge cases, loopholes, or missing information in the rules. 
Be creative and exploit exact phrasing.

RULES:
${JSON.stringify(rules, null, 2)}

POLICY:
${policyText}
      `,
    });

    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  } catch (e: any) {
    console.error("generateScenariosAction Error:", e);
    yield { error: e.message || "An error occurred during scenario generation" };
  }
}

export async function* judgeScenariosAction(scenarios: any[], rules: any[], policyText: string, framework: string) {
  try {
    const result = await streamObject({
      model: getModel(),
      schema: z.object({
        evaluations: z.array(evaluationSchema)
      }),
      prompt: `You are an extremely strict compliance judge. Evaluate the following scenarios against the rules and policy.
If the scenario reveals any conflict, ambiguity, or loophole, you MUST mark the status as 'FAIL' or 'CONTRADICTION' or 'AMBIGUOUS'. Do NOT let adversarial edge cases pass. Be harsh.
      
SCENARIOS:
${JSON.stringify(scenarios, null, 2)}

RULES:
${JSON.stringify(rules, null, 2)}

POLICY:
${policyText}

FRAMEWORK: ${framework}
      `,
    });

    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  } catch (e: any) {
    console.error("judgeScenariosAction Error:", e);
    yield { error: e.message || "An error occurred during judging" };
  }
}

export async function* aggregateFindingsAction(evaluations: any[], rules: any[]) {
  try {
    const result = await streamObject({
      model: getModel(),
      schema: z.object({
        findings: z.array(findingSchema)
      }),
      prompt: `Review the following evaluations and aggregate them into high-level findings.
You MUST output at least one finding if any evaluation has a status other than PASS (e.g. AMBIGUOUS, FAIL, CONTRADICTION).
If there are loopholes, conflicts, or missing rules, document them as findings.
      
EVALUATIONS:
${JSON.stringify(evaluations, null, 2)}

RULES:
${JSON.stringify(rules, null, 2)}
      `,
    });

    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  } catch (e: any) {
    console.error("aggregateFindingsAction Error:", e);
    yield { error: e.message || "An error occurred during aggregation" };
  }
}

export async function* challengePolicyAction(rulesToChallenge: any[], policyText: string) {
  try {
    const result = await streamObject({
      model: getModel(),
      schema: z.object({
        scenarios: z.array(scenarioSchema)
      }),
      prompt: `Generate 3 adversarial scenarios specifically designed to break or find loopholes in these specific rules:
      
RULES:
${JSON.stringify(rulesToChallenge, null, 2)}

CONTEXT POLICY:
${policyText}`,
    });

    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  } catch (e: any) {
    console.error("challengePolicyAction Error:", e);
    yield { error: e.message || "An error occurred during challenge generation" };
  }
}

export async function* proposePatchAction(finding: any, policyText: string, rules: any[]) {
  try {
    const result = await streamObject({
      model: getModel(),
      schema: z.object({
        patch: patchProposalSchema
      }),
      prompt: `You are an expert policy drafter. Fix this finding by proposing a minimal patch.
      
FINDING:
${JSON.stringify(finding, null, 2)}

AFFECTED RULES:
${JSON.stringify(rules.filter((r: any) => finding.ruleIds.includes(r.id)), null, 2)}`,
    });

    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  } catch (e: any) {
    console.error("proposePatchAction Error:", e);
    yield { error: e.message || "An error occurred during patch generation" };
  }
}
