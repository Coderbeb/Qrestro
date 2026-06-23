import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 403 });
    }

    const totalRestaurants = await prisma.owner.count({ where: { role: 'RESTAURANT_OWNER' } });
    const totalOrders = await prisma.order.count();
    
    // Revenue sum across all completed orders — use aggregate for efficiency
    const revenueResult = await prisma.order.aggregate({
      where: { status: 'completed' },
      _sum: { totalAmount: true }
    });
    
    const platformRevenue = revenueResult._sum.totalAmount
      ? parseFloat(revenueResult._sum.totalAmount.toString())
      : 0;

    const activeTables = await prisma.table.count({ where: { isActive: true } });

    return NextResponse.json({
      success: true,
      data: {
        totalRestaurants,
        totalOrders,
        platformRevenue,
        activeTables
      }
    });

  } catch (error) {
    console.error('Superadmin Stats error:', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to fetch stats' } }, { status: 500 });
  }
}
