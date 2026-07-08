import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { getCached } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const data = await getCached(`stats:${user.id}`, 10, async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalOrders,
        todayOrders,
        todayRevenueAggregate,
        pendingOrders,
        menuItems,
        tables
      ] = await Promise.all([
        prisma.order.count({ where: { ownerId: user.id } }),
        prisma.order.count({
          where: {
            ownerId: user.id,
            createdAt: { gte: todayStart }
          }
        }),
        prisma.order.aggregate({
          where: {
            ownerId: user.id,
            status: { notIn: ['cancelled'] },
            createdAt: { gte: todayStart }
          },
          _sum: { totalAmount: true }
        }),
        prisma.order.count({
          where: {
            ownerId: user.id,
            status: { in: ['pending', 'preparing', 'ready'] }
          }
        }),
        prisma.menuItem.count({ where: { ownerId: user.id } }),
        prisma.table.count({ where: { ownerId: user.id } })
      ]);

      const todayRevenue = todayRevenueAggregate._sum.totalAmount
        ? parseFloat(todayRevenueAggregate._sum.totalAmount.toString())
        : 0;

      return {
        totalOrders,
        todayOrders,
        todayRevenue,
        pendingOrders,
        menuItems,
        tables
      };
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  } catch (error) {
    console.error('Fetch owner stats error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } }, { status: 500 });
  }
}
