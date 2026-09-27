import { createGroq } from '@ai-sdk/groq';
import { streamObject, generateText } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { ruleSchema, sourceReferenceSchema } from './src/lib/validation/schemas.ts';

dotenv.config({ path: '.env.local' });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq('openai/gpt-oss-120b');

async function run() {
  const policyText = `Employee PTO Policy
All employees must submit PTO requests at least 14 days in advance of their requested time off.
Under no circumstances can a PTO request be approved if it spans the last week of the fiscal quarter.
Employees who fall sick are entitled to use their PTO as "Emergency Sick Leave." When doing so, they must submit their PTO request on the exact day they fall ill.`;

  console.log("Extracting...");
  const result = await streamObject({
    model,
    schema: z.object({
      rules: z.array(ruleSchema),
      sources: z.array(sourceReferenceSchema)
    }),
    prompt: `You are an expert AI policy analyst. Extract all rules and source chunks from the following policy document.
    
DOCUMENT:
${policyText}
    `,
  });

  let rules = [];
  for await (const chunk of result.partialObjectStream) {
    if (chunk.rules) rules = chunk.rules;
  }
  console.log("Extracted Rules:", rules);
}

run().catch(console.error);
