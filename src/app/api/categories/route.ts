import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/categories — list owner's categories
export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const categories = await prisma.menuCategory.findMany({
      where: { ownerId: user.id },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch categories' } }, { status: 500 });
  }
}

// POST /api/categories — create a category
export async function POST(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  try {
    const { name, description } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Category name is required' } }, { status: 400 });
    }

    // Auto-increment sort order
    const maxSort = await prisma.menuCategory.findFirst({
      where: { ownerId: user.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const category = await prisma.menuCategory.create({
      data: {
        ownerId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create category' } }, { status: 500 });
  }
}
