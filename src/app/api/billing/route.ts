import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { emitToRestaurant } from '@/lib/socketServer';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const [tables, orders] = await Promise.all([
      prisma.table.findMany({
        where: { ownerId: user.id, isActive: true },
        orderBy: { tableNumber: 'asc' },
      }),
      prisma.order.findMany({
        where: { ownerId: user.id, status: { not: 'cancelled' } },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const result = tables.map(table => {
      // Find orders for this table placed after the last table touch/reset time
      const sessionOrders = orders.filter(
        order => order.tableNumber === table.tableNumber && order.createdAt > table.updatedAt
      );

      if (sessionOrders.length === 0) {
        return {
          tableId: table.id,
          tableNumber: table.tableNumber,
          status: 'idle',
          session: null,
        };
      }

      // Collate items across all orders in this session
      const itemMap = new Map<string, { menuItemName: string; quantity: number; price: number }>();
      let totalAmount = 0;
      const allCompleted = sessionOrders.every(o => o.status === 'completed');

      for (const order of sessionOrders) {
        totalAmount += parseFloat(order.totalAmount.toString());
        for (const item of order.items) {
          const key = item.menuItemName;
          const price = parseFloat(item.price.toString());
          const existing = itemMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            itemMap.set(key, { menuItemName: key, quantity: item.quantity, price });
          }
        }
      }

      return {
        tableId: table.id,
        tableNumber: table.tableNumber,
        status: allCompleted ? 'completed_unpaid' : 'active',
        session: {
          orders: sessionOrders.map(o => ({
            id: o.id,
            status: o.status,
            totalAmount: parseFloat(o.totalAmount.toString()),
            createdAt: o.createdAt,
          })),
          items: Array.from(itemMap.values()),
          totalAmount,
          createdAt: sessionOrders[0].createdAt,
        },
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch billing data' } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tableNumber } = body;

    if (!tableNumber) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'tableNumber is required' } }, { status: 400 });
    }

    const table = await prisma.table.findFirst({
      where: { ownerId: user.id, tableNumber: parseInt(tableNumber) },
    });

    if (!table) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 });
    }

    // Find all active orders for this table in the current session (after table.updatedAt)
    const activeOrders = await prisma.order.findMany({
      where: {
        ownerId: user.id,
        tableNumber: parseInt(tableNumber),
        createdAt: { gt: table.updatedAt },
        status: { in: ['pending', 'preparing', 'ready'] },
      },
    });

    // Update all active orders to completed, and touch the table's updatedAt to reset the session
    await prisma.$transaction([
      prisma.order.updateMany({
        where: {
          id: { in: activeOrders.map(o => o.id) },
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      }),
      prisma.table.update({
        where: { id: table.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    // Send realtime updates via socket for all orders that were in the active session
    // This allows the customer page to know the table has been reset
    const allSessionOrders = await prisma.order.findMany({
      where: {
        ownerId: user.id,
        tableNumber: parseInt(tableNumber),
        createdAt: { gt: table.updatedAt }, // Note: since table.updatedAt is now updated, we fetch using the old activeOrders IDs or query all that were just updated
      },
    });

    // Notify sockets
    for (const order of activeOrders) {
      emitToRestaurant(user.id, 'order:updated', { id: order.id, status: 'completed' });
    }
    
    // Emit a specific table reset event so the customer page clears immediately
    emitToRestaurant(user.id, 'table:reset', { tableNumber: parseInt(tableNumber) });

    return NextResponse.json({ success: true, data: { success: true }, message: 'Table bill settled and session reset successfully.' });
  } catch (error) {
    console.error('Billing PUT error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to settle bill' } }, { status: 500 });
  }
}
