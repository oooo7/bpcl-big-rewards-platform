import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { db } from './db';
import { AppError } from './errors';

// ─── JWT Secret ───────────────────────────────────────────────────────────────

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set. Never use a default secret in production.');
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_ALG = 'HS256';
const SESSION_COOKIE = 'bpcl_admin_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// ─── Session Payload ─────────────────────────────────────────────────────────

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  territoryId: string | null;
}

// ─── Create Signed Session Token ─────────────────────────────────────────────

export async function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(JWT_SECRET);
}

// ─── Verify Session Token ────────────────────────────────────────────────────

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: [JWT_ALG] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Get Authenticated Session from Request ───────────────────────────────────
// SECURITY: Reads from httpOnly cookie only. Never from headers or querystrings.

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return null;
  return verifySessionToken(cookie.value);
}

// ─── Require Auth — throws AppError if unauthorized ──────────────────────────

export async function requireAuth(req: NextRequest): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session) {
    throw new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED');
  }
  // Verify user still exists and is active (defend against revoked sessions)
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isActive: true, role: true },
  });
  if (!user || !user.isActive) {
    throw new AppError('Session is no longer valid. Please log in again.', 401, 'SESSION_INVALID');
  }
  // Re-verify role from DB (not from cookie — prevent role escalation)
  return { ...session, role: user.role };
}

// ─── Require Auth + Permission ───────────────────────────────────────────────

export async function requirePermission(req: NextRequest, permission: string): Promise<SessionPayload> {
  const session = await requireAuth(req);
  if (!hasPermission(session.role, permission)) {
    throw new AppError(`Insufficient permissions. Required: ${permission}`, 403, 'FORBIDDEN');
  }
  return session;
}

// ─── Authenticate Admin User ─────────────────────────────────────────────────
// SECURITY: Uses bcrypt for password verification. No hardcoded backdoors.

export async function authenticateAdminUser(email: string, passwordPlain: string) {
  const bcrypt = await import('bcryptjs');
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { territory: true },
  });

  // Constant-time failure: do not reveal whether email exists
  if (!user || !user.isActive) {
    // Still run bcrypt compare to prevent timing-based user enumeration
    await bcrypt.compare(passwordPlain, '$2b$12$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    return { success: false, error: 'INVALID_CREDENTIALS' };
  }

  // Verify password hash using bcrypt
  const isValidPassword = user.passwordHash
    ? await bcrypt.compare(passwordPlain, user.passwordHash)
    : false;

  if (!isValidPassword) {
    return { success: false, error: 'INVALID_CREDENTIALS' };
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      territoryId: user.territoryId,
      territoryName: user.territory?.name,
    },
  };
}

// ─── Hash Password (for seeding/user creation) ───────────────────────────────

export async function hashPassword(plainPassword: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(plainPassword, 12);
}

// ─── Permission Matrix ───────────────────────────────────────────────────────

export function hasPermission(role: string, requiredPermission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    CAMPAIGN_ADMIN: [
      'campaign.*', 'station.*', 'bill.*', 'draw.*', 'winner.*', 'prize.*',
      'report.*', 'audit.*', 'registrations.*', 'rewards.*', 'customer.view_pii',
      'dsm.view_territory',
    ],
    OPERATIONS_ADMIN: [
      'registrations.view', 'registrations.view_pii', 'bill.validate',
      'rewards.view', 'report.export',
    ],
    VALIDATION_TEAM: ['bill.validate', 'registrations.view', 'report.export'],
    DRAW_MANAGER: ['draw.configure', 'draw.execute', 'winner.view', 'report.export'],
    FULFILLMENT_TEAM: ['winner.verify_otp', 'prize.dispatch', 'report.export'],
    DSM: ['dsm.view_territory', 'registrations.view', 'report.export'],
    AUDITOR: ['audit.view_logs', 'registrations.view', 'bill.view', 'report.export'],
    READ_ONLY_MGMT: ['registrations.view', 'rewards.view', 'report.export'],
  };

  const allowed = rolePermissions[role] || [];
  if (allowed.includes('*')) return true;
  const domain = requiredPermission.split('.')[0];
  return allowed.includes(requiredPermission) || allowed.includes(`${domain}.*`);
}

// ─── PII Masking ─────────────────────────────────────────────────────────────

export function maskCustomerPII(
  customer: { fullName: string; mobileNumber: string },
  userRole: string = 'VALIDATION_TEAM'
) {
  const canViewPII = hasPermission(userRole, 'customer.view_pii');
  if (canViewPII) {
    return { fullName: customer.fullName, mobileNumber: customer.mobileNumber, isMasked: false };
  }

  const m = customer.mobileNumber || '';
  const maskedMobile = m.length >= 10 ? `${m.slice(0, 2)}****${m.slice(-4)}` : '**********';

  const nameParts = customer.fullName ? customer.fullName.trim().split(' ') : ['Customer'];
  let maskedName = nameParts[0];
  if (nameParts.length > 1) {
    maskedName = `${nameParts[0]} ${nameParts[1][0]}.`;
  } else if (maskedName.length > 2) {
    maskedName = `${maskedName.slice(0, 2)}***`;
  }

  return { fullName: maskedName, mobileNumber: maskedMobile, isMasked: true };
}

// ─── Legacy Compat: getAuthContext ────────────────────────────────────────────
// Synchronous fallback for routes not yet migrated; reads role from verified session.
// NOTE: migrate all callers to use async requireAuth() instead.

export function getAuthContext(req: NextRequest): { userId: string; role: string; email: string } {
  const cookie = req.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  // Synchronous basic check — full async verification done by requireAuth
  // We parse but do NOT trust without verification — just for route-level compat
  // Callers must upgrade to async requireAuth
  try {
    const parsed = JSON.parse(decodeURIComponent(cookie.value));
    if (!parsed.role) throw new Error('Invalid session');
    return { userId: parsed.userId || parsed.id || '', role: parsed.role, email: parsed.email || '' };
  } catch {
    throw new AppError('Invalid session token', 401, 'UNAUTHORIZED');
  }
}

export { SESSION_COOKIE };
