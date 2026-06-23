import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    if (isRateLimited(request, 60, 60000)) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many requests. Please try again later.' } },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId is required' } }, { status: 400 });
    }

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: { id: true, restaurantName: true },
    });
    if (!owner) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found' } }, { status: 404 });

    // Fetch categories (sorted)
    const categories = await prisma.menuCategory.findMany({
      where: { ownerId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, sortOrder: true },
    });

    // Fetch all available items with category info
    const items = await prisma.menuItem.findMany({
      where: { ownerId, isAvailable: true },
      orderBy: [{ categoryId: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        preparationTime: true,
        isAvailable: true,
        categoryId: true,
        category: { select: { id: true, name: true, sortOrder: true } },
      },
    });

    const formatted = items.map(item => ({
      ...item,
      price: parseFloat(item.price.toString()),
    }));

    // Group items by category
    const categorized = categories.map(cat => ({
      ...cat,
      items: formatted.filter(i => i.categoryId === cat.id),
    })).filter(cat => cat.items.length > 0);

    const uncategorized = formatted.filter(i => !i.categoryId);

    return NextResponse.json({
      success: true,
      data: {
        restaurant: owner,
        items: formatted,          // flat list (for backward compat)
        categories: categorized,   // grouped by category
        uncategorized,             // items without a category
      },
    });
  } catch (error) {
    console.error('Public menu error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch menu' } }, { status: 500 });
  }
}
