import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { handleApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const userRole = searchParams.get('userRole') || 'VALIDATION_TEAM';

    const bills = await AdminService.getPendingBillQueue({ search, userRole });
    return NextResponse.json({ success: true, bills });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { billId, action, reviewerNotes, actorId, actorRole } = body;

    if (!billId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST_PARAMETERS' },
        { status: 400 }
      );
    }

    const result = await AdminService.reviewBill({
      billId,
      action,
      reviewerNotes: reviewerNotes || '',
      actorId: actorId || 'admin-system',
      actorRole: actorRole || 'VALIDATION_TEAM',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
