import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startStr = searchParams.get('startDate');
    const endStr = searchParams.get('endDate');

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (startStr) {
      const parsed = new Date(startStr);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
    if (endStr) {
      const parsed = new Date(endStr);
      if (!isNaN(parsed.getTime())) {
        endDate = parsed;
      }
    }

    // Query completed orders in range
    const orders = await prisma.order.findMany({
      where: {
        ownerId: user.id,
        status: 'completed',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 1. Basic Stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0);
    const averageTicketSize = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 2. Daily Sales Trend
    const dailyMap = new Map<string, number>();
    
    const getLocalDateString = (date: Date) => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
      } catch (e) {
        const offset = date.getTimezoneOffset() * 60000;
        const localTime = new Date(date.getTime() - offset);
        return localTime.toISOString().split('T')[0];
      }
    };

    // Pre-fill daily map with dates in range to show 0s for missing days
    const temp = new Date(startDate);
    // Limit range generation to prevent loops from going crazy if date range is too wide
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 90) {
      while (temp <= endDate) {
        const dateStr = getLocalDateString(temp);
        dailyMap.set(dateStr, 0);
        temp.setDate(temp.getDate() + 1);
      }
    }

    for (const order of orders) {
      const dateStr = getLocalDateString(order.createdAt);
      const amount = parseFloat(order.totalAmount.toString());
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + amount);
    }

    const dailySales = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Top Selling Items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.menuItemName;
        const qty = item.quantity;
        const rev = parseFloat(item.price.toString()) * qty;
        const existing = itemMap.get(key);
        if (existing) {
          existing.quantity += qty;
          existing.revenue += rev;
        } else {
          itemMap.set(key, { name: key, quantity: qty, revenue: rev });
        }
      }
    }

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalOrders,
          totalRevenue,
          averageTicketSize,
        },
        dailySales,
        topItems,
      },
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate report' } }, { status: 500 });
  }
}
