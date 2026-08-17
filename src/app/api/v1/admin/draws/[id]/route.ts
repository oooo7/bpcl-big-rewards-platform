import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import { maskCustomerPII } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole') || 'DRAW_MANAGER';
    const { id: drawId } = await params;

    const draw = await db.drawSchedule.findUnique({
      where: { id: drawId },
      include: {
        campaign: true,
        winners: {
          include: {
            registration: {
              include: { customer: true, station: true, bill: true },
            },
          },
        },
      },
    });

    if (!draw) {
      return NextResponse.json({ success: false, error: 'Draw record not found' }, { status: 404 });
    }

    const auditLogs = await db.auditLog.findMany({
      where: { entityId: drawId, entityType: 'DrawSchedule' },
      include: { actor: { select: { name: true, role: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedWinners = draw.winners.map((w) => {
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

    return NextResponse.json({
      success: true,
      draw: {
        ...draw,
        winners: sanitizedWinners,
        auditLogs,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
