import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isRateLimited } from '@/lib/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Basic rate limit: 60 requests per minute
    if (isRateLimited(request, 60, 60000)) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many requests. Please try again later.' } },
        { status: 429 }
      );
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    if (!orderId) {
      return NextResponse.json({ success: false, error: { message: 'Order ID required' } }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        estimatedTime: true,
        tableNumber: true,
        createdAt: true,
        items: {
          select: { menuItemName: true, quantity: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: { message: 'Order not found' } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Public Order API Error:', error);
    return NextResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
  }
}
