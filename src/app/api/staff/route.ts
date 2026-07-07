import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    const staff = await prisma.staff.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        assignedTables: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch staff' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, phone, pin, role, assignedTables } = body;

    if (!name || !pin || !role) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Name, PIN, and role are required' } },
        { status: 400 }
      );
    }

    const validRoles = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ROLE', message: 'Role must be MANAGER, WAITER, CHEF, or CASHIER' } },
        { status: 400 }
      );
    }

    if (pin.length < 4 || pin.length > 6) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'PIN must be 4-6 digits' } },
        { status: 400 }
      );
    }

    // Check for duplicate phone within the same restaurant
    if (phone) {
      const existing = await prisma.staff.findFirst({
        where: { ownerId: user.id, phone },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: { code: 'DUPLICATE_PHONE', message: 'A staff member with this phone already exists' } },
          { status: 409 }
        );
      }
    }

    const pinHash = await hashPassword(pin);

    const staff = await prisma.staff.create({
      data: {
        ownerId: user.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        pinHash,
        role,
        assignedTables: Array.isArray(assignedTables) ? assignedTables.map(Number).filter(Boolean) : [],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        assignedTables: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: staff }, { status: 201 });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create staff member' } },
      { status: 500 }
    );
  }
}
