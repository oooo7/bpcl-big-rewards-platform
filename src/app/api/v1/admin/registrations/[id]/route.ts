import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { handleApiError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole') || 'VALIDATION_TEAM';
    const registrationId = params.id;

    const detail = await AdminService.getRegistrationById(registrationId, userRole);
    return NextResponse.json({ success: true, registration: detail });
  } catch (error) {
    return handleApiError(error);
  }
}
