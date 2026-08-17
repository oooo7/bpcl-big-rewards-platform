import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { DSMService } from '@/services/dsm.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const userRole = searchParams.get('userRole') || 'CAMPAIGN_ADMIN';
    const userId = searchParams.get('userId') || undefined;
    const userEmail = searchParams.get('userEmail') || undefined;
    const userTerritoryId = searchParams.get('userTerritoryId') || undefined;

    const filters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      campaignId: searchParams.get('campaignId') || undefined,
      territoryId: searchParams.get('territoryId') || undefined,
      stationId: searchParams.get('stationId') || undefined,
      dsmId: searchParams.get('dsmId') || undefined,
    };

    const userContext = {
      id: userId,
      email: userEmail,
      role: userRole,
      territoryId: userTerritoryId,
    };

    const data = await DSMService.getDSMPerformanceMetrics(userContext, filters);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
