import { NextRequest, NextResponse } from 'next/server';
import { resolveStationFromQr } from '@/lib/qr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug') || 'sapno-ki-sawari-season-2';
  const stationCode = searchParams.get('station') || 'GJ1001';
  const sig = searchParams.get('sig') || undefined;

  const result = await resolveStationFromQr(slug, stationCode, sig);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
