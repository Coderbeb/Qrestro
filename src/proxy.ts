import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyStaffToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Dashboard routes: require owner token ───
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/superadmin')) {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    // KDS can also be accessed by CHEF staff
    if (pathname === '/dashboard/kds' || pathname.startsWith('/dashboard/kds/')) {
      const staffToken = request.cookies.get('staffToken')?.value;
      if (staffToken) {
        const staffPayload = verifyStaffToken(staffToken);
        if (staffPayload && staffPayload.role === 'CHEF') {
          return NextResponse.next();
        }
      }
    }

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const user = verifyToken(token);
    if (!user) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.set('token', '', { path: '/', maxAge: 0 });
      return response;
    }

    // Role check for superadmin
    if (pathname.startsWith('/superadmin') && user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ─── Staff waiter routes: require staff token with WAITER role ───
  if (pathname.startsWith('/staff/waiter')) {
    const staffToken = request.cookies.get('staffToken')?.value;
    if (!staffToken) {
      return NextResponse.redirect(new URL('/auth/login?tab=staff', request.url));
    }
    const payload = verifyStaffToken(staffToken);
    if (!payload || payload.role !== 'WAITER') {
      return NextResponse.redirect(new URL('/auth/login?tab=staff', request.url));
    }
  }

  // ─── Staff cashier routes: require staff token with CASHIER role ───
  if (pathname.startsWith('/staff/cashier')) {
    const staffToken = request.cookies.get('staffToken')?.value;
    if (!staffToken) {
      return NextResponse.redirect(new URL('/auth/login?tab=staff', request.url));
    }
    const payload = verifyStaffToken(staffToken);
    if (!payload || payload.role !== 'CASHIER') {
      return NextResponse.redirect(new URL('/auth/login?tab=staff', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/superadmin/:path*', '/staff/waiter/:path*', '/staff/cashier/:path*'],
};

