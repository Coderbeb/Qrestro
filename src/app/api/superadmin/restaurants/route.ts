import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 403 });
    }

    const restaurants = await prisma.owner.findMany({
      where: { role: 'RESTAURANT_OWNER' },
      select: {
        id: true,
        username: true,
        email: true,
        restaurantName: true,
        ownerName: true,
        phone: true,
        role: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
        plan: true,
        _count: {
          select: { tables: true, orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: restaurants });

  } catch (error) {
    console.error('Superadmin Restaurants error:', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to fetch restaurants' } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 403 });
    }

    const body = await request.json();
    const { ownerId, tier } = body; // tier: FREE, PRO, PREMIUM

    let plan = await prisma.subscriptionPlan.findUnique({ where: { tier } });
    if (!plan) {
      // Auto create plan if it doesn't exist
      plan = await prisma.subscriptionPlan.create({
        data: {
          tier,
          price: tier === 'FREE' ? 0 : tier === 'PRO' ? 49.99 : 99.99,
          maxTables: tier === 'FREE' ? 5 : tier === 'PRO' ? 25 : 100,
          features: []
        }
      });
    }

    const updatedOwner = await prisma.owner.update({
      where: { id: ownerId },
      data: { planId: plan.id }
    });

    return NextResponse.json({ success: true, data: updatedOwner });

  } catch (error) {
    console.error('Superadmin Update Plan error:', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to update plan' } }, { status: 500 });
  }
}
