import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
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
    const tableNumber = searchParams.get('tableNumber');
    const sessionToken = searchParams.get('sessionToken');

    if (!ownerId || !tableNumber || !sessionToken) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId, tableNumber and sessionToken are required' } }, { status: 400 });
    }

    const table = await prisma.table.findFirst({
      where: { ownerId, tableNumber: parseInt(tableNumber), isActive: true }
    });

    if (!table) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found or inactive' } }, { status: 404 });
    }

    const { verifySessionToken } = require('@/lib/security');
    if (!verifySessionToken(sessionToken, table.updatedAt)) {
      return NextResponse.json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Dining session has expired.' } }, { status: 403 });
    }

    // Get all orders created during this session (since table.updatedAt)
    const orders = await prisma.order.findMany({
      where: {
        ownerId,
        tableNumber: parseInt(tableNumber),
        createdAt: { gt: table.updatedAt }
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        estimatedTime: true,
        tableNumber: true,
        createdAt: true,
        cancellationReason: true,
        items: {
          select: { menuItemName: true, quantity: true, price: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const formatted = orders.map(order => ({
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      items: order.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString())
      }))
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Fetch table orders error:', error);
    return NextResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
  }
}
