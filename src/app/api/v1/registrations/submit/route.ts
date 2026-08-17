import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processBillOcrAndDuplicates } from '@/lib/ocr';
import { processInstantReward } from '@/lib/reward-engine';
import { z } from 'zod';

const registrationSchema = z.object({
  campaignSlug: z.string().default('sapno-ki-sawari-season-2'),
  stationCode: z.string().default('GJ1001'),
  fullName: z.string().min(2, 'Full Name is required'),
  mobileNumber: z.string().length(10, 'Mobile Number must be 10 digits'),
  vehicleType: z.enum(['CAR', 'TWO_WHEELER', 'COMMERCIAL', 'OTHER']),
  vehicleNumber: z.string().min(4, 'Valid Vehicle Number required'),
  fuelType: z.enum(['PETROL', 'DIESEL', 'CNG', 'EV']),
  fuelAmount: z.number().min(100, 'Fuel Amount must be at least ₹100'),
  billNumber: z.string().min(3, 'Bill Number required'),
  fileName: z.string().optional().default('fuel_receipt.jpg'),
  fileFormat: z.string().optional().default('JPG'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registrationSchema.parse(body);

    // 1. Resolve Campaign & Station
    const campaign = await db.campaign.findUnique({
      where: { slug: parsed.campaignSlug },
    });
    if (!campaign || !campaign.isActive) {
      return NextResponse.json({ success: false, error: 'CAMPAIGN_EXPIRED_OR_INACTIVE' }, { status: 400 });
    }

    const station = await db.fuelStation.findUnique({
      where: { stationCode: parsed.stationCode },
    });
    if (!station || !station.isActive) {
      return NextResponse.json({ success: false, error: 'INVALID_FUEL_STATION' }, { status: 400 });
    }

    // 2. Upsert Customer
    let customer = await db.customer.findUnique({
      where: { mobileNumber: parsed.mobileNumber },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          fullName: parsed.fullName,
          mobileNumber: parsed.mobileNumber,
        },
      });
    }

    if (customer.isBlacklisted) {
      return NextResponse.json({ success: false, error: 'MOBILE_NUMBER_RESTRICTED' }, { status: 403 });
    }

    // 3. Create Registration State
    const registration = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: parsed.vehicleType,
        vehicleNumber: parsed.vehicleNumber.toUpperCase(),
        fuelType: parsed.fuelType,
        fuelAmount: parsed.fuelAmount,
        billNumber: parsed.billNumber,
        status: 'SUBMITTED',
      },
    });

    // 4. Process Bill Duplicate & OCR Check
    const dummyBuffer = Buffer.from(`${parsed.billNumber}:${parsed.fuelAmount}:${parsed.mobileNumber}`);
    const ocrResult = await processBillOcrAndDuplicates({
      registrationId: registration.id,
      fileBuffer: dummyBuffer,
      fileFormat: parsed.fileFormat,
      fileSize: 1024 * 250,
      userInputBillNumber: parsed.billNumber,
      userInputAmount: parsed.fuelAmount,
      stationId: station.id,
    });

    if (!ocrResult.success && ocrResult.isDuplicate) {
      await db.registration.update({
        where: { id: registration.id },
        data: { status: 'FRAUD_FLAGGED' },
      });
      return NextResponse.json({
        success: false,
        error: 'DUPLICATE_BILL_DETECTED',
        message: 'This bill has already been submitted or flagged for duplicate review.',
      }, { status: 409 });
    }

    // 5. Trigger Instant Reward Check if Valid
    let rewardResult = null;
    if (ocrResult.validationStatus === 'AUTO_VALIDATED') {
      rewardResult = await processInstantReward(registration.id);
    }

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      status: ocrResult.validationStatus === 'AUTO_VALIDATED' ? 'VALID' : 'UNDER_VALIDATION',
      ocrConfidence: ocrResult.ocrConfidence,
      rewardResult,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'VALIDATION_FAILED', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: err.message || 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
