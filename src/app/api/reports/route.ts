import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getCached } from '@/lib/cache';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const preset = searchParams.get('preset');
    const startStr = searchParams.get('startDate');
    const endStr = searchParams.get('endDate');

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Support preset-based ranges for stable SWR cache keys
    if (preset === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === '7days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === '30days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Legacy: support explicit startDate/endDate params
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
    }

    const cacheKey = `reports:${user.id}:${startDate.toISOString()}:${endDate.toISOString()}`;

    const data = await getCached(cacheKey, 60, async () => {
      // ── SQL Aggregation (replaces JS-based processing) ──────────

      // 1. Basic metrics: total orders, revenue, avg ticket
      const metricsResult = await prisma.$queryRaw<
        { total_orders: bigint; total_revenue: Prisma.Decimal | null }[]
      >`
        SELECT
          COUNT(*)::bigint as total_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders
        WHERE owner_id = ${user.id}
          AND status = 'completed'
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
      `;

      const totalOrders = Number(metricsResult[0]?.total_orders ?? 0);
      const totalRevenue = Number(metricsResult[0]?.total_revenue ?? 0);
      const averageTicketSize = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // 2. Daily sales trend (SQL GROUP BY instead of JS Map)
      const dailyResult = await prisma.$queryRaw<
        { date: string; revenue: Prisma.Decimal }[]
      >`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') as date,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE owner_id = ${user.id}
          AND status = 'completed'
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
        ORDER BY date
      `;

      // Pre-fill dates in range to show 0s for missing days
      const dailyMap = new Map<string, number>();
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 90) {
        const temp = new Date(startDate);
        while (temp <= endDate) {
          const dateStr = temp.toISOString().split('T')[0];
          dailyMap.set(dateStr, 0);
          temp.setDate(temp.getDate() + 1);
        }
      }

      // Overlay SQL results onto the pre-filled map
      for (const row of dailyResult) {
        dailyMap.set(row.date, Number(row.revenue));
      }

      const dailySales = Array.from(dailyMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 3. Top selling items (SQL GROUP BY instead of JS Map)
      const topItemsResult = await prisma.$queryRaw<
        { name: string; quantity: bigint; revenue: Prisma.Decimal }[]
      >`
        SELECT
          oi.menu_item_name as name,
          SUM(oi.quantity)::bigint as quantity,
          COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.owner_id = ${user.id}
          AND o.status = 'completed'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY oi.menu_item_name
        ORDER BY quantity DESC
        LIMIT 10
      `;

      const topItems = topItemsResult.map(row => ({
        name: row.name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      }));

      return {
        metrics: {
          totalOrders,
          totalRevenue,
          averageTicketSize,
        },
        dailySales,
        topItems,
      };
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate report' } }, { status: 500 });
  }
}
