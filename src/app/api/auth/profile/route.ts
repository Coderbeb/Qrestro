import prisma from '@/lib/db';
import { authenticateRequest, comparePassword, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const owner = await prisma.owner.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, email: true, restaurantName: true, ownerName: true, phone: true, createdAt: true }
  });
  if (!owner) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Owner not found' } }, { status: 404 });

  return NextResponse.json({ success: true, data: owner });
}

export async function PUT(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await request.json();
    const { restaurantName, ownerName, email, phone } = body;
    const updated = await prisma.owner.update({
      where: { id: user.id },
      data: {
        ...(restaurantName !== undefined && { restaurantName }),
        ...(ownerName !== undefined && { ownerName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
      select: { id: true, username: true, email: true, restaurantName: true, ownerName: true, phone: true, createdAt: true }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } }, { status: 500 });
  }
}
