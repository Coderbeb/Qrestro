import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateServerCache } from '@/lib/cache';

// PUT /api/categories/[id] — rename / update sort order
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await prisma.menuCategory.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, { status: 404 });

    const { name, description, sortOrder } = await request.json();

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
      },
      include: { _count: { select: { items: true } } },
    });

    // Invalidate caches
    invalidateServerCache(`categories:${user.id}`, `menu:${user.id}`, `public-menu:${user.id}`);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update category' } }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — delete category (items become uncategorized, not deleted)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await prisma.menuCategory.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, { status: 404 });

    // Items' categoryId will be set to NULL automatically (onDelete: SetNull in schema)
    await prisma.menuCategory.delete({ where: { id } });

    // Invalidate caches
    invalidateServerCache(`categories:${user.id}`, `menu:${user.id}`, `public-menu:${user.id}`);

    return NextResponse.json({ success: true, data: { message: 'Category deleted. Items moved to Uncategorized.' } });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete category' } }, { status: 500 });
  }
}
