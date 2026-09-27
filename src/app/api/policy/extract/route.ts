import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";
import { z } from "zod";

const requestSchema = z.object({
  policyText: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { policyText } = requestSchema.parse(body);

    const provider = getAIProvider();
    const result = await provider.extractRules(policyText);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to extract rules." } },
      { status: 500 }
    );
  }
}
