import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';
import { getTableSignature, verifySessionToken, generateSessionToken } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request, 60, 60000)) {
      return NextResponse.json({ success: false, error: { message: 'Too many requests. Please try again later.' } }, { status: 429 });
    }

    const { ownerId, tableNumber, code, sessionToken } = await request.json();

    if (!ownerId || !tableNumber) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'ownerId and tableNumber are required' } }, { status: 400 });
    }

    const table = await prisma.table.findFirst({
      where: { ownerId, tableNumber: parseInt(tableNumber), isActive: true }
    });
    
    if (!table) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found or is currently inactive' } }, { status: 404 });
    }

    let isValid = false;
    let isExpiredToken = false;

    if (code) {
      const expectedSignature = getTableSignature(ownerId, parseInt(tableNumber));
      if (code === expectedSignature) {
        isValid = true;
      }
    } else if (sessionToken) {
      if (verifySessionToken(sessionToken, table.updatedAt)) {
        isValid = true;
      } else {
        isExpiredToken = true;
      }
    }

    if (!isValid) {
      if (isExpiredToken) {
        return NextResponse.json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Dining session has expired. Please scan the table QR code again to start a new session.' } }, { status: 403 });
      }
      return NextResponse.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Access Denied: Please scan the table QR code to verify your session.' } }, { status: 403 });
    }

    const nextSessionToken = generateSessionToken(table.id, table.updatedAt);

    return NextResponse.json({
      success: true,
      data: {
        sessionToken: nextSessionToken
      }
    });
  } catch (error) {
    console.error('Session verify error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify session' } }, { status: 500 });
  }
}
