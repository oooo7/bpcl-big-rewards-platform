import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { handleApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const stationCode = searchParams.get('stationCode') || 'ALL';
    const territoryId = searchParams.get('territoryId') || 'ALL';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const userRole = searchParams.get('userRole') || 'VALIDATION_TEAM';

    const result = await AdminService.getRegistrationsList({
      page,
      limit,
      search,
      status,
      stationCode,
      territoryId,
      dateFrom,
      dateTo,
      userRole,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
