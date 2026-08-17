import { db } from '@/lib/db';
import { processBillOcrAndDuplicates } from '@/lib/ocr';
import { processInstantReward } from '@/lib/reward-engine';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { customerRegistrationSchema } from '@/lib/validations';

export class RegistrationService {
  static async createRegistration(data: {
    campaignSlug: string;
    stationCode: string;
    fullName: string;
    mobileNumber: string;
    vehicleType: string;
    vehicleNumber: string;
    fuelType: string;
    fuelAmount: number;
    billNumber: string;
    fileFormat: string;
  }) {
    // Validate with Zod schema (validates format JPG/PNG/PDF, mobile digits, vehicle format)
    const validatedData = customerRegistrationSchema.parse({
      campaignSlug: data.campaignSlug,
      stationCode: data.stationCode,
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
      vehicleType: data.vehicleType as any,
      vehicleNumber: data.vehicleNumber,
      fuelType: data.fuelType as any,
      fuelAmount: data.fuelAmount,
      billNumber: data.billNumber,
      fileName: 'fuel_receipt',
      fileFormat: data.fileFormat as any,
    });

    // 1. Resolve Campaign & Station
    const campaign = await db.campaign.findUnique({ where: { slug: validatedData.campaignSlug } });
    if (!campaign || !campaign.isActive) {
      throw new AppError('Campaign is inactive or expired', 400, 'CAMPAIGN_INACTIVE');
    }

    const now = new Date();
    if (campaign.endDate && now > campaign.endDate) {
      throw new AppError('Campaign is outside active schedule dates', 400, 'CAMPAIGN_EXPIRED');
    }

    const station = await db.fuelStation.findUnique({ where: { stationCode: validatedData.stationCode } });
    if (!station || !station.isActive) {
      throw new AppError('Invalid or inactive fuel station code', 400, 'STATION_INVALID');
    }

    // 2. Customer Profile & Daily Submission Limit
    let customer = await db.customer.findUnique({ where: { mobileNumber: validatedData.mobileNumber } });
    if (!customer) {
      customer = await db.customer.create({
        data: { fullName: validatedData.fullName, mobileNumber: validatedData.mobileNumber },
      });
    }

    if (customer.isBlacklisted) {
      throw new AppError('Mobile number is restricted from participation', 403, 'MOBILE_RESTRICTED');
    }

    // Check daily registration count (max 10 submissions per 24 hours per customer)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyRegistrationsCount = await db.registration.count({
      where: {
        customerId: customer.id,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (dailyRegistrationsCount >= 10) {
      throw new AppError('Daily registration limit reached for this mobile number (max 10 per 24 hours)', 429, 'DAILY_LIMIT_EXCEEDED');
    }

    // 3. Create Registration State
    const registration = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: validatedData.vehicleType,
        vehicleNumber: validatedData.vehicleNumber.toUpperCase(),
        fuelType: validatedData.fuelType,
        fuelAmount: validatedData.fuelAmount,
        billNumber: validatedData.billNumber,
        status: 'SUBMITTED',
      },
    });

    // 4. Duplicate Check & OCR
    const dummyBuffer = Buffer.from(`${validatedData.billNumber}:${validatedData.fuelAmount}:${validatedData.mobileNumber}`);
    const ocrResult = await processBillOcrAndDuplicates({
      registrationId: registration.id,
      fileBuffer: dummyBuffer,
      fileFormat: validatedData.fileFormat,
      fileSize: 1024 * 250,
      userInputBillNumber: validatedData.billNumber,
      userInputAmount: validatedData.fuelAmount,
      stationId: station.id,
    });

    if (!ocrResult.success && ocrResult.isDuplicate) {
      await db.registration.update({
        where: { id: registration.id },
        data: { status: 'FRAUD_FLAGGED' },
      });
      throw new AppError('Duplicate fuel bill detected', 409, 'DUPLICATE_BILL');
    }

    // 5. Instant Scratch Reward Check
    let rewardResult = null;
    if (ocrResult.validationStatus === 'AUTO_VALIDATED') {
      rewardResult = await processInstantReward(registration.id);
    }

    logger.info('Registration created successfully', 'RegistrationService', {
      registrationId: registration.id,
      stationCode: validatedData.stationCode,
    });

    return {
      registrationId: registration.id,
      status: ocrResult.validationStatus === 'AUTO_VALIDATED' ? 'VALID' : 'UNDER_VALIDATION',
      rewardResult,
    };
  }
}
