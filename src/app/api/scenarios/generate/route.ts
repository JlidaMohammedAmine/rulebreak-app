import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";
import { ruleSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const requestSchema = z.object({
  rules: z.array(ruleSchema),
  policyText: z.string(),
  targetCount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rules, policyText, targetCount } = requestSchema.parse(body);

    const provider = getAIProvider();
    const scenarios = await provider.generateScenarios(rules, policyText, targetCount);

    return NextResponse.json({ success: true, data: { scenarios } });
  } catch (error) {
    console.error("Scenario generation error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to generate scenarios." } },
      { status: 500 }
    );
  }
}
