import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import { maskCustomerPII } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { createWinnerOtp, verifyWinnerOtp } from '@/lib/otp';
import { FulfillmentService } from '@/services/fulfillment.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const drawId = searchParams.get('drawId') || 'ALL';
    const userRole = searchParams.get('userRole') || 'FULFILLMENT_TEAM';

    const whereClause: any = {};

    if (status !== 'ALL') {
      whereClause.verificationStatus = status;
    }

    if (drawId !== 'ALL') {
      whereClause.drawId = drawId;
    }

    if (search) {
      const q = search.trim();
      whereClause.registration = {
        OR: [
          { billNumber: { contains: q } },
          { customer: { fullName: { contains: q } } },
          { customer: { mobileNumber: { contains: q } } },
        ],
      };
    }

    const winners = await db.winner.findMany({
      where: whereClause,
      include: {
        draw: true,
        registration: {
          include: { customer: true, station: true, bill: true },
        },
        dispatch: true,
      },
      orderBy: { id: 'desc' },
    });

    const sanitizedWinners = winners.map((w) => {
      const maskedCustomer = maskCustomerPII(w.registration.customer, userRole);
      return {
        ...w,
        registration: {
          ...w.registration,
          customer: {
            ...w.registration.customer,
            fullName: maskedCustomer.fullName,
            mobileNumber: maskedCustomer.mobileNumber,
            isMasked: maskedCustomer.isMasked,
          },
        },
      };
    });

    return NextResponse.json({ success: true, winners: sanitizedWinners });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, winnerId, otpInput, reviewerNotes, actorId, actorRole, shippingAddress, nodalPoint, prizeSku } = body;

    if (!winnerId) {
      return NextResponse.json({ success: false, error: 'Winner ID is required' }, { status: 400 });
    }

    if (action === 'INITIATE_OTP' || action === 'SEND_OTP') {
      const result = await createWinnerOtp(winnerId);
      if (!result.success) return NextResponse.json(result, { status: 400 });
      return NextResponse.json(result);
    }

    if (action === 'VERIFY_OTP') {
      if (!otpInput) {
        return NextResponse.json({ success: false, error: 'OTP input is required' }, { status: 400 });
      }
      const result = await verifyWinnerOtp(winnerId, otpInput, actorId || 'Fulfillment Lead');
      if (!result.success) return NextResponse.json(result, { status: 400 });

      await logAuditEvent({
        actorId,
        actorRole: actorRole || 'FULFILLMENT_TEAM',
        action: 'WINNER_OTP_VERIFIED',
        entityType: 'Winner',
        entityId: winnerId,
        newValues: { verificationStatus: 'VERIFIED' },
      });

      return NextResponse.json(result);
    }

    if (action === 'ALLOCATE_PRIZE') {
      const result = await FulfillmentService.allocatePrizeToWinner(
        winnerId,
        prizeSku,
        actorId,
        actorRole || 'FULFILLMENT_TEAM'
      );
      return NextResponse.json(result);
    }

    if (action === 'CREATE_DISPATCH') {
      const result = await FulfillmentService.createDispatchOrder({
        winnerId,
        shippingAddress,
        nodalPoint,
        actorId,
        actorRole: actorRole || 'FULFILLMENT_TEAM',
      });
      return NextResponse.json(result);
    }

    if (action === 'VERIFY' || action === 'REJECT') {
      const newStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
      const updatedWinner = await db.winner.update({
        where: { id: winnerId },
        data: {
          verificationStatus: newStatus,
          verifiedAt: new Date(),
          verifiedBy: actorId || 'Winner Verification Lead',
        },
      });

      await logAuditEvent({
        actorId: actorId || 'admin-user',
        actorRole: actorRole || 'FULFILLMENT_TEAM',
        action: `WINNER_REVIEW_${action}`,
        entityType: 'Winner',
        entityId: winnerId,
        newValues: { status: newStatus, notes: reviewerNotes },
      });

      return NextResponse.json({ success: true, winner: updatedWinner });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
