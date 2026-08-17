import { NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { handleApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await AdminService.getDashboardMetrics();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
