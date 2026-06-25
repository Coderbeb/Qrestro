import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('ownerId');
    const available = searchParams.get('available');

    const where: Record<string, unknown> = {};
    if (ownerId) where.ownerId = ownerId;
    if (available === 'true') where.isAvailable = true;

    if (!ownerId) {
      const user = authenticateRequest(request);
      if (!user) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required when ownerId is not provided' } }, { status: 401 });
      }
      where.ownerId = user.id;
    }

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { createdAt: 'desc' }],
      include: { category: { select: { id: true, name: true, sortOrder: true } } },
    });

    const formatted = items.map(item => ({
      id: item.id, ownerId: item.ownerId,
      categoryId: item.categoryId,
      category: item.category,
      name: item.name, description: item.description,
      price: parseFloat(item.price.toString()), imageUrl: item.imageUrl,
      preparationTime: item.preparationTime, isAvailable: item.isAvailable,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get menu items error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch menu items' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, price, preparationTime, isAvailable, categoryId, imageUrl } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Name and price are required' } }, { status: 400 });
    }
    if (parseFloat(price) < 0) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_PRICE', message: 'Price must be >= 0' } }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        ownerId: user.id,
        name, description: description || null,
        price: parseFloat(price),
        preparationTime: parseInt(preparationTime) || 15,
        isAvailable: isAvailable !== false,
        categoryId: categoryId || null,
        imageUrl: imageUrl || null,
      },
      include: { category: { select: { id: true, name: true, sortOrder: true } } },
    });

    return NextResponse.json({ success: true, data: { ...item, price: parseFloat(item.price.toString()) } }, { status: 201 });
  } catch (error) {
    console.error('Create menu item error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create menu item' } }, { status: 500 });
  }
}
