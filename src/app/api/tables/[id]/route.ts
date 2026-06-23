import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { buildOrderUrl, generateQRCodeDataURL } from '@/lib/qr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const table = await prisma.table.findFirst({ where: { id, ownerId: user.id } });
    if (!table) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: table });
  } catch (error) {
    console.error('Get table error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch table' } }, { status: 500 });
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
    const { isActive, regenerateQR } = body;

    const existing = await prisma.table.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 });

    let qrCodeImageUrl = existing.qrCodeImageUrl;
    let qrCodeData = existing.qrCodeData;

    if (regenerateQR) {
      const requestHost = request.headers.get('host');
      const orderUrl = buildOrderUrl(user.id, existing.tableNumber, requestHost);
      qrCodeData = orderUrl;
      qrCodeImageUrl = await generateQRCodeDataURL(orderUrl);
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        qrCodeData,
        qrCodeImageUrl,
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update table error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update table' } }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await prisma.table.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 });

    await prisma.table.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Table deleted' });
  } catch (error) {
    console.error('Delete table error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete table' } }, { status: 500 });
  }
}
