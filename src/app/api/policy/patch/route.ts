import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";
import { findingSchema, ruleSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const requestSchema = z.object({
  finding: findingSchema,
  policyText: z.string(),
  rules: z.array(ruleSchema),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { finding, policyText, rules } = requestSchema.parse(body);

    const provider = getAIProvider();
    const patch = await provider.proposePatch(finding, policyText, rules);

    return NextResponse.json({ success: true, data: { patch } });
  } catch (error) {
    console.error("Patch error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to propose patch." } },
      { status: 500 }
    );
  }
}
