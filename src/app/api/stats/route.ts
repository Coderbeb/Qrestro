import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
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
      // Total orders
      prisma.order.count({ where: { ownerId: user.id } }),
      // Today's orders
      prisma.order.count({
        where: {
          ownerId: user.id,
          createdAt: { gte: todayStart }
        }
      }),
      // Today's revenue (sum of non-cancelled orders today)
      prisma.order.aggregate({
        where: {
          ownerId: user.id,
          status: { notIn: ['cancelled'] },
          createdAt: { gte: todayStart }
        },
        _sum: {
          totalAmount: true
        }
      }),
      // Active / pending orders
      prisma.order.count({
        where: {
          ownerId: user.id,
          status: { in: ['pending', 'preparing', 'ready'] }
        }
      }),
      // Menu items
      prisma.menuItem.count({ where: { ownerId: user.id } }),
      // Tables
      prisma.table.count({ where: { ownerId: user.id } })
    ]);

    const todayRevenue = todayRevenueAggregate._sum.totalAmount 
      ? parseFloat(todayRevenueAggregate._sum.totalAmount.toString()) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        todayRevenue,
        pendingOrders,
        menuItems,
        tables
      }
    });
  } catch (error) {
    console.error('Fetch owner stats error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } }, { status: 500 });
  }
}
