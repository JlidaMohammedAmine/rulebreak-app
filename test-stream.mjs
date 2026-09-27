import { createGroq } from '@ai-sdk/groq';
import { streamObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq('qwen/qwen3.8-27b');

const ruleSchema = z.object({
  id: z.string(),
  statement: z.string(),
});

async function run() {
  const policyText = `The company cannot withhold final paychecks under California state law. However, if equipment is not returned within 14 days, the hardware cost will be deducted from the final paycheck.`;

  console.log("Extracting with streamObject...");
  try {
    const result = await streamObject({
      model,
      schema: z.object({ rules: z.array(ruleSchema) }),
      prompt: `Extract rules from:\n${policyText}`,
    });

    let finalRules = [];
    for await (const chunk of result.partialObjectStream) {
      console.log("Chunk:", chunk);
      if (chunk.rules) finalRules = chunk.rules;
    }
    console.log("Final Rules:", finalRules);
  } catch (e) {
    console.error("Error:", e);
  }
}

run().catch(console.error);
