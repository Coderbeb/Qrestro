import prisma from '@/lib/db';
import { authenticateRequest, authenticateAnyRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';
import { emitToRestaurant } from '@/lib/socketServer';
import { getTableSignature } from '@/lib/security';

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

export async function GET(request: NextRequest) {
  // Accept both owner and staff tokens
  const auth = authenticateAnyRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const ownerId = auth.type === 'owner' ? auth.user.id : auth.staff.ownerId;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const tableNumber = searchParams.get('tableNumber');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { ownerId };
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
  try {
    // Check if the request is from an authenticated owner or staff member
    const auth = authenticateAnyRequest(request);
    const isAuthenticated = !!auth;
    const isOwnerAuth = auth?.type === 'owner';
    const isStaffAuth = auth?.type === 'staff';

    // Rate limit only applies to public customers, not authenticated users
    if (!isAuthenticated && isRateLimited(request, 10, 60000)) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many orders placed from this device. Please wait a moment.' } },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { ownerId, tableNumber, items, sessionToken, notes } = body;

    // Determine ownerId and placedBy based on auth type
    let placedBy: string | null = null;
    if (isOwnerAuth && auth.type === 'owner') {
      ownerId = auth.user.id;
      placedBy = 'OWNER';
    } else if (isStaffAuth && auth.type === 'staff') {
      ownerId = auth.staff.ownerId;
      placedBy = `WAITER:${auth.staff.name}`;
    } else {
      placedBy = 'QR';
    }

    if (!ownerId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId, tableNumber and items are required' } }, { status: 400 });
    }

    // Validate table belongs to owner
    const table = await prisma.table.findFirst({ where: { ownerId, tableNumber: parseInt(tableNumber), isActive: true } });
    if (!table) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found or inactive' } }, { status: 404 });

    // Verify table session token to prevent URL tampering and ordering after reset (customers only)
    if (!isAuthenticated) {
      const { verifySessionToken } = require('@/lib/security');
      if (!sessionToken || !verifySessionToken(sessionToken, table.updatedAt)) {
        return NextResponse.json(
          { success: false, error: { code: 'SESSION_EXPIRED', message: 'Access Denied: Session expired or invalid. Please scan the QR code on your table to place orders.' } },
          { status: 403 }
        );
      }
    }

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
        placedBy,
        notes: notes?.trim() || null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    const formattedOrder = {
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      items: order.items.map(i => ({ ...i, price: parseFloat(i.price.toString()) })),
    };

    // Notify restaurant owner's dashboard in real-time
    emitToRestaurant(ownerId, 'order:new', formattedOrder);

    return NextResponse.json({ success: true, data: formattedOrder }, { status: 201 });
  } catch (error) {
    console.error('Place order error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to place order' } }, { status: 500 });
  }
}

export { VALID_STATUSES };
