import crypto from 'crypto';
import { db } from './db';

export function computeFileHash(fileBuffer: Buffer): string {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export async function processBillOcrAndDuplicates(params: {
  registrationId: string;
  fileBuffer: Buffer;
  fileFormat: string;
  fileSize: number;
  userInputBillNumber: string;
  userInputAmount: number;
  stationId: string;
}) {
  // Check file size (5MB limit)
  if (params.fileSize > 5 * 1024 * 1024) {
    return {
      success: false,
      isDuplicate: false,
      reason: 'FILE_SIZE_EXCEEDED',
      validationStatus: 'REJECTED',
      fileHash: '',
    };
  }

  const fileHash = computeFileHash(params.fileBuffer);

  // 1. Check exact binary file hash duplicate
  const existingFileHash = await db.bill.findFirst({
    where: { fileHash },
  });

  if (existingFileHash) {
    // Flag fraud
    await db.fraudFlag.create({
      data: {
        registrationId: params.registrationId,
        flagType: 'DUPLICATE_BILL_HASH',
        reason: `Uploaded bill has identical file SHA-256 hash to existing bill ID: ${existingFileHash.id}`,
        severity: 'HIGH',
      },
    });

    return {
      success: false,
      isDuplicate: true,
      reason: 'DUPLICATE_FILE_UPLOADED',
      validationStatus: 'DUPLICATE_FLAGGED',
      fileHash,
    };
  }

  // 2. Check exact receipt number + amount duplicate across campaign
  const existingRegistration = await db.registration.findFirst({
    where: {
      campaignId: (await db.registration.findUnique({ where: { id: params.registrationId }, select: { campaignId: true } }))?.campaignId,
      billNumber: params.userInputBillNumber,
      fuelAmount: params.userInputAmount,
      id: { not: params.registrationId },
    },
  });

  if (existingRegistration) {
    await db.fraudFlag.create({
      data: {
        registrationId: params.registrationId,
        flagType: 'DUPLICATE_RECEIPT_NO',
        reason: `Bill number ${params.userInputBillNumber} with amount ${params.userInputAmount} already submitted at this station.`,
        severity: 'HIGH',
      },
    });

    return {
      success: false,
      isDuplicate: true,
      reason: 'DUPLICATE_RECEIPT_NUMBER',
      validationStatus: 'DUPLICATE_FLAGGED',
      fileHash,
    };
  }

  // 3. Assistive OCR Extraction Simulation
  const mockConfidence = Math.random() > 0.15 ? 0.92 : 0.65;
  const ocrBillNumber = mockConfidence > 0.8 ? params.userInputBillNumber : `INV-${Math.floor(Math.random() * 9000) + 1000}`;
  const ocrAmount = mockConfidence > 0.8 ? params.userInputAmount : params.userInputAmount * 0.9;

  const validationStatus = mockConfidence >= 0.8 ? 'AUTO_VALIDATED' : 'PENDING';

  // Save Bill record
  const bill = await db.bill.create({
    data: {
      registrationId: params.registrationId,
      fileKey: `uploads/bills/${Date.now()}_${fileHash.substring(0, 8)}.${params.fileFormat.toLowerCase()}`,
      fileHash,
      fileFormat: params.fileFormat,
      fileSize: params.fileSize,
      ocrBillNumber,
      ocrAmount,
      ocrConfidence: mockConfidence,
      validationStatus,
    },
  });

  // Update registration status
  const regStatus = validationStatus === 'AUTO_VALIDATED' ? 'VALID' : 'UNDER_VALIDATION';
  await db.registration.update({
    where: { id: params.registrationId },
    data: { status: regStatus },
  });

  return {
    success: true,
    isDuplicate: false,
    validationStatus,
    ocrConfidence: mockConfidence,
    bill,
  };
}
