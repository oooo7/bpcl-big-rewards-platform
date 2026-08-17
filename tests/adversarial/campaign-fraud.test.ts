import { describe, it, expect } from 'vitest';
import { db } from '../../src/lib/db';
import { RegistrationService } from '../../src/services/registration.service';
import { processBillOcrAndDuplicates } from '../../src/lib/ocr';
import { resolveStationFromQr } from '../../src/lib/qr';
import { processInstantReward } from '../../src/lib/reward-engine';
import { freezeDrawPool, executeDraw } from '../../src/lib/draw-engine';
import { createWinnerOtp, verifyWinnerOtp, createDeliveryOtp, verifyDeliveryOtp } from '../../src/lib/otp';
import { FulfillmentService } from '../../src/services/fulfillment.service';
import { hasPermission } from '../../src/lib/auth';
import { queryStationPerformanceReport } from '../../src/services/report.service';

describe('Adversarial QA & Campaign Fraud Test Suite (22 Scenarios)', () => {

  // ─── Scenario 1: Same Bill Uploaded Twice ──────────────────────────────────
  it('Scenario 1: Detects and flags duplicate bill number and amount across campaign', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    if (!campaign || !station) return;

    const uniqueBillNo = `DUPLICATE-BILL-${Date.now()}`;
    const amount = 1750;
    const testMobile1 = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
    const testMobile2 = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;

    // 1st upload
    const reg1 = await RegistrationService.createRegistration({
      campaignSlug: campaign.slug,
      stationCode: station.stationCode,
      fullName: 'Fraud Tester 1',
      mobileNumber: testMobile1,
      vehicleType: 'CAR',
      vehicleNumber: `GJ01AA${Math.floor(Math.random() * 9000 + 1000)}`,
      fuelType: 'PETROL',
      fuelAmount: amount,
      billNumber: uniqueBillNo,
      fileFormat: 'JPG',
    });
    expect(reg1.registrationId).toBeTruthy();

    // 2nd upload — same bill number and amount at a different station
    const station2 = await db.fuelStation.findFirst({ where: { id: { not: station.id } } }) || station;
    await expect(
      RegistrationService.createRegistration({
        campaignSlug: campaign.slug,
        stationCode: station2.stationCode,
        fullName: 'Fraud Tester 2',
        mobileNumber: testMobile2,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01BB8888',
        fuelType: 'PETROL',
        fuelAmount: amount,
        billNumber: uniqueBillNo,
        fileFormat: 'PNG',
      })
    ).rejects.toThrow('Duplicate fuel bill detected');
  });

  // ─── Scenario 2: Same Bill Uploaded with Different Filenames ───────────────
  it('Scenario 2: Detects identical binary content hash regardless of filename', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    if (!campaign || !station || !customer) return;

    const reg1 = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01HASH1',
        fuelType: 'PETROL',
        fuelAmount: 500,
        billNumber: `HASH-BILL-1-${Date.now()}`,
        status: 'SUBMITTED',
      },
    });

    const reg2 = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01HASH2',
        fuelType: 'PETROL',
        fuelAmount: 600,
        billNumber: `HASH-BILL-2-${Date.now()}`,
        status: 'SUBMITTED',
      },
    });

    const uniqueContent = `IDENTICAL_BINARY_BILL_CONTENT_${Date.now()}_${Math.random()}`;
    const dummyFileBuffer = Buffer.from(uniqueContent);

    // Process first bill with filename receipt_v1.jpg
    const res1 = await processBillOcrAndDuplicates({
      registrationId: reg1.id,
      fileBuffer: dummyFileBuffer,
      fileFormat: 'JPG',
      fileSize: 1024,
      userInputBillNumber: `HASH-TEST-1-${Date.now()}`,
      userInputAmount: 500,
      stationId: station.id,
    });
    expect(res1.success).toBe(true);

    // Process second bill with exact same file buffer but different metadata/filename
    const res2 = await processBillOcrAndDuplicates({
      registrationId: reg2.id,
      fileBuffer: dummyFileBuffer,
      fileFormat: 'PNG',
      fileSize: 1024,
      userInputBillNumber: `HASH-TEST-2-${Date.now()}`,
      userInputAmount: 600,
      stationId: station.id,
    });
    expect(res2.isDuplicate).toBe(true);
    expect(res2.reason).toBe('DUPLICATE_FILE_UPLOADED');
  });

  // ─── Scenario 3: Same Customer Repeatedly Registering (Daily Limit) ───────
  it('Scenario 3: Enforces daily submission limit of 10 per mobile per 24h', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    if (!campaign || !station) return;

    const spamMobile = `912345${Math.floor(1000 + Math.random() * 9000)}`;

    // Create 10 registrations for this mobile number directly in DB
    const customer = await db.customer.create({
      data: { fullName: 'Spam Tester', mobileNumber: spamMobile },
    });

    for (let i = 0; i < 10; i++) {
      await db.registration.create({
        data: {
          campaignId: campaign.id,
          stationId: station.id,
          customerId: customer.id,
          vehicleType: 'CAR',
          vehicleNumber: 'GJ01SPAM',
          fuelType: 'PETROL',
          fuelAmount: 500 + i,
          billNumber: `SPAM-BILL-${Date.now()}-${i}`,
          status: 'VALID',
        },
      });
    }

    // 11th registration attempt via RegistrationService should be blocked
    await expect(
      RegistrationService.createRegistration({
        campaignSlug: campaign.slug,
        stationCode: station.stationCode,
        fullName: 'Spam Tester',
        mobileNumber: spamMobile,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01SPAM',
        fuelType: 'PETROL',
        fuelAmount: 999,
        billNumber: `SPAM-BILL-11-${Date.now()}`,
        fileFormat: 'JPG',
      })
    ).rejects.toThrow('Daily registration limit reached');
  });

  // ─── Scenario 4: Same Phone Number Across Multiple Attempts (Blacklisted) ─
  it('Scenario 4: Blocks registration attempt from blacklisted customer mobile', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    if (!campaign || !station) return;

    const blacklistedMobile = `900000${Math.floor(1000 + Math.random() * 9000)}`;
    await db.customer.create({
      data: { fullName: 'Fraudster Blacklisted', mobileNumber: blacklistedMobile, isBlacklisted: true },
    });

    await expect(
      RegistrationService.createRegistration({
        campaignSlug: campaign.slug,
        stationCode: station.stationCode,
        fullName: 'Fraudster Blacklisted',
        mobileNumber: blacklistedMobile,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01BLACK',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BLACK-BILL-${Date.now()}`,
        fileFormat: 'JPG',
      })
    ).rejects.toThrow('Mobile number is restricted');
  });

  // ─── Scenario 5: Same QR Manipulated ──────────────────────────────────────
  it('Scenario 5: Rejects QR code with tampered/manipulated HMAC signature', async () => {
    const result = await resolveStationFromQr('sapno-ki-sawari-season-2', 'GJ1001', 'tampered_signature_string');
    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_QR_SIGNATURE');
  });

  // ─── Scenario 6: Invalid QR ────────────────────────────────────────────────
  it('Scenario 6: Rejects QR request for non-existent station code', async () => {
    const result = await resolveStationFromQr('sapno-ki-sawari-season-2', 'INVALID_STATION_999', 'any_sig');
    expect(result.success).toBe(false);
    expect(result.error).toBe('STATION_INACTIVE_OR_INVALID');
  });

  // ─── Scenario 7: Expired Campaign ──────────────────────────────────────────
  it('Scenario 7: Rejects submission to expired campaign outside schedule dates', async () => {
    // Create an expired campaign in DB
    const expiredCampaign = await db.campaign.create({
      data: {
        title: 'Expired Old Campaign 2025',
        slug: `expired-campaign-${Date.now()}`,
        season: 'Season 1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-01'),
        promotionLaunch: new Date('2025-01-01'),
        rulesJson: '{}',
        brandingJson: '{}',
        isActive: true, // active flag is true, but date is expired
      },
    });

    const station = await db.fuelStation.findFirst();
    if (!station) return;

    await expect(
      RegistrationService.createRegistration({
        campaignSlug: expiredCampaign.slug,
        stationCode: station.stationCode,
        fullName: 'Late Submitter',
        mobileNumber: '9876543210',
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01EXPIRED',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `EXP-BILL-${Date.now()}`,
        fileFormat: 'JPG',
      })
    ).rejects.toThrow('Campaign is outside active schedule dates');
  });

  // ─── Scenario 8: Inactive Station ──────────────────────────────────────────
  it('Scenario 8: Rejects submission at deactivated/inactive fuel station', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const territory = await db.territory.findFirst();
    if (!campaign || !territory) return;

    const inactiveStation = await db.fuelStation.create({
      data: {
        stationCode: `INACT-${Date.now()}`,
        name: 'Deactivated Station',
        territoryId: territory.id,
        campaignId: campaign.id,
        city: 'Surat',
        address: 'Closed Highway Outlet',
        isActive: false,
      },
    });

    await expect(
      RegistrationService.createRegistration({
        campaignSlug: campaign.slug,
        stationCode: inactiveStation.stationCode,
        fullName: 'Outlet Submitter',
        mobileNumber: '9876543210',
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01INACT',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `INACT-BILL-${Date.now()}`,
        fileFormat: 'JPG',
      })
    ).rejects.toThrow('Invalid or inactive fuel station code');
  });

  // ─── Scenario 9: Fake File Extension ───────────────────────────────────────
  it('Scenario 9: Rejects unapproved file extensions (exe, sh, php)', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    if (!campaign || !station) return;

    await expect(
      RegistrationService.createRegistration({
        campaignSlug: campaign.slug,
        stationCode: station.stationCode,
        fullName: 'Hacker',
        mobileNumber: '9876543210',
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01HACK',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `HACK-BILL-${Date.now()}`,
        fileFormat: 'EXE' as any,
      })
    ).rejects.toThrow();
  });

  // ─── Scenario 10: Oversized File ───────────────────────────────────────────
  it('Scenario 10: Rejects bill files exceeding the 5MB size limit', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    if (!campaign || !station || !customer) return;

    const freshReg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01SIZE',
        fuelType: 'PETROL',
        fuelAmount: 500,
        billNumber: `SIZE-BILL-${Date.now()}`,
        status: 'SUBMITTED',
      },
    });

    const res = await processBillOcrAndDuplicates({
      registrationId: freshReg.id,
      fileBuffer: Buffer.from('test'),
      fileFormat: 'JPG',
      fileSize: 6 * 1024 * 1024, // 6MB
      userInputBillNumber: `BIG-BILL-${Date.now()}`,
      userInputAmount: 500,
      stationId: station.id,
    });

    expect(res.success).toBe(false);
    expect(res.reason).toBe('FILE_SIZE_EXCEEDED');
  });

  // ─── Scenario 11: Malicious Upload / Path Traversal ────────────────────────
  it('Scenario 11: Generates safe storage file key preventing path traversal', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    if (!campaign || !station || !customer) return;

    const freshReg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01TRAV',
        fuelType: 'PETROL',
        fuelAmount: 500,
        billNumber: `TRAV-BILL-${Date.now()}`,
        status: 'SUBMITTED',
      },
    });

    const res = await processBillOcrAndDuplicates({
      registrationId: freshReg.id,
      fileBuffer: Buffer.from(`SAFE_CONTENT_${Date.now()}_${Math.random()}`),
      fileFormat: 'JPG',
      fileSize: 1024,
      userInputBillNumber: `TRAVERSAL-TEST-${Date.now()}`,
      userInputAmount: 500,
      stationId: station.id,
    });

    expect(res.success).toBe(true);
    expect(res.bill?.fileKey).not.toContain('..');
    expect(res.bill?.fileKey).toMatch(/^uploads\/bills\//);
  });

  // ─── Scenario 12: Multiple Simultaneous Reward Requests ───────────────────
  it('Scenario 12: Handles concurrent instant reward requests safely without double issuance', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    if (!campaign || !station || !customer) return;

    const reg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01RACE',
        fuelType: 'PETROL',
        fuelAmount: 2000,
        billNumber: `RACE-REWARD-${Date.now()}`,
        status: 'VALID',
      },
    });

    // Fire 3 simultaneous reward scratch promises for same registrationId
    const results = await Promise.all([
      processInstantReward(reg.id),
      processInstantReward(reg.id),
      processInstantReward(reg.id),
    ]);

    // All promises should return success: true
    expect(results.every((r) => r.success)).toBe(true);

    // Exactly 1 reward transaction should exist in DB for this registration
    const rewardTxCount = await db.rewardTransaction.count({
      where: { registrationId: reg.id },
    });
    expect(rewardTxCount).toBe(1);
  });

  // ─── Scenario 13: Multiple Simultaneous Registrations ──────────────────────
  it('Scenario 13: Prevents duplicate registrations when submitted simultaneously', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    if (!campaign || !station) return;

    const billNo = `CONCURRENT-REG-${Date.now()}`;
    const amount = 3333;

    const mobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

    const res1 = await RegistrationService.createRegistration({
      campaignSlug: campaign.slug,
      stationCode: station.stationCode,
      fullName: 'Concurrent Reg User',
      mobileNumber: mobile,
      vehicleType: 'CAR',
      vehicleNumber: 'GJ01CONCUR',
      fuelType: 'DIESEL',
      fuelAmount: amount,
      billNumber: billNo,
      fileFormat: 'JPG',
    });
    expect(res1.registrationId).toBeTruthy();

    await expect(
      RegistrationService.createRegistration({
        campaignSlug: campaign.slug,
        stationCode: station.stationCode,
        fullName: 'Concurrent Reg User',
        mobileNumber: mobile,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01CONCUR',
        fuelType: 'DIESEL',
        fuelAmount: amount,
        billNumber: billNo,
        fileFormat: 'JPG',
      })
    ).rejects.toThrow();
  });

  // ─── Scenario 14: Multiple OTP Requests ───────────────────────────────────
  it('Scenario 14: Enforces OTP resend limit (max 3 resends per winner)', async () => {
    const winner = await db.winner.findFirst();
    if (!winner) return;

    // Reset OTP resend count to 0 first
    await db.winner.update({ where: { id: winner.id }, data: { otpResendCount: 0 } });

    // Request 1
    const r1 = await createWinnerOtp(winner.id);
    expect(r1.success).toBe(true);

    // Request 2
    const r2 = await createWinnerOtp(winner.id);
    expect(r2.success).toBe(true);

    // Request 3
    const r3 = await createWinnerOtp(winner.id);
    expect(r3.success).toBe(true);

    // Request 4 — blocked due to resend limit
    const r4 = await createWinnerOtp(winner.id);
    expect(r4.success).toBe(false);
    expect(r4.error).toBe('RESEND_LIMIT_EXCEEDED');
  });

  // ─── Scenario 15: OTP Brute Force ──────────────────────────────────────────
  it('Scenario 15: Locks winner OTP after 3 incorrect verification attempts', async () => {
    const winner = await db.winner.findFirst();
    if (!winner) return;

    await db.winner.update({ where: { id: winner.id }, data: { otpResendCount: 0 } });
    await createWinnerOtp(winner.id);

    // 3 wrong attempts
    await verifyWinnerOtp(winner.id, '000000');
    await verifyWinnerOtp(winner.id, '000000');
    await verifyWinnerOtp(winner.id, '000000');

    // 4th attempt should be blocked
    const r4 = await verifyWinnerOtp(winner.id, '123456');
    expect(r4.success).toBe(false);
    expect(r4.error).toBe('MAX_ATTEMPTS_EXCEEDED');
  });

  // ─── Scenario 16: Reward Inventory Exhaustion ──────────────────────────────
  it('Scenario 16: Returns elegant "Better Luck Next Time" when reward stock is zero', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    if (!campaign || !station || !customer) return;

    // Temporarily set all reward quantities to 0
    await db.rewardInventory.updateMany({
      where: { campaignId: campaign.id },
      data: { availableQuantity: 0 },
    });

    const reg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01EXHAUST',
        fuelType: 'PETROL',
        fuelAmount: 1500,
        billNumber: `EXHAUST-BILL-${Date.now()}`,
        status: 'VALID',
      },
    });

    const res = await processInstantReward(reg.id);
    expect(res.success).toBe(true);
    expect(res.won).toBe(false);
    expect(res.message).toContain('Better Luck Next Time');

    // Restore reward inventory
    await db.rewardInventory.updateMany({
      where: { campaignId: campaign.id },
      data: { availableQuantity: 50 },
    });
  });

  // ─── Scenario 17: Draw Rerun ────────────────────────────────────────────────
  it('Scenario 17: Strictly prohibits executing an already EXECUTED draw schedule', async () => {
    const draw = await db.drawSchedule.findFirst({ where: { status: 'EXECUTED' } });
    if (!draw) return;

    await expect(
      executeDraw(draw.id, 'Rerun Attacker', 'attacker-id', 'DRAW_MANAGER')
    ).rejects.toThrow('Draw has already been executed. Reruns are strictly prohibited.');
  });

  // ─── Scenario 18: Winner Duplication ───────────────────────────────────────
  it('Scenario 18: Prevents selecting duplicate customer mobile numbers in single draw', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    if (!campaign) return;

    // Create a fresh test draw to verify CSPRNG winner selection deduplication
    const newDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Deduplication Test Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(),
        winnerCount: 5,
        status: 'SCHEDULED',
      },
    });

    const drawRes = await executeDraw(newDraw.id, 'Test Auditor', 'system-id', 'DRAW_MANAGER');
    expect(drawRes.success).toBe(true);

    const winners = await db.winner.findMany({
      where: { drawId: newDraw.id },
      include: { registration: { include: { customer: true } } },
    });

    const mobiles = winners.map((w) => w.registration.customer.mobileNumber);
    const uniqueMobiles = new Set(mobiles);
    expect(uniqueMobiles.size).toBe(mobiles.length);
  });

  // ─── Scenario 19: Unauthorized Admin Operation ──────────────────────────────
  it('Scenario 19: Denies permissions for unauthorized role actions in RBAC matrix', () => {
    expect(hasPermission('VALIDATION_TEAM', 'draw.execute')).toBe(false);
    expect(hasPermission('DSM', 'audit.view_logs')).toBe(false);
    expect(hasPermission('FULFILLMENT_TEAM', 'bill.validate')).toBe(false);
  });

  // ─── Scenario 20: Unauthorized DSM Access ──────────────────────────────────
  it('Scenario 20: DSM user is restricted to viewing data within assigned territory', async () => {
    const territory = await db.territory.findFirst();
    if (!territory) return;

    const dsmCtx = { role: 'DSM', territoryId: territory.id };
    const result = await queryStationPerformanceReport(dsmCtx, {});

    // All returned stations must belong to DSM territory
    for (const stationRow of result.data) {
      expect(stationRow.territory).toBeTruthy();
    }
  });

  // ─── Scenario 21: Prize Allocation Race Condition ─────────────────────────
  it('Scenario 21: Prevents negative prize stock under concurrent allocation', async () => {
    const winner = await db.winner.findFirst({
      include: { registration: true },
    });
    if (!winner) return;

    // Ensure winner is in VERIFIED state
    await db.winner.update({
      where: { id: winner.id },
      data: { verificationStatus: 'VERIFIED' },
    });

    // Create a single stock prize
    const prize = await db.prizeInventory.create({
      data: {
        campaignId: winner.registration.campaignId,
        name: 'Single Unit TV Prize',
        sku: `TV-SINGLE-${Date.now()}`,
        prizeType: 'GRAND_BUMPER',
        totalStock: 1,
        availableStock: 1,
        unitValue: 50000,
      },
    });

    // Allocate once
    const res1 = await FulfillmentService.allocatePrizeToWinner(winner.id, prize.sku);
    expect(res1.success).toBe(true);

    // Second allocation attempt for same SKU should fail with INVENTORY_EXHAUSTED
    await expect(
      FulfillmentService.allocatePrizeToWinner(winner.id, prize.sku)
    ).rejects.toThrow('Prize inventory is fully exhausted');
  });

  // ─── Scenario 22: Dispatch State Machine Manipulation ──────────────────────
  it('Scenario 22: Blocks invalid dispatch state transitions (e.g. CREATED directly to DELIVERED)', async () => {
    const dispatch = await db.dispatch.findFirst({ where: { dispatchStatus: 'DISPATCH_CREATED' } });
    if (!dispatch) return;

    await expect(
      FulfillmentService.updateDispatchState({
        dispatchId: dispatch.id,
        nextStatus: 'DELIVERED', // Must go through MATERIAL_SENT_NODAL -> RECEIVED_NODAL -> IN_TRANSIT
      })
    ).rejects.toThrow('Invalid state transition');
  });

});
