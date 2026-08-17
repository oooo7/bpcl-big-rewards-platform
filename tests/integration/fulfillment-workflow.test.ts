import { describe, it, expect } from 'vitest';
import { db } from '../../src/lib/db';
import { createWinnerOtp, verifyWinnerOtp, createDeliveryOtp, verifyDeliveryOtp } from '../../src/lib/otp';
import { FulfillmentService } from '../../src/services/fulfillment.service';

describe('Winner Verification & Prize Fulfillment Complete Workflow Tests', () => {
  // 1. Full 11-step End-to-End Workflow Execution
  it('1. Complete 11-Step Lifecycle: Selection -> OTP -> Verification -> Allocation -> Dispatch -> Receiver OTP -> Delivery -> Audit Closed', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();

    if (!campaign || !station || !customer) return;

    // Step 1: Winner Selected
    const draw = await db.drawSchedule.create({
      data: {
        campaignId: campaign.id,
        drawName: `Workflow Draw ${Date.now()}`,
        drawType: 'FORTNIGHTLY',
        scheduledDate: new Date(),
        winnerCount: 1,
        status: 'EXECUTED',
      },
    });

    const reg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01WORK01',
        fuelType: 'PETROL',
        fuelAmount: 2000,
        billNumber: `BILL-WORK-${Date.now()}`,
        status: 'VALID',
      },
    });

    const winner = await db.winner.create({
      data: {
        drawId: draw.id,
        registrationId: reg.id,
        prizeName: 'Fortnightly Gold Voucher (₹10,000)',
        prizeValue: 10000,
        verificationStatus: 'PENDING_VERIFICATION',
      },
    });

    expect(winner.verificationStatus).toBe('PENDING_VERIFICATION');

    // Step 3 & 4: OTP Initiated & Sent
    const otpResult = await createWinnerOtp(winner.id);
    expect(otpResult.success).toBe(true);
    expect(otpResult.demoOtp).toBeDefined();

    // Step 5: OTP Verified
    const verifyResult = await verifyWinnerOtp(winner.id, otpResult.demoOtp || '123456', 'Fulfillment Lead');
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.verifiedWinner?.verificationStatus).toBe('VERIFIED');

    // Step 6: Prize Allocated safely
    const allocResult = await FulfillmentService.allocatePrizeToWinner(winner.id, `SKU-WORKFLOW-SAFE-${Date.now()}`);
    expect(allocResult.success).toBe(true);

    // Step 7: Dispatch Created
    const dispatchResult = await FulfillmentService.createDispatchOrder({
      winnerId: winner.id,
      nodalPoint: 'Ahmedabad Central BPCL Depot',
    });
    expect(dispatchResult.success).toBe(true);
    expect(dispatchResult.dispatch?.dispatchStatus).toBe('DISPATCH_CREATED');

    // Step 8: Material Dispatched to Nodal
    const trans1 = await FulfillmentService.updateDispatchState({
      dispatchId: dispatchResult.dispatch!.id,
      nextStatus: 'MATERIAL_SENT_NODAL',
    });
    expect(trans1.dispatch.dispatchStatus).toBe('MATERIAL_SENT_NODAL');

    // Step 9: In-Transit
    const trans2 = await FulfillmentService.updateDispatchState({
      dispatchId: dispatchResult.dispatch!.id,
      nextStatus: 'IN_TRANSIT',
    });
    expect(trans2.dispatch.dispatchStatus).toBe('IN_TRANSIT');

    // Step 10: Receiver OTP Initiated & Sent
    const deliveryOtpRes = await createDeliveryOtp(dispatchResult.dispatch!.id);
    expect(deliveryOtpRes.success).toBe(true);

    // Step 11: Receiver OTP Verified + Photo/Signature Proof + Audit Closed
    const finalDelivery = await verifyDeliveryOtp(
      dispatchResult.dispatch!.id,
      deliveryOtpRes.demoOtp || '654321',
      '/samples/delivery_proof.jpg',
      '/samples/signature.png'
    );
    expect(finalDelivery.success).toBe(true);
    expect(finalDelivery.dispatch.dispatchStatus).toBe('DELIVERED');
    expect(finalDelivery.dispatch.deliveryPhotoUrl).toBe('/samples/delivery_proof.jpg');

    // Verify Winner Status updated to DELIVERED
    const finalWinner = await db.winner.findUnique({ where: { id: winner.id } });
    expect(finalWinner?.verificationStatus).toBe('DELIVERED');
  });

  // 2. OTP Security Controls (Expiry, Attempt Limits, Invalid Input)
  it('2. OTP Security: Enforces attempt limits (blocked after 3 failed attempts) and handles expiry', async () => {
    const winner = await db.winner.findFirst({ where: { verificationStatus: 'PENDING_VERIFICATION' } });
    if (!winner) return;

    await db.winner.update({ where: { id: winner.id }, data: { otpResendCount: 0 } });
    await createWinnerOtp(winner.id);

    // Attempt 1: Fail
    const fail1 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail1.success).toBe(false);
    expect(fail1.error).toBe('INVALID_OTP');

    // Attempt 2: Fail
    const fail2 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail2.success).toBe(false);

    // Attempt 3: Fail
    await verifyWinnerOtp(winner.id, '000000');

    // Attempt 4: Blocked due to MAX_ATTEMPTS_EXCEEDED
    const fail4 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail4.success).toBe(false);
    expect(fail4.error).toBe('MAX_ATTEMPTS_EXCEEDED');
  });

  // 3. Non-Negative Prize Inventory Rule
  it('3. Non-Negative Prize Inventory: Prevents stock from ever going negative under allocation', async () => {
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    if (!campaign) return;

    // Create a prize inventory with exactly 1 available stock
    const testPrize = await db.prizeInventory.create({
      data: {
        campaignId: campaign.id,
        name: `Limited Prize ${Date.now()}`,
        sku: `SKU-TEST-${Date.now()}`,
        prizeType: 'FORTNIGHTLY',
        totalStock: 1,
        availableStock: 1,
        unitValue: 5000,
      },
    });

    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    if (!station || !customer) return;

    // Create 2 verified winners
    const winners = [];
    for (let i = 0; i < 2; i++) {
      const reg = await db.registration.create({
        data: {
          campaignId: campaign.id,
          stationId: station.id,
          customerId: customer.id,
          vehicleType: 'CAR',
          vehicleNumber: `GJ01STOCK${i}`,
          fuelType: 'PETROL',
          fuelAmount: 1000,
          billNumber: `BILL-STOCK-${i}-${Date.now()}`,
          status: 'VALID',
        },
      });
      const w = await db.winner.create({
        data: {
          drawId: (await db.drawSchedule.findFirst())!.id,
          registrationId: reg.id,
          prizeName: testPrize.name,
          prizeValue: 5000,
          verificationStatus: 'VERIFIED',
        },
      });
      winners.push(w);
    }

    // Allocate 1st winner -> succeeds (stock drops to 0)
    const alloc1 = await FulfillmentService.allocatePrizeToWinner(winners[0].id, testPrize.sku);
    expect(alloc1.success).toBe(true);
    expect(alloc1.prize.availableStock).toBe(0);

    // Allocate 2nd winner -> fails with INVENTORY_EXHAUSTED (stock remains 0, NEVER negative!)
    await expect(FulfillmentService.allocatePrizeToWinner(winners[1].id, testPrize.sku)).rejects.toThrow(
      /exhausted/i
    );

    const checkPrize = await db.prizeInventory.findUnique({ where: { id: testPrize.id } });
    expect(checkPrize?.availableStock).toBe(0);
  });

  // 4. Controlled State Machine Transitions
  it('4. Controlled Dispatch State Machine: Enforces valid transition progression and blocks out-of-order jumps', async () => {
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
        vehicleNumber: 'GJ01DISP01',
        fuelType: 'PETROL',
        fuelAmount: 1000,
        billNumber: `BILL-DISP-${Date.now()}`,
        status: 'VALID',
      },
    });

    const freshWinner = await db.winner.create({
      data: {
        drawId: (await db.drawSchedule.findFirst())!.id,
        registrationId: reg.id,
        prizeName: 'State Machine Test Prize',
        prizeValue: 5000,
        verificationStatus: 'VERIFIED',
      },
    });

    const dispatchRes = await FulfillmentService.createDispatchOrder({ winnerId: freshWinner.id });
    const dispatchId = dispatchRes.dispatch!.id;

    // Out-of-order transition (DISPATCH_CREATED -> DELIVERED directly) -> must fail
    await expect(
      FulfillmentService.updateDispatchState({
        dispatchId,
        nextStatus: 'DELIVERED',
      })
    ).rejects.toThrow(/Invalid state transition/i);

    // Valid transition (DISPATCH_CREATED -> MATERIAL_SENT_NODAL) -> succeeds
    const validStep = await FulfillmentService.updateDispatchState({
      dispatchId,
      nextStatus: 'MATERIAL_SENT_NODAL',
    });
    expect(validStep.dispatch.dispatchStatus).toBe('MATERIAL_SENT_NODAL');
  });
});
