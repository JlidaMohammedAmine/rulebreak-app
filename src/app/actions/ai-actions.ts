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
    throw new Error("Missing Gemini API Key. Please create a .env.local file at the root of the project and add GEMINI_API_KEY=your_key_here.");
  }
  return google('gemini-3.1-pro-preview');
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
}

export async function* generateScenariosAction(rules: any[], policyText: string) {
  const result = await streamObject({
    model: getModel(),
    schema: z.object({
      scenarios: z.array(scenarioSchema)
    }),
    prompt: `You are an expert red-teamer. Given the following extracted rules and policy, generate 3-5 adversarial test scenarios to challenge the policy logic.
    
RULES:
${JSON.stringify(rules, null, 2)}

POLICY:
${policyText}
    `,
  });

  for await (const partialObject of result.partialObjectStream) {
    yield partialObject;
  }
}

export async function* judgeScenariosAction(scenarios: any[], rules: any[], policyText: string, framework: string) {
  const result = await streamObject({
    model: getModel(),
    schema: z.object({
      evaluations: z.array(evaluationSchema)
    }),
    prompt: `You are an expert compliance judge. Evaluate the following scenarios against the rules and policy.
    
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
}

export async function* aggregateFindingsAction(evaluations: any[], rules: any[]) {
  const result = await streamObject({
    model: getModel(),
    schema: z.object({
      findings: z.array(findingSchema)
    }),
    prompt: `Review these evaluations and aggregate them into high-level findings (e.g. contradictions, ambiguities).
    
EVALUATIONS:
${JSON.stringify(evaluations, null, 2)}

RULES:
${JSON.stringify(rules, null, 2)}
    `,
  });

  for await (const partialObject of result.partialObjectStream) {
    yield partialObject;
  }
}

export async function* challengePolicyAction(rulesToChallenge: any[], policyText: string) {
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
}

export async function* proposePatchAction(finding: any, policyText: string, rules: any[]) {
  const result = await streamObject({
    model: getModel(),
    schema: z.object({
      patch: patchProposalSchema
    }),
    prompt: `You are an expert policy drafter. Fix this finding by proposing a minimal patch.
    
FINDING:
${JSON.stringify(finding, null, 2)}

AFFECTED RULES:
${JSON.stringify(rules.filter(r => finding.ruleIds.includes(r.id)), null, 2)}`,
  });

  for await (const partialObject of result.partialObjectStream) {
    yield partialObject;
  }
}
