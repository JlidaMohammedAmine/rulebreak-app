import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { policyText } = await req.json();

    if (!policyText) {
      return NextResponse.json({ success: false, error: { message: "policyText is required" } }, { status: 400 });
    }

    const provider = getAIProvider();
    
    // We'll add a formatPolicy method to AIProvider, or if it doesn't exist, we'll implement it.
    // Wait, let's just use the provider to do it if we implement formatPolicy, 
    // or just implement formatPolicy in the provider interfaces now.
    const formattedText = await provider.formatPolicy(policyText);

    return NextResponse.json({
      success: true,
      data: { formattedText }
    });

  } catch (error: any) {
    console.error("[POST /api/policy/format]", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
