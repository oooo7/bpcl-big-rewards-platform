import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminUser, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

// Simple in-memory rate limiter for login endpoint
// In production: replace with Redis-backed rate limiter (Upstash)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(identifier: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (record && now < record.resetAt) {
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      return { allowed: false, retryAfterMs: record.resetAt - now };
    }
    record.count++;
    return { allowed: true };
  }

  // New window
  loginAttempts.set(identifier, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Rate limit by IP + email combination
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '127.0.0.1';
    const rateLimitKey = `${clientIp}:${email.toLowerCase().trim()}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED', message: 'Too many login attempts. Please wait 15 minutes.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 0) / 1000)) },
        }
      );
    }

    const authResult = await authenticateAdminUser(email, password);

    if (!authResult.success || !authResult.user) {
      // Audit failed login — do not reveal user existence
      await logAuditEvent({
        actorRole: 'ANONYMOUS',
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: 'unknown',
        newValues: { email: email.toLowerCase().substring(0, 50) },
        ipAddress: clientIp,
      });
      return NextResponse.json(
        { success: false, error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Create signed JWT session token — role comes from DB, not from request
    const token = await createSessionToken({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      role: authResult.user.role,
      territoryId: authResult.user.territoryId || null,
    });

    // Audit successful login
    await logAuditEvent({
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: authResult.user.id,
      newValues: { email: authResult.user.email },
      ipAddress: clientIp,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        role: authResult.user.role,
        // SECURITY: Never return territoryId in response body — use session
      },
    });

    const isProduction = process.env.NODE_ENV === 'production';

    // SECURITY: httpOnly prevents JS access, SameSite=Strict prevents CSRF
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,             // ← FIX CRIT-01: Never readable by JavaScript
      secure: isProduction,       // ← HTTPS only in production
      sameSite: 'strict',         // ← FIX MED-09: Prevent CSRF
      path: '/',                  // ← Applicable to /admin pages and /api/v1/admin endpoints
      maxAge: 60 * 60 * 24,       // 24 hours
    });

    return response;
  } catch (error: any) {
    // SECURITY: Do not expose error.message to client (FIX HIGH-07)
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'AUTHENTICATION_ERROR' },
      { status: 500 }
    );
  }
}
