import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { emitToRestaurant } from '@/lib/socketServer';
import { invalidateServerCache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const item = await prisma.menuItem.findFirst({ where: { id, ownerId: user.id } });
    if (!item) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...item, price: parseFloat(item.price.toString()) } });
  } catch (error) {
    console.error('Get menu item error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch menu item' } }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { name, description, price, preparationTime, isAvailable, imageUrl, categoryId } = body;

    const existing = await prisma.menuItem.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } }, { status: 404 });

    if (price !== undefined && parseFloat(price) < 0) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PRICE', message: 'Price must be >= 0' } }, { status: 400 });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(preparationTime !== undefined && { preparationTime: parseInt(preparationTime) }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
      },
      include: { category: { select: { id: true, name: true, sortOrder: true } } },
    });

    const formatted = {
      ...updated,
      price: parseFloat(updated.price.toString())
    };

    // Invalidate menu caches
    invalidateServerCache(`menu:${user.id}`, `public-menu:${user.id}`);

    // Broadcast menu item update to all connected customers
    emitToRestaurant(user.id, 'menu:updated', formatted);

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Update menu item error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update menu item' } }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await prisma.menuItem.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Menu item not found' } }, { status: 404 });

    await prisma.menuItem.delete({ where: { id } });

    // Invalidate menu caches
    invalidateServerCache(`menu:${user.id}`, `public-menu:${user.id}`, `stats:${user.id}`);

    // Broadcast menu item deletion to all connected customers
    emitToRestaurant(user.id, 'menu:deleted', { id });

    return NextResponse.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete menu item' } }, { status: 500 });
  }
}
