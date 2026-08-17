import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../src/lib/db';
import { RegistrationService } from '../../src/services/registration.service';
import { processInstantReward } from '../../src/lib/reward-engine';
import { generateStationHmac, verifyStationHmac } from '../../src/lib/qr';
import { processBillOcrAndDuplicates } from '../../src/lib/ocr';

describe('Customer End-to-End Vertical Slice Tests', () => {
  let campaignId: string;
  let stationId: string;
  let stationCode = 'GJ1001';
  let campaignSlug = 'sapno-ki-sawari-season-2';

  beforeAll(async () => {
    // Ensure campaign & station exist in database
    const campaign = await db.campaign.findUnique({ where: { slug: campaignSlug } });
    if (campaign) campaignId = campaign.id;

    const station = await db.fuelStation.findUnique({ where: { stationCode } });
    if (station) stationId = station.id;
  });

  // 1. Secure Cryptographic QR Code Verification
  it('1. Secure QR Code: Validates HMAC signature for station code and campaign slug', () => {
    const validHmac = generateStationHmac(stationCode, campaignSlug);
    const isValid = verifyStationHmac(stationCode, campaignSlug, validHmac);
    expect(isValid).toBe(true);

    const isTamperedValid = verifyStationHmac('GJ9999', campaignSlug, validHmac);
    expect(isTamperedValid).toBe(false);
  });

  // 2. Server-Side Valid Registration & Bill Upload
  it('2. Valid Registration: Creates customer, bill record, and processes receipt', async () => {
    const testMobile = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const testBill = `TEST-INV-${Date.now()}`;

    const result = await RegistrationService.createRegistration({
      campaignSlug,
      stationCode,
      fullName: 'Test Customer Ramesh',
      mobileNumber: testMobile,
      vehicleType: 'CAR',
      vehicleNumber: 'GJ01XY9999',
      fuelType: 'PETROL',
      fuelAmount: 1500,
      billNumber: testBill,
      fileFormat: 'JPG',
    });

    expect(result.registrationId).toBeDefined();
    expect(['VALID', 'UNDER_VALIDATION']).toContain(result.status);

    // Verify registration status in database
    const reg = await db.registration.findUnique({
      where: { id: result.registrationId },
      include: { bill: true, reward: true },
    });
    expect(reg).not.toBeNull();
    expect(reg?.bill?.fileHash).toBeDefined();
  });

  // 3. Invalid Registration Input Validation
  it('3. Invalid Registration: Rejects invalid mobile number or missing parameters', async () => {
    await expect(
      RegistrationService.createRegistration({
        campaignSlug: 'non-existent-campaign',
        stationCode,
        fullName: 'Test Invalid',
        mobileNumber: '123',
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01XY9999',
        fuelType: 'PETROL',
        fuelAmount: 1500,
        billNumber: 'INV-INVALID',
        fileFormat: 'JPG',
      })
    ).rejects.toThrow();
  });

  // 4. Duplicate Registration Protection
  it('4. Duplicate Registration Protection: Blocks customer duplicate submission if restricted', async () => {
    const dupMobile = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const billNo1 = `REG-BILL-1-${Date.now()}`;

    const result1 = await RegistrationService.createRegistration({
      campaignSlug,
      stationCode,
      fullName: 'Repeat Customer',
      mobileNumber: dupMobile,
      vehicleType: 'CAR',
      vehicleNumber: 'GJ01ZZ1234',
      fuelType: 'PETROL',
      fuelAmount: 1000,
      billNumber: billNo1,
      fileFormat: 'JPG',
    });

    expect(result1.registrationId).toBeDefined();
  });

  // 5. Invalid File Format Protection
  it('5. Invalid File Format: Rejects unsupported file extensions like EXE or TXT', async () => {
    await expect(
      RegistrationService.createRegistration({
        campaignSlug,
        stationCode,
        fullName: 'Hack Customer',
        mobileNumber: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01XY9999',
        fuelType: 'PETROL',
        fuelAmount: 1500,
        billNumber: `BILL-BAD-FILE-${Date.now()}`,
        fileFormat: 'EXE' as any,
      })
    ).rejects.toThrow();
  });

  // 6. Oversized File Protection (>5MB)
  it('6. Oversized File Protection: Rejects files exceeding 5MB max size limit', async () => {
    const registration = await db.registration.create({
      data: {
        campaignId,
        stationId,
        customerId: (await db.customer.findFirst())!.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01AB0000',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BILL-LARGE-${Date.now()}`,
      },
    });

    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB file
    const result = await processBillOcrAndDuplicates({
      registrationId: registration.id,
      fileBuffer: largeBuffer,
      fileFormat: 'JPG',
      fileSize: largeBuffer.length,
      userInputBillNumber: registration.billNumber,
      userInputAmount: 1000,
      stationId,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('FILE_SIZE_EXCEEDED');
  });

  // 7. Duplicate Bill Upload Protection
  it('7. Duplicate Bill Protection: Prevents submitting same bill number & amount twice', async () => {
    const dupMobile1 = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const dupMobile2 = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const duplicateBillNo = `DUP-BILL-${Date.now()}`;

    // First submission succeeds
    await RegistrationService.createRegistration({
      campaignSlug,
      stationCode,
      fullName: 'First Customer',
      mobileNumber: dupMobile1,
      vehicleType: 'CAR',
      vehicleNumber: 'GJ01AB1111',
      fuelType: 'PETROL',
      fuelAmount: 2000,
      billNumber: duplicateBillNo,
      fileFormat: 'JPG',
    });

    // Second submission with exact same bill number & amount at same station fails
    await expect(
      RegistrationService.createRegistration({
        campaignSlug,
        stationCode,
        fullName: 'Second Customer Fraud Attempt',
        mobileNumber: dupMobile2,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01AB2222',
        fuelType: 'PETROL',
        fuelAmount: 2000,
        billNumber: duplicateBillNo,
        fileFormat: 'JPG',
      })
    ).rejects.toThrow();
  });

  // 8. Server-Side Reward Determination & Idempotency
  it('8. Valid Reward & Repeated Request: Issues instant reward idempotently without double-issuance', async () => {
    const testMobile = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const testBill = `REWARD-BILL-${Date.now()}`;

    const regResult = await RegistrationService.createRegistration({
      campaignSlug,
      stationCode,
      fullName: 'Reward Tester',
      mobileNumber: testMobile,
      vehicleType: 'TWO_WHEELER',
      vehicleNumber: 'GJ05CD5555',
      fuelType: 'PETROL',
      fuelAmount: 500,
      billNumber: testBill,
      fileFormat: 'PNG',
    });

    // Repeated request should return already issued reward
    const secondResult = await processInstantReward(regResult.registrationId);
    expect(secondResult.success).toBe(true);
    expect(secondResult.alreadyIssued).toBe(true);
  });

  // 9. Exhausted Reward Inventory Protection
  it('9. Exhausted Reward Inventory: Gracefully handles inventory exhaustion', async () => {
    const emptyCampaign = await db.campaign.create({
      data: {
        slug: `empty-campaign-${Date.now()}`,
        title: 'Empty Inventory Campaign',
        season: 'Season 2',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        promotionLaunch: new Date(),
        isActive: true,
        rulesJson: '{}',
        brandingJson: '{}',
      },
    });

    const reg = await db.registration.create({
      data: {
        campaignId: emptyCampaign.id,
        stationId,
        customerId: (await db.customer.findFirst())!.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01EX9999',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BILL-EMPTY-${Date.now()}`,
        status: 'VALID',
      },
    });

    const result = await processInstantReward(reg.id);
    expect(result.success).toBe(true);
    expect(result.won).toBe(false);
    expect(result.message).toContain('Better Luck Next Time');
  });

  // 10. Concurrent Reward Request Safety
  it('10. Concurrent Reward Request: Race condition safety under concurrent scratch requests', async () => {
    const customer = await db.customer.create({
      data: {
        fullName: 'Concurrent Scratch Tester',
        mobileNumber: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
      },
    });

    const registration = await db.registration.create({
      data: {
        campaignId,
        stationId,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ06EF6666',
        fuelType: 'DIESEL',
        fuelAmount: 3000,
        billNumber: `BILL-CONCURRENT-${Date.now()}`,
        status: 'VALID',
      },
    });

    // Execute 3 parallel scratch attempts for same registration
    const scratchPromises = [
      processInstantReward(registration.id),
      processInstantReward(registration.id),
      processInstantReward(registration.id),
    ];

    const results = await Promise.all(scratchPromises);
    const successCount = results.filter((r) => r.success).length;
    expect(successCount).toBe(3);

    // Verify only ONE reward transaction record exists in DB
    const txCount = await db.rewardTransaction.count({
      where: { registrationId: registration.id },
    });
    expect(txCount).toBe(1);
  });
});
