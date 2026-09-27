import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq('qwen/qwen3.8-27b');

const ruleSchema = z.object({
  id: z.string(),
  statement: z.string(),
});

const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  narrative: z.string(),
});

const evalSchema = z.object({
  scenarioId: z.string(),
  status: z.enum(["PASS", "FAIL", "AMBIGUOUS", "CONTRADICTION"]),
  summary: z.string(),
});

async function run() {
  const policyText = `The company cannot withhold final paychecks under California state law. However, if equipment is not returned within 14 days, the hardware cost will be deducted from the final paycheck.`;

  console.log("Extracting...");
  const rRes = await generateObject({
    model,
    schema: z.object({ rules: z.array(ruleSchema) }),
    prompt: `Extract rules from:\n${policyText}`,
  });
  const rules = rRes.object.rules;
  console.log("Rules:", rules);

  console.log("Generating scenarios...");
  const sRes = await generateObject({
    model,
    schema: z.object({ scenarios: z.array(scenarioSchema) }),
    prompt: `Generate 2 highly adversarial scenarios to break these rules:\n${JSON.stringify(rules)}`,
  });
  const scenarios = sRes.object.scenarios;
  console.log("Scenarios:", scenarios);

  console.log("Judging...");
  const jRes = await generateObject({
    model,
    schema: z.object({ evaluations: z.array(evalSchema) }),
    prompt: `Strict compliance judge. Evaluate these scenarios against the rules. Mark FAIL or CONTRADICTION if there is a conflict. Be harsh.\nRules: ${JSON.stringify(rules)}\nScenarios: ${JSON.stringify(scenarios)}\nPolicy: ${policyText}`,
  });
  console.log("Evaluations:", jRes.object.evaluations);
}

run().catch(console.error);
