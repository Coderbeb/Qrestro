import prisma from '@/lib/db';
import { authenticateRequest, comparePassword, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limit: max 5 password change attempts per minute per IP
  if (isRateLimited(request, 5, 60000)) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please wait a moment.' } },
      { status: 429 }
    );
  }

  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Current and new password are required' } }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'New password must be at least 6 characters' } }, { status: 400 });
    }

    const owner = await prisma.owner.findUnique({ where: { id: user.id } });
    if (!owner) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Owner not found' } }, { status: 404 });

    const isValid = await comparePassword(currentPassword, owner.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.owner.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to change password' } }, { status: 500 });
  }
}
