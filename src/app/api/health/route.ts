import { NextResponse } from 'next/server';

export async function GET() {
  const isConfigured = !!process.env.OPENAI_API_KEY;
  return NextResponse.json({
    status: isConfigured ? 'ok' : 'error',
    openaiConfigured: isConfigured,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
}
