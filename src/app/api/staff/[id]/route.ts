import prisma from '@/lib/db';
import { authenticateRequest, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateServerCache } from '@/lib/cache';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    // Verify staff belongs to this owner
    const existing = await prisma.staff.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Staff member not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.role !== undefined) {
      const validRoles = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role' } },
          { status: 400 }
        );
      }
      updateData.role = body.role;
    }
    if (body.assignedTables !== undefined) {
      updateData.assignedTables = Array.isArray(body.assignedTables)
        ? body.assignedTables.map(Number).filter(Boolean)
        : [];
    }
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.pin !== undefined && body.pin.length >= 4 && body.pin.length <= 6) {
      updateData.pinHash = await hashPassword(body.pin);
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: updateData,
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

    // Invalidate staff cache
    invalidateServerCache(`staff:${user.id}`);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update staff' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.staff.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Staff member not found' } },
        { status: 404 }
      );
    }

    await prisma.staff.delete({ where: { id } });

    // Invalidate staff cache
    invalidateServerCache(`staff:${user.id}`);

    return NextResponse.json({ success: true, message: 'Staff member deleted' });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete staff' } },
      { status: 500 }
    );
  }
}
