import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";
import { ruleSchema, scenarioSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const requestSchema = z.object({
  scenarios: z.array(scenarioSchema),
  rules: z.array(ruleSchema),
  policyText: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarios, rules, policyText } = requestSchema.parse(body);

    const provider = getAIProvider();
    
    // 1. Judge all scenarios
    const evaluations = await provider.judgeScenarios(scenarios, rules, policyText);
    
    // 2. Aggregate findings from the evaluations
    const findings = await provider.aggregateFindings(evaluations, rules);

    return NextResponse.json({ success: true, data: { evaluations, findings } });
  } catch (error) {
    console.error("Judging error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to judge scenarios." } },
      { status: 500 }
    );
  }
}
