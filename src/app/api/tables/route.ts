import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { buildOrderUrl, generateQRCodeDataURL } from '@/lib/qr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const tables = await prisma.table.findMany({
      where: { ownerId: user.id },
      orderBy: { tableNumber: 'asc' },
    });

    // Auto-repair any tables with incorrect JSON formatting or missing QR code images
    const requestHost = request.headers.get('host');
    for (const table of tables) {
      const isJson = table.qrCodeData && (table.qrCodeData.startsWith('{') || table.qrCodeData.startsWith('['));
      // Also repair if the stored URL points to localhost (leftover from local dev)
      const isLocalhost = table.qrCodeData && table.qrCodeData.includes('localhost');
      if (!table.qrCodeData || isJson || !table.qrCodeImageUrl || isLocalhost) {
        const orderUrl = buildOrderUrl(user.id, table.tableNumber, requestHost);
        const qrCodeImageUrl = await generateQRCodeDataURL(orderUrl);

        await prisma.table.update({
          where: { id: table.id },
          data: {
            qrCodeData: orderUrl,
            qrCodeImageUrl
          }
        });

        table.qrCodeData = orderUrl;
        table.qrCodeImageUrl = qrCodeImageUrl;
      }
    }

    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error('Get tables error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch tables' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await request.json();
    const { tableNumber } = body;

    if (!tableNumber || tableNumber < 1) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_TABLE', message: 'Valid table number is required' } }, { status: 400 });
    }

    const existing = await prisma.table.findFirst({ where: { ownerId: user.id, tableNumber } });
    if (existing) {
      return NextResponse.json({ success: false, error: { code: 'DUPLICATE', message: 'Table number already exists' } }, { status: 409 });
    }

    // Enforce subscription plan table limits
    const owner = await prisma.owner.findUnique({
      where: { id: user.id },
      include: { plan: true }
    });
    if (!owner) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Owner not found' } }, { status: 404 });
    }

    const currentTableCount = await prisma.table.count({ where: { ownerId: user.id } });
    const maxTablesAllowed = owner.plan?.maxTables ?? 5;
    if (currentTableCount >= maxTablesAllowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_REACHED',
          message: `Table limit reached (${maxTablesAllowed} tables maximum). Please upgrade your subscription plan.`
        }
      }, { status: 403 });
    }

    const requestHost = request.headers.get('host');
    const orderUrl = buildOrderUrl(user.id, tableNumber, requestHost);
    const qrCodeImageUrl = await generateQRCodeDataURL(orderUrl);

    const table = await prisma.table.create({
      data: {
        ownerId: user.id,
        tableNumber,
        qrCodeData: orderUrl,
        qrCodeImageUrl,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: table }, { status: 201 });
  } catch (error) {
    console.error('Create table error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create table' } }, { status: 500 });
  }
}
