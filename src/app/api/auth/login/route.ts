import prisma from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 10 login attempts per minute per IP
    if (isRateLimited(request, 10, 60000)) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please wait a moment.' } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Username and password are required' } }, { status: 400 });
    }

    const owner = await prisma.owner.findUnique({ where: { username } });
    if (!owner) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } }, { status: 401 });
    }

    const isValidPassword = await comparePassword(password, owner.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } }, { status: 401 });
    }

    const token = generateToken({ id: owner.id, username: owner.username, email: owner.email, role: owner.role });
    return NextResponse.json({
      success: true,
      data: { token, owner: { id: owner.id, username: owner.username, email: owner.email, restaurantName: owner.restaurantName, role: owner.role } }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
