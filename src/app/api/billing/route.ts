import prisma from '@/lib/db';
import { authenticateAnyRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { emitToRestaurant } from '@/lib/socketServer';
import { getCached, invalidateServerCache } from '@/lib/cache';

/**
 * Helper to extract ownerId from either an owner or staff (CASHIER/MANAGER) auth.
 * Returns ownerId or null if unauthorized.
 */
function getOwnerIdFromAuth(request: NextRequest): string | null {
  const auth = authenticateAnyRequest(request);
  if (!auth) return null;
  if (auth.type === 'owner') return auth.user.id;
  if (auth.type === 'staff' && ['CASHIER', 'MANAGER'].includes(auth.staff.role)) {
    return auth.staff.ownerId;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const ownerId = getOwnerIdFromAuth(request);
  if (!ownerId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const result = await getCached(`billing:${ownerId}`, 15, async () => {
      const [tables, orders] = await Promise.all([
        prisma.table.findMany({
          where: { ownerId, isActive: true },
          orderBy: { tableNumber: 'asc' },
        }),
        prisma.order.findMany({
          where: { ownerId, status: { not: 'cancelled' } },
          select: {
            id: true,
            tableNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            items: {
              select: {
                menuItemName: true,
                quantity: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return tables.map(table => {
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
    });

    return NextResponse.json({ success: true, data: result }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch billing data' } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ownerId = getOwnerIdFromAuth(request);
  if (!ownerId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tableNumber } = body;

    if (!tableNumber) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'tableNumber is required' } }, { status: 400 });
    }

    const table = await prisma.table.findFirst({
      where: { ownerId, tableNumber: parseInt(tableNumber) },
    });

    if (!table) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 });
    }

    // Find all active orders for this table in the current session (after table.updatedAt)
    const activeOrders = await prisma.order.findMany({
      where: {
        ownerId,
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
        ownerId,
        tableNumber: parseInt(tableNumber),
        createdAt: { gt: table.updatedAt }, // Note: since table.updatedAt is now updated, we fetch using the old activeOrders IDs or query all that were just updated
      },
    });

    // Notify sockets
    for (const order of activeOrders) {
      emitToRestaurant(ownerId, 'order:updated', { id: order.id, status: 'completed' });
    }
    
    // Invalidate server caches
    invalidateServerCache(
      `billing:${ownerId}`,
      `stats:${ownerId}`,
      `orders:${ownerId}`,
    );

    // Emit a specific table reset event so the customer page clears immediately
    emitToRestaurant(ownerId, 'table:reset', { tableNumber: parseInt(tableNumber) });

    return NextResponse.json({ success: true, data: { success: true }, message: 'Table bill settled and session reset successfully.' });
  } catch (error) {
    console.error('Billing PUT error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to settle bill' } }, { status: 500 });
  }
}
