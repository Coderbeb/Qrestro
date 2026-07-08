import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';
import { getCached } from '@/lib/cache';

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
    const tableNumber = searchParams.get('tableNumber');
    const code = searchParams.get('code');
    const sessionToken = searchParams.get('sessionToken');

    if (!ownerId || !tableNumber) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId and tableNumber are required' } }, { status: 400 });
    }

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: { id: true, restaurantName: true },
    });
    if (!owner) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found' } }, { status: 404 });

    // Validate table exists and is active
    const table = await prisma.table.findFirst({
      where: { ownerId, tableNumber: parseInt(tableNumber), isActive: true }
    });
    if (!table) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found or is currently inactive' } }, { status: 404 });
    }

    const { getTableSignature, verifySessionToken, generateSessionToken } = require('@/lib/security');

    let isValid = false;
    let isExpiredToken = false;

    if (code) {
      const expectedSignature = getTableSignature(ownerId, parseInt(tableNumber));
      if (code === expectedSignature) {
        isValid = true;
      }
    } else if (sessionToken) {
      if (verifySessionToken(sessionToken, table.updatedAt)) {
        isValid = true;
      } else {
        isExpiredToken = true;
      }
    }

    if (!isValid) {
      if (isExpiredToken) {
        return NextResponse.json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Dining session has expired. Please scan the table QR code again to start a new session.' } }, { status: 403 });
      }
      return NextResponse.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Access Denied: Please scan the table QR code to view the menu.' } }, { status: 403 });
    }

    const nextSessionToken = generateSessionToken(table.id, table.updatedAt);

    // Cache the menu data (customer-facing, rarely changes)
    const menuData = await getCached(`public-menu:${ownerId}`, 120, async () => {
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

      return { items: formatted, categories: categorized, uncategorized };
    });

    return NextResponse.json({
      success: true,
      data: {
        restaurant: owner,
        items: menuData.items,
        categories: menuData.categories,
        uncategorized: menuData.uncategorized,
        sessionToken: nextSessionToken,
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Public menu error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch menu' } }, { status: 500 });
  }
}
