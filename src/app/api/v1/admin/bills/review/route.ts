import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { handleApiError, AppError } from '@/lib/errors';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    // RBAC Enforcer: Only SUPER_ADMIN, CAMPAIGN_ADMIN, or VALIDATION_TEAM can review bills
    if (!['SUPER_ADMIN', 'CAMPAIGN_ADMIN', 'VALIDATION_TEAM'].includes(auth.role)) {
      throw new AppError('Unauthorized: Insufficient role permissions for bill review', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const { billId, action, reviewerNotes } = body;

    if (!billId || !['APPROVE', 'REJECT'].includes(action)) {
      throw new AppError('Invalid request parameters', 400, 'BAD_REQUEST');
    }

    const result = await AdminService.reviewBill({
      billId,
      action,
      reviewerNotes: reviewerNotes || 'Manual review executed via Admin Portal',
      actorId: auth.userId,
      actorRole: auth.role,
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return handleApiError(error);
  }
}
