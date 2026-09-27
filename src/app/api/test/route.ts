import { extractRulesAction } from '@/app/actions/ai-actions';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stream = extractRulesAction("Test policy. You must do this.");
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return NextResponse.json({ success: true, chunks });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, stack: e.stack });
  }
}
