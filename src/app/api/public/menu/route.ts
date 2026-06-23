import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    // Basic rate limit: 60 requests per minute
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

    const items = await prisma.menuItem.findMany({
      where: { ownerId, isAvailable: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        preparationTime: true,
        isAvailable: true,
      },
    });

    const formatted = items.map(item => ({
      ...item,
      price: parseFloat(item.price.toString()),
    }));

    return NextResponse.json({
      success: true,
      data: {
        restaurant: owner,
        items: formatted,
      },
    });
  } catch (error) {
    console.error('Public menu error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch menu' } }, { status: 500 });
  }
}
