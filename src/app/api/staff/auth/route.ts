import prisma from '@/lib/db';
import { comparePassword, generateStaffToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limit: max 10 attempts per minute per IP
  if (isRateLimited(request, 10, 60000)) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please wait.' } },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { restaurantCode, staffName, pin, phone } = body;

    // ─── Mode 1: Phone + PIN login (unified login page) ───
    if (phone && pin && !restaurantCode) {
      const phoneTrimmed = phone.trim();
      if (!phoneTrimmed) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_FIELDS', message: 'Phone number is required' } },
          { status: 400 }
        );
      }

      // Find all active staff with this phone number (across all restaurants)
      const staffCandidates = await prisma.staff.findMany({
        where: { phone: phoneTrimmed, isActive: true },
        include: {
          owner: { select: { id: true, restaurantName: true, username: true } },
        },
      });

      if (staffCandidates.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'No staff account found with this phone number' } },
          { status: 401 }
        );
      }

      // Try PIN against each candidate until one matches
      for (const candidate of staffCandidates) {
        const isValidPin = await comparePassword(pin, candidate.pinHash);
        if (isValidPin) {
          const token = generateStaffToken({
            staffId: candidate.id,
            ownerId: candidate.owner.id,
            name: candidate.name,
            role: candidate.role,
          });

          return NextResponse.json({
            success: true,
            data: {
              token,
              staff: {
                id: candidate.id,
                name: candidate.name,
                role: candidate.role,
                assignedTables: candidate.assignedTables,
              },
              restaurant: {
                id: candidate.owner.id,
                name: candidate.owner.restaurantName,
                code: candidate.owner.username,
              },
            },
          });
        }
      }

      // None matched
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid PIN' } },
        { status: 401 }
      );
    }

    // ─── Mode 2: Restaurant code + staff name + PIN (legacy staff login page) ───
    if (!restaurantCode || !staffName || !pin) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Restaurant code, name, and PIN are required' } },
        { status: 400 }
      );
    }

    // Find the restaurant owner by username (restaurant code)
    const owner = await prisma.owner.findUnique({
      where: { username: restaurantCode },
      select: { id: true, restaurantName: true, username: true },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found. Check the code and try again.' } },
        { status: 404 }
      );
    }

    // Find the staff member by name under this owner
    const staff = await prisma.staff.findFirst({
      where: {
        ownerId: owner.id,
        name: staffName,
        isActive: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Staff member not found or inactive' } },
        { status: 401 }
      );
    }

    // Verify PIN
    const isValidPin = await comparePassword(pin, staff.pinHash);
    if (!isValidPin) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid PIN' } },
        { status: 401 }
      );
    }

    // Generate staff JWT
    const token = generateStaffToken({
      staffId: staff.id,
      ownerId: owner.id,
      name: staff.name,
      role: staff.role,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        staff: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          assignedTables: staff.assignedTables,
        },
        restaurant: {
          id: owner.id,
          name: owner.restaurantName,
          code: owner.username,
        },
      },
    });
  } catch (error) {
    console.error('Staff login error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * GET — Fetch staff list for a restaurant code (for the staff login dropdown).
 * Public endpoint — only returns names, no sensitive data.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const restaurantCode = searchParams.get('restaurantCode');

  if (!restaurantCode) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FIELDS', message: 'Restaurant code is required' } },
      { status: 400 }
    );
  }

  try {
    const owner = await prisma.owner.findUnique({
      where: { username: restaurantCode },
      select: { id: true, restaurantName: true },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found' } },
        { status: 404 }
      );
    }

    const staffList = await prisma.staff.findMany({
      where: { ownerId: owner.id, isActive: true },
      select: { name: true, role: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        restaurantName: owner.restaurantName,
        staff: staffList,
      },
    });
  } catch (error) {
    console.error('Get staff list error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
