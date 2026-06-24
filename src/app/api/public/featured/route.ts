import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const featured = await prisma.owner.findMany({
      where: {
        role: 'RESTAURANT_OWNER',
        showOnLanding: true
      },
      select: {
        id: true,
        restaurantName: true,
        cuisine: true
      },
      orderBy: { restaurantName: 'asc' }
    });

    return NextResponse.json({ success: true, data: featured });
  } catch (error) {
    console.error('Featured restaurants fetch error:', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to fetch featured restaurants' } }, { status: 500 });
  }
}
