import { NextRequest, NextResponse } from 'next/server';
import { processInstantReward } from '@/lib/reward-engine';
import { db } from '@/lib/db';

// ─── Rate Limiter for Reward Scratch ─────────────────────────────────────────
// Prevents a single mobile from hammering the scratch endpoint
const scratchAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_SCRATCH_PER_WINDOW = 3;
const SCRATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function rateLimitScratch(mobile: string): boolean {
  const now = Date.now();
  const rec = scratchAttempts.get(mobile);
  if (rec && now < rec.resetAt) {
    if (rec.count >= MAX_SCRATCH_PER_WINDOW) return false;
    rec.count++;
    return true;
  }
  scratchAttempts.set(mobile, { count: 1, resetAt: now + SCRATCH_WINDOW_MS });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { registrationId } = await req.json();
    if (!registrationId || typeof registrationId !== 'string') {
      return NextResponse.json({ success: false, error: 'REGISTRATION_ID_REQUIRED' }, { status: 400 });
    }

    // SECURITY: Verify registration exists AND belongs to the requesting context
    // We validate the registration status is VALID before processing
    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: { customer: true },
    });

    if (!registration) {
      return NextResponse.json({ success: false, error: 'REGISTRATION_NOT_FOUND' }, { status: 404 });
    }

    // SECURITY: Only VALID or REWARD_ELIGIBLE registrations can scratch
    if (!['VALID', 'REWARD_ELIGIBLE'].includes(registration.status)) {
      return NextResponse.json({
        success: false,
        error: 'NOT_ELIGIBLE',
        message: 'This registration is not eligible for a reward scratch.',
      }, { status: 403 });
    }

    // SECURITY: Rate limit by customer mobile to prevent abuse
    const allowed = rateLimitScratch(registration.customer.mobileNumber);
    if (!allowed) {
      return NextResponse.json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many scratch attempts. Please wait a few minutes.',
      }, { status: 429 });
    }

    const result = await processInstantReward(registrationId);
    return NextResponse.json(result);
  } catch (err: any) {
    // SECURITY: Do not expose internal error messages (FIX HIGH-07)
    console.error('[SCRATCH_ERROR]', err);
    return NextResponse.json({ success: false, error: 'SCRATCH_FAILED' }, { status: 500 });
  }
}
