import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDeliveryOtp, verifyDeliveryOtp } from '@/lib/otp';
import { logAuditEvent } from '@/lib/audit';
import { handleApiError } from '@/lib/errors';
import { maskCustomerPII } from '@/lib/auth';
import { FulfillmentService } from '@/services/fulfillment.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole') || 'FULFILLMENT_TEAM';

    const dispatches = await db.dispatch.findMany({
      include: {
        winner: {
          include: {
            registration: {
              include: { customer: true, station: true },
            },
          },
        },
      },
      orderBy: { dispatchedAt: 'desc' },
    });

    const sanitizedDispatches = dispatches.map((d) => {
      const maskedCustomer = maskCustomerPII(d.winner.registration.customer, userRole);
      return {
        ...d,
        winner: {
          ...d.winner,
          registration: {
            ...d.winner.registration,
            customer: {
              ...d.winner.registration.customer,
              fullName: maskedCustomer.fullName,
              mobileNumber: maskedCustomer.mobileNumber,
              isMasked: maskedCustomer.isMasked,
            },
          },
        },
      };
    });

    return NextResponse.json({ success: true, dispatches: sanitizedDispatches });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      winnerId,
      dispatchId,
      nodalPoint,
      shippingAddress,
      trackingNumber,
      nextStatus,
      otpInput,
      photoUrl,
      signatureUrl,
      actorId,
      actorRole,
    } = body;

    if (action === 'CREATE') {
      const result = await FulfillmentService.createDispatchOrder({
        winnerId,
        shippingAddress,
        nodalPoint,
        trackingNumber,
        actorId,
        actorRole: actorRole || 'FULFILLMENT_TEAM',
      });
      return NextResponse.json(result);
    }

    if (action === 'UPDATE_STATUS') {
      if (!dispatchId || !nextStatus) {
        return NextResponse.json({ success: false, error: 'Dispatch ID and next status are required' }, { status: 400 });
      }

      const result = await FulfillmentService.updateDispatchState({
        dispatchId,
        nextStatus,
        actorId,
        actorRole: actorRole || 'FULFILLMENT_TEAM',
      });
      return NextResponse.json(result);
    }

    if (action === 'SEND_DELIVERY_OTP') {
      if (!dispatchId) {
        return NextResponse.json({ success: false, error: 'Dispatch ID is required' }, { status: 400 });
      }
      const result = await createDeliveryOtp(dispatchId);
      return NextResponse.json(result);
    }

    if (action === 'VERIFY_DELIVERY_OTP') {
      if (!dispatchId || !otpInput) {
        return NextResponse.json({ success: false, error: 'Dispatch ID and OTP input are required' }, { status: 400 });
      }
      const result = await verifyDeliveryOtp(
        dispatchId,
        otpInput,
        photoUrl || '/samples/delivery_proof.jpg',
        signatureUrl || '/samples/signature.png'
      );
      if (!result.success) return NextResponse.json(result, { status: 400 });

      await logAuditEvent({
        actorId,
        actorRole: actorRole || 'FULFILLMENT_TEAM',
        action: 'PRIZE_DELIVERED_AUDIT_CLOSED',
        entityType: 'Dispatch',
        entityId: dispatchId,
        newValues: {
          status: 'DELIVERED',
          deliveryPhotoUrl: result.dispatch?.deliveryPhotoUrl,
          deliverySignatureUrl: result.dispatch?.deliverySignatureUrl,
        },
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
