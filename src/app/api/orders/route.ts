import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const tableNumber = searchParams.get('tableNumber');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { ownerId: user.id };
    if (status) where.status = status;
    if (tableNumber) where.tableNumber = parseInt(tableNumber);

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { menuItem: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = orders.map(order => ({
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      items: order.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
      })),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch orders' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Public route — customers place orders
  try {
    // Rate limit: max 10 order placements per minute per IP
    if (isRateLimited(request, 10, 60000)) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many orders placed from this device. Please wait a moment.' } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { ownerId, tableNumber, items } = body;

    if (!ownerId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId, tableNumber and items are required' } }, { status: 400 });
    }

    // Validate owner exists
    const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
    if (!owner) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found' } }, { status: 404 });

    // Validate table belongs to owner
    const table = await prisma.table.findFirst({ where: { ownerId, tableNumber: parseInt(tableNumber), isActive: true } });
    if (!table) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found or inactive' } }, { status: 404 });

    // Validate menu items and calculate totals
    const menuItemIds: string[] = items.map((item: { menuItemId: string }) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, ownerId, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_ITEMS', message: 'One or more items are unavailable' } }, { status: 400 });
    }

    const menuItemMap = new Map(menuItems.map(m => [m.id, m]));
    let totalAmount = 0;
    let maxPrepTime = 0;
    const orderItems: { menuItemId: string; menuItemName: string; quantity: number; price: number }[] = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) continue;
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const itemPrice = parseFloat(menuItem.price.toString());
      totalAmount += itemPrice * qty;
      maxPrepTime = Math.max(maxPrepTime, menuItem.preparationTime);
      orderItems.push({
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: qty,
        price: itemPrice,
      });
    }

    const order = await prisma.order.create({
      data: {
        ownerId,
        tableNumber: parseInt(tableNumber),
        totalAmount,
        estimatedTime: maxPrepTime,
        status: 'pending',
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        totalAmount: parseFloat(order.totalAmount.toString()),
        items: order.items.map(i => ({ ...i, price: parseFloat(i.price.toString()) })),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Place order error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to place order' } }, { status: 500 });
  }
}

export { VALID_STATUSES };
