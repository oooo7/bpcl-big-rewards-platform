import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { handleApiError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const rewardType = searchParams.get('rewardType') || 'ALL';
    const userRole = searchParams.get('userRole') || 'READ_ONLY_MGMT';

    const result = await AdminService.getRewardsSummaryAndTransactions({
      page,
      limit,
      search,
      rewardType,
      userRole,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
