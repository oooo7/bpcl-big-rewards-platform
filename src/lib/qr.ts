import crypto from 'crypto';
import { db } from './db';

const QR_SECRET = process.env.QR_HMAC_SECRET || 'bpcl_qr_hmac_secret_key_2026';

export function generateStationHmac(stationCode: string, campaignSlug: string): string {
  return crypto
    .createHmac('sha256', QR_SECRET)
    .update(`${campaignSlug}:${stationCode}`)
    .digest('hex');
}

export function verifyStationHmac(
  stationCode: string,
  campaignSlug: string,
  providedSig: string
): boolean {
  const expectedSig = generateStationHmac(stationCode, campaignSlug);
  const bufExpected = Buffer.from(expectedSig);
  const bufProvided = Buffer.from(providedSig);
  if (bufExpected.length !== bufProvided.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufExpected, bufProvided);
}

export async function resolveStationFromQr(
  campaignSlug: string,
  stationCode: string,
  sig?: string
) {
  const campaign = await db.campaign.findUnique({
    where: { slug: campaignSlug },
  });

  if (!campaign || !campaign.isActive) {
    return { success: false, error: 'CAMPAIGN_INACTIVE_OR_NOT_FOUND' };
  }

  const station = await db.fuelStation.findUnique({
    where: { stationCode },
    include: {
      territory: true,
      qrCodes: {
        where: { campaignId: campaign.id, status: 'ACTIVE' },
      },
    },
  });

  if (!station || !station.isActive) {
    return { success: false, error: 'STATION_INACTIVE_OR_INVALID' };
  }

  // SECURITY FIX HIGH-04: QR signature is REQUIRED, not optional
  // Stations without registered QR codes are rejected to prevent forgery
  if (station.qrCodes.length === 0) {
    return { success: false, error: 'NO_ACTIVE_QR_CODE_FOR_STATION' };
  }

  if (!sig) {
    return { success: false, error: 'QR_SIGNATURE_REQUIRED', message: 'Invalid QR code. Please scan the official BPCL QR code.' };
  }

  const isValidSig = verifyStationHmac(stationCode, campaignSlug, sig);
  if (!isValidSig) {
    return { success: false, error: 'INVALID_QR_SIGNATURE', message: 'QR code verification failed. Please scan again.' };
  }

  // Track scan count asynchronously
  if (station.qrCodes[0]) {
    await db.qRCode.update({
      where: { id: station.qrCodes[0].id },
      data: { scanCount: { increment: 1 } },
    });
  }

  return {
    success: true,
    campaign: {
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      season: campaign.season,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    },
    station: {
      id: station.id,
      stationCode: station.stationCode,
      name: station.name,
      city: station.city,
      address: station.address,
      territory: station.territory.name,
    },
  };
}
