import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { user } });
}
