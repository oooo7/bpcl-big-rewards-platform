import { NextRequest, NextResponse } from 'next/server';
import { createWinnerOtp, verifyWinnerOtp } from '@/lib/otp';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { action, winnerId, otpInput, verifierName } = await req.json();

    if (!winnerId) {
      return NextResponse.json({ success: false, error: 'WINNER_ID_REQUIRED' }, { status: 400 });
    }

    if (action === 'SEND') {
      const result = await createWinnerOtp(winnerId);
      if (!result.success) return NextResponse.json(result, { status: 400 });

      await logAuditEvent({
        actorRole: 'WINNER_VERIFICATION_TEAM',
        action: 'WINNER_OTP_SENT',
        entityType: 'Winner',
        entityId: winnerId,
        newValues: { mobileNumber: result.mobileNumber },
      });

      return NextResponse.json(result);
    }

    if (action === 'VERIFY') {
      if (!otpInput) return NextResponse.json({ success: false, error: 'OTP_INPUT_REQUIRED' }, { status: 400 });

      const result = await verifyWinnerOtp(winnerId, otpInput, verifierName);
      if (!result.success) return NextResponse.json(result, { status: 400 });

      await logAuditEvent({
        actorRole: 'WINNER_VERIFICATION_TEAM',
        action: 'WINNER_OTP_VERIFIED',
        entityType: 'Winner',
        entityId: winnerId,
        newValues: { status: 'VERIFIED', verifier: verifierName },
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
