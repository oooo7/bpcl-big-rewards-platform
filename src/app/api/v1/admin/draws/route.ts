import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { freezeDrawPool, executeDraw } from '@/lib/draw-engine';
import { logAuditEvent } from '@/lib/audit';
import { handleApiError } from '@/lib/errors';
import { maskCustomerPII, hasPermission } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// Read verified session from middleware-injected headers
function getSessionFromHeaders(req: NextRequest) {
  return {
    userId: req.headers.get('x-user-id') || '',
    role: req.headers.get('x-user-role') || '',
    email: req.headers.get('x-user-email') || '',
    territoryId: req.headers.get('x-territory-id') || undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Role comes from verified middleware headers, NOT from querystring
    const session = getSessionFromHeaders(req);
    if (!session.role) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    if (!hasPermission(session.role, 'draw.configure') && !hasPermission(session.role, 'winner.view')) {
      throw new AppError('Insufficient permissions to view draws', 403, 'FORBIDDEN');
    }

    const draws = await db.drawSchedule.findMany({
      include: {
        winners: {
          include: {
            registration: {
              include: { customer: true, station: true },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // SECURITY: PII masking uses server-side verified role, never client-provided param
    const sanitizedDraws = draws.map((d) => ({
      ...d,
      winners: d.winners.map((w) => {
        const maskedCustomer = maskCustomerPII(w.registration.customer, session.role);
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
      }),
    }));

    return NextResponse.json({ success: true, draws: sanitizedDraws });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Operator identity from verified session, not from request body
    const session = getSessionFromHeaders(req);
    if (!session.role) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const body = await req.json();
    const { action, drawId, drawName, drawType, scheduledDate, winnerCount } = body;

    if (action === 'FREEZE') {
      if (!hasPermission(session.role, 'draw.configure')) {
        throw new AppError('Insufficient permissions to freeze draw pool', 403, 'FORBIDDEN');
      }
      if (!drawId) throw new AppError('Draw ID is required', 400, 'BAD_REQUEST');

      const result = await freezeDrawPool(drawId, session.userId, session.role);
      return NextResponse.json(result);
    }

    if (action === 'EXECUTE') {
      if (!hasPermission(session.role, 'draw.execute')) {
        throw new AppError('Insufficient permissions to execute draw', 403, 'FORBIDDEN');
      }
      if (!drawId) throw new AppError('Draw ID is required', 400, 'BAD_REQUEST');

      // SECURITY: operatorName comes from verified session, never from request body
      const result = await executeDraw(
        drawId,
        session.email,   // operator name = verified email
        session.userId,  // operator ID = verified user ID
        session.role     // operator role = verified role
      );
      return NextResponse.json(result);
    }

    if (action === 'CREATE' || action === 'CONFIGURE') {
      if (!hasPermission(session.role, 'draw.configure')) {
        throw new AppError('Insufficient permissions to configure draws', 403, 'FORBIDDEN');
      }
      if (!drawName || !scheduledDate) {
        throw new AppError('Draw name and scheduled date are required', 400, 'BAD_REQUEST');
      }

      const campaign = await db.campaign.findFirst({ where: { isActive: true } });
      if (!campaign) throw new AppError('No active campaign', 400, 'NO_ACTIVE_CAMPAIGN');

      const newDraw = await db.drawSchedule.create({
        data: {
          campaignId: campaign.id,
          drawName,
          drawType: drawType || 'FORTNIGHTLY',
          scheduledDate: new Date(scheduledDate),
          winnerCount: Number(winnerCount) || (drawType === 'GRAND_BUMPER' ? 1 : 25),
          status: 'SCHEDULED',
        },
      });

      await logAuditEvent({
        actorId: session.userId,
        actorRole: session.role,
        action: 'DRAW_CREATE_CONFIG',
        entityType: 'DrawSchedule',
        entityId: newDraw.id,
        newValues: { drawName, drawType, scheduledDate, winnerCount },
      });

      return NextResponse.json({ success: true, draw: newDraw });
    }

    throw new AppError('Invalid action', 400, 'INVALID_ACTION');
  } catch (error) {
    return handleApiError(error);
  }
}
