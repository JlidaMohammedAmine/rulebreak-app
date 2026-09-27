import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/factory";

export const maxDuration = 60; // 60s max for Vercel

export async function POST(req: Request) {
  try {
    const { policyText } = await req.json();

    if (!policyText) {
      return NextResponse.json({ success: false, error: { message: "policyText is required" } }, { status: 400 });
    }

    const provider = getAIProvider();
    const cleanedText = await provider.cleanPolicy(policyText);

    return NextResponse.json({
      success: true,
      data: { cleanedText }
    });

  } catch (error: any) {
    console.error("[POST /api/policy/clean]", error);
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
