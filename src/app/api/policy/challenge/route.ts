import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";
import { ruleSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const requestSchema = z.object({
  rulesToChallenge: z.array(ruleSchema),
  policyText: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rulesToChallenge, policyText } = requestSchema.parse(body);

    const provider = getAIProvider();
    const scenarios = await provider.challengePolicy(rulesToChallenge, policyText);

    return NextResponse.json({ success: true, data: { scenarios } });
  } catch (error) {
    console.error("Challenge error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to challenge policy." } },
      { status: 500 }
    );
  }
}
