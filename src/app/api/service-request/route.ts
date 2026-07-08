import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';
import { emitToRestaurant } from '@/lib/socketServer';
import { invalidateServerCache } from '@/lib/cache';

type ServiceType = 'waiter' | 'water';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 3 service requests per minute per IP
    if (isRateLimited(request, 3, 60000)) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Please wait before sending another request.' } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { ownerId, tableNumber, type, sessionToken } = body as {
      ownerId: string;
      tableNumber: number;
      type: ServiceType;
      sessionToken: string;
    };

    if (!ownerId || !tableNumber || !type) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId, tableNumber and type are required' } },
        { status: 400 }
      );
    }

    if (!['waiter', 'water'].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Type must be "waiter" or "water"' } },
        { status: 400 }
      );
    }

    // Validate table belongs to owner
    const table = await prisma.table.findFirst({
      where: { ownerId, tableNumber: Number(tableNumber), isActive: true },
    });
    if (!table) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Table not found or inactive' } },
        { status: 404 }
      );
    }

    // Verify session token
    const { verifySessionToken } = require('@/lib/security');
    if (!sessionToken || !verifySessionToken(sessionToken, table.updatedAt)) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please scan the QR code again.' } },
        { status: 403 }
      );
    }

    // Emit real-time service alert to the restaurant dashboard
    emitToRestaurant(ownerId, 'service:request', {
      tableNumber: Number(tableNumber),
      type,
      timestamp: new Date().toISOString(),
    });

    // If type is 'water', also create an order with a water menu item
    if (type === 'water') {
      const waterItem = await prisma.menuItem.findFirst({
        where: {
          ownerId,
          isAvailable: true,
          name: { contains: 'water', mode: 'insensitive' },
        },
      });

      if (!waterItem) {
        return NextResponse.json(
          { success: false, error: { code: 'NO_WATER_ITEM', message: 'No water item found in menu. Please ask the owner to add one.' } },
          { status: 404 }
        );
      }

      const itemPrice = parseFloat(waterItem.price.toString());

      const order = await prisma.order.create({
        data: {
          ownerId,
          tableNumber: Number(tableNumber),
          totalAmount: itemPrice,
          estimatedTime: waterItem.preparationTime,
          status: 'pending',
          notes: 'Quick water order',
          items: {
            create: [{
              menuItemId: waterItem.id,
              menuItemName: waterItem.name,
              quantity: 1,
              price: itemPrice,
            }],
          },
        },
        include: { items: true },
      });

      const formattedOrder = {
        ...order,
        totalAmount: parseFloat(order.totalAmount.toString()),
        items: order.items.map(i => ({ ...i, price: parseFloat(i.price.toString()) })),
      };

      // Invalidate caches for the new order
      invalidateServerCache(
        `stats:${ownerId}`,
        `orders:${ownerId}`,
        `billing:${ownerId}`,
      );

      emitToRestaurant(ownerId, 'order:new', formattedOrder);

      return NextResponse.json({
        success: true,
        data: { type, tableNumber: Number(tableNumber), order: formattedOrder },
        message: 'Water order placed!',
      });
    }

    return NextResponse.json({
      success: true,
      data: { type, tableNumber: Number(tableNumber) },
      message: 'Waiter has been notified!',
    });
  } catch (error) {
    console.error('Service request error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process service request' } },
      { status: 500 }
    );
  }
}
