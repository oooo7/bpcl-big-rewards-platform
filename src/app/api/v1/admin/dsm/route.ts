import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import { DSMService } from '@/services/dsm.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const territoryId = searchParams.get('territoryId') || 'ALL';
    const search = searchParams.get('search') || '';

    const [dsms, territories, unassignedStations] = await Promise.all([
      DSMService.getDSMList({ territoryId, search }),
      db.territory.findMany({ orderBy: { name: 'asc' } }),
      db.fuelStation.findMany({
        select: { id: true, stationCode: true, name: true, city: true, territoryId: true, dsmId: true },
        orderBy: { stationCode: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      dsms,
      territories,
      stations: unassignedStations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, dsmCode, name, email, mobile, territoryId, stationIds, actorId, actorRole } = body;

    if (action === 'ASSIGN_STATIONS') {
      if (!id || !Array.isArray(stationIds)) {
        return NextResponse.json({ success: false, error: 'DSM ID and stationIds array are required' }, { status: 400 });
      }

      const result = await DSMService.assignStationsToDSM(id, stationIds, actorId, actorRole);
      return NextResponse.json(result);
    }

    if (!dsmCode || !name || !email || !mobile || !territoryId) {
      return NextResponse.json({ success: false, error: 'All DSM fields are required' }, { status: 400 });
    }

    const result = await DSMService.createOrUpdateDSM({
      id,
      dsmCode,
      name,
      email,
      mobile,
      territoryId,
      actorId,
      actorRole,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
