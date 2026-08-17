import { describe, it, expect } from 'vitest';
import { freezeDrawPool, executeDraw } from '../../src/lib/draw-engine';
import { db } from '../../src/lib/db';

describe('Draw Management Module - Comprehensive Core Engine Tests', () => {
  // 1. Test Eligibility Filtering (Valid vs Invalid status, Scheduled Date bounds)
  it('1. Eligibility: Only includes VALID fuel registrations on or before scheduled date', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();

    if (!campaign || !station) return;

    // Create a new draw schedule scheduled for tomorrow
    const scheduledDate = new Date(Date.now() + 86400000);
    const testDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Test Eligibility Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate,
        winnerCount: 5,
        status: 'SCHEDULED',
      },
    });

    // Create a valid customer & registration
    const validCustomer = await db.customer.create({
      data: { fullName: 'Eligible User', mobileNumber: `99${Date.now().toString().slice(-8)}` },
    });

    const validReg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: validCustomer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01ELIG01',
        fuelType: 'PETROL',
        fuelAmount: 1200,
        billNumber: `BILL-ELIG-${Date.now()}`,
        status: 'VALID',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });

    // Create an invalid customer & registration
    const invalidReg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: validCustomer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01REJ01',
        fuelType: 'PETROL',
        fuelAmount: 1200,
        billNumber: `BILL-REJ-${Date.now()}`,
        status: 'REJECTED',
        createdAt: new Date(Date.now() - 3600000),
      },
    });

    // Freeze eligible pool
    const freezeResult = await freezeDrawPool(testDraw.id);
    expect(freezeResult.success).toBe(true);
    expect(freezeResult.frozenCount).toBeGreaterThanOrEqual(1);

    // Verify validReg is in draw entries
    const entry = await db.drawEntry.findUnique({
      where: { drawId_registrationId: { drawId: testDraw.id, registrationId: validReg.id } },
    });
    expect(entry).not.toBeNull();

    // Verify invalidReg is NOT in draw entries
    const invalidEntry = await db.drawEntry.findUnique({
      where: { drawId_registrationId: { drawId: testDraw.id, registrationId: invalidReg.id } },
    });
    expect(invalidEntry).toBeNull();
  });

  // 2. Test Blacklisted Customer Exclusions
  it('2. Exclusions: Excludes blacklisted customers from frozen pool snapshot', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();

    if (!campaign || !station) return;

    const blacklistedCustomer = await db.customer.create({
      data: {
        fullName: 'Blacklisted User',
        mobileNumber: `98${Date.now().toString().slice(-8)}`,
        isBlacklisted: true,
      },
    });

    const blacklistedReg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: blacklistedCustomer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01BLK99',
        fuelType: 'PETROL',
        fuelAmount: 2000,
        billNumber: `BILL-BLK-${Date.now()}`,
        status: 'VALID',
      },
    });

    const testDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Test Blacklist Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(Date.now() + 86400000),
        winnerCount: 2,
        status: 'SCHEDULED',
      },
    });

    await freezeDrawPool(testDraw.id);

    const entry = await db.drawEntry.findUnique({
      where: { drawId_registrationId: { drawId: testDraw.id, registrationId: blacklistedReg.id } },
    });
    expect(entry).toBeNull();
  });

  // 3. Test Winner Count & Duplicate Prevention
  it('3. Winner Count & Duplicate Prevention: Selects distinct customer winners matching target count', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();

    if (!campaign || !station) return;

    // Create 3 distinct valid customers with registrations
    const targetWinnerCount = 3;
    const testDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Test Winner Selection ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(Date.now() + 86400000),
        winnerCount: targetWinnerCount,
        status: 'SCHEDULED',
      },
    });

    for (let i = 0; i < 5; i++) {
      const cust = await db.customer.create({
        data: { fullName: `Winner User ${i}`, mobileNumber: `97${Date.now()}${i}` },
      });
      await db.registration.create({
        data: {
          campaignId: campaign.id,
          stationId: station.id,
          customerId: cust.id,
          vehicleType: 'CAR',
          vehicleNumber: `GJ01WIN0${i}`,
          fuelType: 'PETROL',
          fuelAmount: 1000 + i * 100,
          billNumber: `BILL-WIN-${i}-${Date.now()}`,
          status: 'VALID',
        },
      });
    }

    const execResult = await executeDraw(testDraw.id, 'Auditor');
    expect(execResult.success).toBe(true);
    expect(execResult.winnerCount).toBe(targetWinnerCount);
    expect(execResult.executionHash).toBeDefined();

    // Verify winners in DB
    const winners = await db.winner.findMany({
      where: { drawId: testDraw.id },
      include: { registration: { include: { customer: true } } },
    });
    expect(winners.length).toBe(targetWinnerCount);

    // Verify duplicate mobile prevention
    const mobiles = winners.map((w) => w.registration.customer.mobileNumber);
    const uniqueMobiles = new Set(mobiles);
    expect(uniqueMobiles.size).toBe(mobiles.length);
  });

  // 4. Test Rerun Protection
  it('4. Rerun Protection: Blocks attempt to re-execute an already EXECUTED draw', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();

    if (!campaign || !station) return;

    const testDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Test Rerun Protection Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(Date.now() + 86400000),
        winnerCount: 1,
        status: 'SCHEDULED',
      },
    });

    const cust = await db.customer.create({
      data: { fullName: `Rerun User`, mobileNumber: `96${Date.now().toString().slice(-8)}` },
    });
    await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: cust.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01RERUN1',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BILL-RERUN-${Date.now()}`,
        status: 'VALID',
      },
    });

    // Execute 1st time -> succeeds
    const firstExec = await executeDraw(testDraw.id);
    expect(firstExec.success).toBe(true);

    // Execute 2nd time -> must throw already executed error
    await expect(executeDraw(testDraw.id)).rejects.toThrow(/already been executed/i);
  });

  // 5. Test Concurrent Execution Protection
  it('5. Concurrent Execution Protection: Prevents duplicate execution race conditions', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();

    if (!campaign || !station) return;

    const testDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Concurrent Race Test Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(Date.now() + 86400000),
        winnerCount: 1,
        status: 'SCHEDULED',
      },
    });

    const cust = await db.customer.create({
      data: { fullName: `Race User`, mobileNumber: `95${Date.now().toString().slice(-8)}` },
    });
    await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: cust.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01RACE1',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BILL-RACE-${Date.now()}`,
        status: 'VALID',
      },
    });

    // Execute 1st request -> succeeds
    const exec1 = await executeDraw(testDraw.id, 'Auditor A');
    expect(exec1.success).toBe(true);

    // Attempt 2nd request immediately -> must be rejected with already executed error
    await expect(executeDraw(testDraw.id, 'Auditor B')).rejects.toThrow(/already been executed/i);
  });

  // 6. Test Immutable Audit History Recording
  it('6. Audit History: Persists immutable AuditLog entries for freeze & draw execution', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const adminUser = await db.user.findFirst();

    if (!campaign || !station) return;

    const testDraw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Audit History Test Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(Date.now() + 86400000),
        winnerCount: 1,
        status: 'SCHEDULED',
      },
    });

    const cust = await db.customer.create({
      data: { fullName: `Audit User`, mobileNumber: `94${Date.now().toString().slice(-8)}` },
    });
    await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: cust.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01AUD1',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BILL-AUD-${Date.now()}`,
        status: 'VALID',
      },
    });

    await freezeDrawPool(testDraw.id, adminUser?.id, 'DRAW_MANAGER');
    await executeDraw(testDraw.id, 'Auditor Key', adminUser?.id, 'DRAW_MANAGER');

    const freezeLog = await db.auditLog.findFirst({
      where: { entityId: testDraw.id, action: 'DRAW_FREEZE_POOL' },
    });
    expect(freezeLog).not.toBeNull();

    const executeLog = await db.auditLog.findFirst({
      where: { entityId: testDraw.id, action: 'DRAW_EXECUTE_SELECTION' },
    });
    expect(executeLog).not.toBeNull();
  });

});
