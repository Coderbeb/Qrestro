import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/superadmin')) {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Role check for superadmin
    if (pathname.startsWith('/superadmin') && user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url)); // unauthorized
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/superadmin/:path*'],
};
