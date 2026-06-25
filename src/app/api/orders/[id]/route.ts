import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { emitToRestaurant } from '@/lib/socketServer';

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const order = await prisma.order.findFirst({
      where: { id, ownerId: user.id },
      include: {
        items: {
          include: { menuItem: { select: { name: true, imageUrl: true } } },
        },
      },
    });
    if (!order) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        totalAmount: parseFloat(order.totalAmount.toString()),
        items: order.items.map(item => ({ ...item, price: parseFloat(item.price.toString()) })),
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch order' } }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_STATUS', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` } }, { status: 400 });
    }

    const existing = await prisma.order.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, { status: 404 });

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === 'completed' && { completedAt: new Date() }),
      },
      include: {
        items: true,
      },
    });

    const formattedOrder = {
      ...updated,
      totalAmount: parseFloat(updated.totalAmount.toString()),
      items: updated.items.map(item => ({ ...item, price: parseFloat(item.price.toString()) })),
    };

    // Notify restaurant owner's dashboard in real-time
    emitToRestaurant(user.id, 'order:updated', formattedOrder);

    return NextResponse.json({ success: true, data: formattedOrder });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update order' } }, { status: 500 });
  }
}
