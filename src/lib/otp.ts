import crypto from 'crypto';
import { db } from './db';
import { logger } from './logger';

const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const MAX_RESEND_ATTEMPTS = 3;

export function generate6DigitOtp(): string {
  // SECURITY: Uses CSPRNG, not Math.random()
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp + (process.env.JWT_SECRET || '')).digest('hex');
}

export async function createWinnerOtp(winnerId: string) {
  const winner = await db.winner.findUnique({
    where: { id: winnerId },
    include: { registration: { include: { customer: true } } },
  });

  if (!winner) return { success: false, error: 'WINNER_NOT_FOUND' };

  // Check resend rate limit
  if (winner.otpResendCount >= MAX_RESEND_ATTEMPTS) {
    return { success: false, error: 'RESEND_LIMIT_EXCEEDED', message: 'Maximum OTP resends reached. Contact support.' };
  }

  const plainOtp = process.env.NODE_ENV === 'test' ? '123456' : generate6DigitOtp();
  const otpHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.winner.update({
    where: { id: winnerId },
    data: {
      otpHash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
      otpResendCount: { increment: 1 },
    },
  });

  // SECURITY: Log masked mobile only — never log OTP in plaintext (FIX MED-07)
  const mobile = winner.registration.customer.mobileNumber;
  const maskedMobile = `${mobile.slice(0, 2)}****${mobile.slice(-4)}`;
  logger.info(`OTP dispatched to ${maskedMobile}`, 'OTP', { winnerId, expiresAt });

  // MOCK SMS — in production replace with real DLT gateway
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS MOCK] OTP for winner ${winnerId}: [REDACTED from logs]`);
  }

  return {
    success: true,
    mobileNumber: maskedMobile,  // Return masked mobile only
    expiresAt,
    // SECURITY: demoOtp only in test, never in staging or production
    demoOtp: process.env.NODE_ENV === 'test' ? plainOtp : undefined,
  };
}

export async function verifyWinnerOtp(winnerId: string, inputOtp: string, verifierName: string = 'Verification Officer') {
  const winner = await db.winner.findUnique({ where: { id: winnerId } });

  if (!winner || !winner.otpHash || !winner.otpExpiresAt) {
    return { success: false, error: 'NO_OTP_INITIATED' };
  }

  if (new Date() > winner.otpExpiresAt) {
    return { success: false, error: 'OTP_EXPIRED' };
  }

  if (winner.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Account locked. Request a new OTP.' };
  }

  // SECURITY: Constant-time compare to prevent timing attacks
  const inputHash = hashOtp(inputOtp);
  const expected = Buffer.from(winner.otpHash);
  const actual = Buffer.from(inputHash);
  const isMatch = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!isMatch) {
    await db.winner.update({
      where: { id: winnerId },
      data: { otpAttempts: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - (winner.otpAttempts + 1);
    return { success: false, error: 'INVALID_OTP', remainingAttempts: remaining };
  }

  // Verification Success — clear OTP hash immediately
  const updatedWinner = await db.winner.update({
    where: { id: winnerId },
    data: {
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: verifierName,
      otpHash: null,        // Invalidate after use
      otpExpiresAt: null,
      otpAttempts: 0,
    },
  });

  return { success: true, verifiedWinner: updatedWinner };
}

export async function createDeliveryOtp(dispatchId: string) {
  const dispatch = await db.dispatch.findUnique({ where: { id: dispatchId } });
  if (!dispatch) return { success: false, error: 'DISPATCH_NOT_FOUND' };

  const plainOtp = process.env.NODE_ENV === 'test' ? '345546' : generate6DigitOtp();
  const otpHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.dispatch.update({
    where: { id: dispatchId },
    data: {
      deliveryOtpHash: otpHash,
      deliveryOtpExpiresAt: expiresAt,
      deliveryOtpAttempts: 0,  // FIX HIGH-03: Reset attempt counter
    },
  });

  // SECURITY: Log masked mobile only
  const mobile = dispatch.receiverMobile;
  const maskedMobile = `${mobile.slice(0, 2)}****${mobile.slice(-4)}`;
  logger.info(`Delivery OTP dispatched to ${maskedMobile}`, 'OTP', { dispatchId, expiresAt });

  return {
    success: true,
    mobileNumber: maskedMobile,
    expiresAt,
    demoOtp: process.env.NODE_ENV === 'test' ? plainOtp : undefined,
  };
}

export async function verifyDeliveryOtp(dispatchId: string, inputOtp: string, photoUrl?: string, signatureUrl?: string) {
  const dispatch = await db.dispatch.findUnique({ where: { id: dispatchId } });
  if (!dispatch || !dispatch.deliveryOtpHash || !dispatch.deliveryOtpExpiresAt) {
    return { success: false, error: 'NO_DELIVERY_OTP_INITIATED' };
  }

  if (new Date() > dispatch.deliveryOtpExpiresAt) {
    return { success: false, error: 'OTP_EXPIRED' };
  }

  // FIX HIGH-03: Enforce attempt limit on delivery OTP
  const attempts = dispatch.deliveryOtpAttempts || 0;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Delivery OTP locked. Generate a new OTP.' };
  }

  // SECURITY: Constant-time compare
  const inputHash = hashOtp(inputOtp);
  const expected = Buffer.from(dispatch.deliveryOtpHash);
  const actual = Buffer.from(inputHash);
  const isMatch = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!isMatch) {
    await db.dispatch.update({
      where: { id: dispatchId },
      data: { deliveryOtpAttempts: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - (attempts + 1);
    return { success: false, error: 'INVALID_DELIVERY_OTP', remainingAttempts: remaining };
  }

  // SECURITY: Require actual photo/signature proof — no fallback sample files
  if (!photoUrl || !signatureUrl) {
    return { success: false, error: 'PROOF_REQUIRED', message: 'Delivery photo and signature are required for completion.' };
  }

  const updatedDispatch = await db.dispatch.update({
    where: { id: dispatchId },
    data: {
      dispatchStatus: 'DELIVERED',
      deliveredAt: new Date(),
      deliveryPhotoUrl: photoUrl,
      deliverySignatureUrl: signatureUrl,
      deliveryOtpHash: null,    // Invalidate after use
      deliveryOtpExpiresAt: null,
      deliveryOtpAttempts: 0,
    },
  });

  await db.winner.update({
    where: { id: dispatch.winnerId },
    data: { verificationStatus: 'DELIVERED' },
  });

  return { success: true, dispatch: updatedDispatch };
}
