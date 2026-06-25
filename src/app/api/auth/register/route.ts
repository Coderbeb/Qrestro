import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { buildOrderUrl, generateQRCodeDataURL } from '@/lib/qr';
import { isRateLimited } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 5 registrations per minute per IP
    if (isRateLimited(request, 5, 60000)) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many registration attempts. Please wait a moment.' } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { restaurantName, ownerName, email, phone, username, password, tableCount } = body;

    if (!restaurantName || !ownerName || !email || !username || !password || !tableCount) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'All required fields must be provided' } },
        { status: 400 }
      );
    }
    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_USERNAME', message: 'Username must be at least 3 characters' } },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 6 characters' } },
        { status: 400 }
      );
    }

    const existingUser = await prisma.owner.findFirst({
      where: { OR: [{ username }, { email }] }
    });
    if (existingUser) {
      const field = existingUser.username === username ? 'Username' : 'Email';
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: `${field} already exists` } },
        { status: 409 }
      );
    }

    let freePlan = await prisma.subscriptionPlan.findFirst({
      where: { tier: 'FREE' }
    });
    if (!freePlan) {
      freePlan = await prisma.subscriptionPlan.create({
        data: {
          tier: 'FREE',
          price: 0,
          maxTables: 5,
          features: ['Basic QR ordering', 'Up to 5 tables']
        }
      });
    }

    const count = parseInt(tableCount, 10);
    if (isNaN(count) || count < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TABLES', message: 'Table count must be at least 1' } },
        { status: 400 }
      );
    }
    if (count > freePlan.maxTables) {
      return NextResponse.json(
        { success: false, error: { code: 'PLAN_LIMIT_EXCEEDED', message: `Free plan only supports up to ${freePlan.maxTables} tables.` } },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const owner = await prisma.owner.create({
      data: { 
        username, 
        email, 
        passwordHash, 
        restaurantName, 
        ownerName, 
        phone: phone || null,
        planId: freePlan.id
      }
    });

    const requestHost = request.headers.get('host');
    const tablePromises = [];
    for (let i = 1; i <= count; i++) {
      const orderUrl = buildOrderUrl(owner.id, i, requestHost);
      tablePromises.push((async () => {
        const qrCodeImageUrl = await generateQRCodeDataURL(orderUrl);
        return {
          ownerId: owner.id,
          tableNumber: i,
          qrCodeData: orderUrl,
          qrCodeImageUrl,
          isActive: true,
        };
      })());
    }
    const tableData = await Promise.all(tablePromises);
    await prisma.table.createMany({ data: tableData });

    return NextResponse.json({
      success: true,
      data: { restaurantName: owner.restaurantName, username: owner.username, email: owner.email, tableCount: count, message: 'Restaurant registered successfully' }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
