import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

/**
 * SECURITY MIDDLEWARE
 * Enforces authentication on ALL /api/v1/admin/* and /admin/* routes.
 * Runs before any route handler executes.
 */

// Routes that require authentication
const PROTECTED_API_PATTERNS = [
  /^\/api\/v1\/admin\/(?!auth\/)/,  // All admin API routes except /auth/login and /auth/logout
];

const PROTECTED_PAGE_PATTERNS = [
  /^\/admin\/(?!login)/,  // All admin pages except /admin/login
];

// Public API routes (no auth needed)
const PUBLIC_ROUTES = new Set([
  '/api/v1/registrations/submit',
  '/api/v1/rewards/scratch',
  '/api/v1/campaigns/resolve',
  '/api/v1/admin/auth/login',
  '/api/v1/admin/auth/logout',
  '/api/v1/admin/auth/me',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── API Auth enforcement ─────────────────────────────────────────────────
  if (PROTECTED_API_PATTERNS.some(p => p.test(pathname))) {
    if (PUBLIC_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    const cookie = req.cookies.get(SESSION_COOKIE);
    if (!cookie?.value) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(cookie.value);
    if (!session) {
      // Clear invalid cookie
      const res = NextResponse.json(
        { success: false, error: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' },
        { status: 401 }
      );
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    // Attach verified session to headers so route handlers can read it
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-territory-id', session.territoryId || '');

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Page Auth enforcement ────────────────────────────────────────────────
  if (PROTECTED_PAGE_PATTERNS.some(p => p.test(pathname))) {
    const cookie = req.cookies.get(SESSION_COOKIE);
    if (!cookie?.value) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    const session = await verifySessionToken(cookie.value);
    if (!session) {
      const res = NextResponse.redirect(new URL('/admin/login', req.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/v1/admin/:path*',
    '/admin/:path*',
  ],
};
