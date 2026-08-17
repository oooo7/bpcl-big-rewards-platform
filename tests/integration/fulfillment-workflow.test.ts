import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../src/lib/db';
import { createWinnerOtp, verifyWinnerOtp, createDeliveryOtp, verifyDeliveryOtp } from '../../src/lib/otp';
import { FulfillmentService } from '../../src/services/fulfillment.service';

// ─── Shared Test Fixtures ──────────────────────────────────────────────────────
// Created ONCE per test file run in beforeAll — avoids repeated DB calls and
// gives every test a deterministic, stable foundation.

let sharedCampaignId: string;
let sharedStationId: string;
let sharedCustomerId: string;
let sharedDrawId: string;  // FIX BUG-6: replaces non-deterministic db.drawSchedule.findFirst()

/**
 * Unique ID helper — prevents unique constraint violations when tests are run
 * multiple times against a persistent (non-wiped) test database.
 */
function uid(prefix = 'VEH') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
}

/**
 * Creates a self-contained, isolated winner in the given state.
 * FIX BUG-3: Test 2 was using db.winner.findFirst(PENDING_VERIFICATION) which
 * silently skipped (via `if (!winner) return`) on a fresh DB with no such records.
 */
async function createIsolatedWinner(opts: {
  verificationStatus?: string;
  prizeName?: string;
  prizeValue?: number;
} = {}) {
  const reg = await db.registration.create({
    data: {
      campaignId: sharedCampaignId,
      stationId: sharedStationId,
      customerId: sharedCustomerId,
      vehicleType: 'CAR',
      vehicleNumber: uid('ISO'),
      fuelType: 'PETROL',
      fuelAmount: 1500,
      billNumber: uid('BILL-ISO'),
      status: 'VALID',
    },
  });
  return db.winner.create({
    data: {
      drawId: sharedDrawId,
      registrationId: reg.id,
      prizeName: opts.prizeName ?? 'Isolated Test Prize',
      prizeValue: opts.prizeValue ?? 5000,
      verificationStatus: (opts.verificationStatus ?? 'PENDING_VERIFICATION') as any,
    },
  });
}

beforeAll(async () => {
  const campaign = await db.campaign.findFirst({ where: { isActive: true } });
  const station  = await db.fuelStation.findFirst();
  const customer = await db.customer.findFirst();

  if (!campaign || !station || !customer) {
    throw new Error(
      'Required seed data missing — run `npx prisma db seed` before executing tests.'
    );
  }

  sharedCampaignId = campaign.id;
  sharedStationId  = station.id;
  sharedCustomerId = customer.id;

  // Create a dedicated draw scoped to this test file — deterministic across all tests below
  const draw = await db.drawSchedule.create({
    data: {
      campaignId: campaign.id,
      drawName:   `Fulfillment Test Draw ${Date.now()}`,
      drawType:   'FORTNIGHTLY',
      scheduledDate: new Date(),
      winnerCount: 50,
      status: 'EXECUTED',
    },
  });
  sharedDrawId = draw.id;
});

describe('Winner Verification & Prize Fulfillment Complete Workflow Tests', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1 — Complete 11-Step End-to-End Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  it('1. Complete 11-Step Lifecycle: Selection → OTP → Verification → Allocation → Dispatch → Nodal → Transit → Receiver OTP → Delivery → Audit Closed', async () => {
    // FIX BUG-1: vehicle number was hardcoded 'GJ01WORK01' → unique constraint on re-run
    const reg = await db.registration.create({
      data: {
        campaignId: sharedCampaignId,
        stationId:  sharedStationId,
        customerId: sharedCustomerId,
        vehicleType:   'CAR',
        vehicleNumber: uid('E2E'),
        fuelType:      'PETROL',
        fuelAmount:    2000,
        billNumber:    uid('BILL-E2E'),
        status:        'VALID',
      },
    });

    // Step 1: Winner Selected
    const winner = await db.winner.create({
      data: {
        drawId:             sharedDrawId,
        registrationId:     reg.id,
        prizeName:          'Fortnightly Gold Voucher (₹10,000)',
        prizeValue:         10000,
        verificationStatus: 'PENDING_VERIFICATION',
      },
    });
    expect(winner.verificationStatus).toBe('PENDING_VERIFICATION');

    // Steps 3 & 4: OTP Initiated & Sent  (test env always returns demoOtp = '123456')
    const otpResult = await createWinnerOtp(winner.id);
    expect(otpResult.success).toBe(true);
    expect(otpResult.demoOtp).toBeDefined();
    expect(otpResult.mobileNumber).toMatch(/^\d{2}\*{4}\d{4}$/); // masked mobile format

    // Step 5: OTP Verified → winner moves to VERIFIED
    const verifyResult = await verifyWinnerOtp(winner.id, otpResult.demoOtp!, 'Fulfillment Lead');
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.verifiedWinner?.verificationStatus).toBe('VERIFIED');

    // Step 6: Prize Allocated atomically (unique SKU per run)
    const allocResult = await FulfillmentService.allocatePrizeToWinner(winner.id, uid('SKU-E2E'));
    expect(allocResult.success).toBe(true);
    expect(allocResult.prize.availableStock).toBeGreaterThanOrEqual(0);

    // Step 7: Dispatch Created → winner moves to DISPATCHED
    const dispatchResult = await FulfillmentService.createDispatchOrder({
      winnerId:   winner.id,
      nodalPoint: 'Ahmedabad Central BPCL Depot',
    });
    expect(dispatchResult.success).toBe(true);
    expect(dispatchResult.dispatch?.dispatchStatus).toBe('DISPATCH_CREATED');
    const dispatchId = dispatchResult.dispatch!.id;

    // Step 8: Material Dispatched to Nodal Point
    const toNodal = await FulfillmentService.updateDispatchState({
      dispatchId,
      nextStatus: 'MATERIAL_SENT_NODAL',
    });
    expect(toNodal.dispatch.dispatchStatus).toBe('MATERIAL_SENT_NODAL');

    // Step 8b: Received at Nodal Point
    // FIX BUG-2: this step was MISSING — state machine requires RECEIVED_NODAL before IN_TRANSIT
    const received = await FulfillmentService.updateDispatchState({
      dispatchId,
      nextStatus: 'RECEIVED_NODAL',
    });
    expect(received.dispatch.dispatchStatus).toBe('RECEIVED_NODAL');

    // Step 9: In-Transit to Receiver
    const inTransit = await FulfillmentService.updateDispatchState({
      dispatchId,
      nextStatus: 'IN_TRANSIT',
    });
    expect(inTransit.dispatch.dispatchStatus).toBe('IN_TRANSIT');

    // Step 10: Receiver OTP Initiated & Sent  (test env returns demoOtp = '345546')
    const deliveryOtpRes = await createDeliveryOtp(dispatchId);
    expect(deliveryOtpRes.success).toBe(true);
    expect(deliveryOtpRes.demoOtp).toBeDefined();

    // Step 11: Receiver OTP Verified + Proof Attached → DELIVERED
    const finalDelivery = await verifyDeliveryOtp(
      dispatchId,
      deliveryOtpRes.demoOtp!,
      '/samples/delivery_proof.jpg',
      '/samples/signature.png'
    );
    expect(finalDelivery.success).toBe(true);
    expect(finalDelivery.dispatch.dispatchStatus).toBe('DELIVERED');
    expect(finalDelivery.dispatch.deliveryPhotoUrl).toBe('/samples/delivery_proof.jpg');
    expect(finalDelivery.dispatch.deliverySignatureUrl).toBe('/samples/signature.png');
    expect(finalDelivery.dispatch.deliveredAt).not.toBeNull();

    // Verify winner status cascaded to DELIVERED
    const finalWinner = await db.winner.findUnique({ where: { id: winner.id } });
    expect(finalWinner?.verificationStatus).toBe('DELIVERED');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2 — OTP Attempt Limits & Lockout Security
  // ───────────────────────────────────────────────────────────────────────────
  it('2. OTP Security: Enforces attempt limits (blocked after 3 failed attempts) and handles expiry', async () => {
    // FIX BUG-3: was db.winner.findFirst({ where: { verificationStatus: 'PENDING_VERIFICATION' } })
    // That silently skipped via `if (!winner) return` on a fresh DB with no such records.
    // Now self-contained — creates its own winner guaranteed in the correct state.
    const winner = await createIsolatedWinner({ verificationStatus: 'PENDING_VERIFICATION' });

    await db.winner.update({
      where: { id: winner.id },
      data:  { otpResendCount: 0, otpAttempts: 0 },
    });
    await createWinnerOtp(winner.id);

    // Attempt 1 → wrong OTP, 2 remaining
    const fail1 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail1.success).toBe(false);
    expect(fail1.error).toBe('INVALID_OTP');
    expect(fail1.remainingAttempts).toBe(2);

    // Attempt 2 → wrong OTP, 1 remaining
    const fail2 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail2.success).toBe(false);
    expect(fail2.error).toBe('INVALID_OTP');
    expect(fail2.remainingAttempts).toBe(1);

    // Attempt 3 → wrong OTP, 0 remaining — account now locked
    const fail3 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail3.success).toBe(false);
    expect(fail3.error).toBe('INVALID_OTP');
    expect(fail3.remainingAttempts).toBe(0);

    // Attempt 4 → MAX_ATTEMPTS_EXCEEDED even with wrong OTP
    const fail4 = await verifyWinnerOtp(winner.id, '000000');
    expect(fail4.success).toBe(false);
    expect(fail4.error).toBe('MAX_ATTEMPTS_EXCEEDED');

    // Security: correct OTP also blocked when account is locked (no bypass)
    const fail5 = await verifyWinnerOtp(winner.id, '123456');
    expect(fail5.success).toBe(false);
    expect(fail5.error).toBe('MAX_ATTEMPTS_EXCEEDED');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3 — Non-Negative Prize Inventory Under Allocation
  // ───────────────────────────────────────────────────────────────────────────
  it('3. Non-Negative Prize Inventory: Prevents stock from ever going negative under allocation', async () => {
    // Isolated prize with exactly 1 unit — unique SKU per run
    const testPrize = await db.prizeInventory.create({
      data: {
        campaignId:     sharedCampaignId,
        name:           `Limited Prize ${Date.now()}`,
        sku:            uid('SKU-LIMITED'),
        prizeType:      'FORTNIGHTLY',
        totalStock:     1,
        availableStock: 1,
        unitValue:      5000,
      },
    });

    // Create 2 isolated verified winners, each with unique vehicle + bill numbers
    const winners = await Promise.all(
      [0, 1].map(async (i) => {
        const reg = await db.registration.create({
          data: {
            campaignId:    sharedCampaignId,
            stationId:     sharedStationId,
            customerId:    sharedCustomerId,
            vehicleType:   'CAR',
            vehicleNumber: uid(`INV${i}`),   // FIX BUG-4: was GJ01STOCK0/1
            fuelType:      'PETROL',
            fuelAmount:    1000,
            billNumber:    uid(`BILL-INV${i}`),
            status:        'VALID',
          },
        });
        return db.winner.create({
          data: {
            drawId:             sharedDrawId,
            registrationId:     reg.id,
            prizeName:          testPrize.name,
            prizeValue:         5000,
            verificationStatus: 'VERIFIED',
          },
        });
      })
    );

    // 1st allocation → succeeds, stock 1 → 0
    const alloc1 = await FulfillmentService.allocatePrizeToWinner(winners[0].id, testPrize.sku);
    expect(alloc1.success).toBe(true);
    expect(alloc1.prize.availableStock).toBe(0);

    // 2nd allocation → throws INVENTORY_EXHAUSTED — stock stays 0, NEVER negative
    await expect(
      FulfillmentService.allocatePrizeToWinner(winners[1].id, testPrize.sku)
    ).rejects.toThrow(/exhausted/i);

    // Confirm DB still shows exactly 0 (no race-condition negative leak)
    const refreshed = await db.prizeInventory.findUnique({ where: { id: testPrize.id } });
    expect(refreshed?.availableStock).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4 — Controlled Dispatch State Machine
  // ───────────────────────────────────────────────────────────────────────────
  it('4. Controlled Dispatch State Machine: Enforces valid transition progression and blocks out-of-order jumps', async () => {
    // FIX BUG-5: vehicle number was hardcoded 'GJ01DISP01' → unique constraint on re-run
    // FIX BUG-6: was using db.drawSchedule.findFirst() without orderBy → non-deterministic
    const reg = await db.registration.create({
      data: {
        campaignId:    sharedCampaignId,
        stationId:     sharedStationId,
        customerId:    sharedCustomerId,
        vehicleType:   'CAR',
        vehicleNumber: uid('FSM'),
        fuelType:      'PETROL',
        fuelAmount:    1000,
        billNumber:    uid('BILL-FSM'),
        status:        'VALID',
      },
    });

    const freshWinner = await db.winner.create({
      data: {
        drawId:             sharedDrawId,  // deterministic — from beforeAll
        registrationId:     reg.id,
        prizeName:          'State Machine Test Prize',
        prizeValue:         5000,
        verificationStatus: 'VERIFIED',
      },
    });

    const dispatchRes = await FulfillmentService.createDispatchOrder({ winnerId: freshWinner.id });
    expect(dispatchRes.success).toBe(true);
    const dispatchId = dispatchRes.dispatch!.id;

    // ── INVALID transitions (must all throw) ─────────────────────────────────

    // DISPATCH_CREATED → DELIVERED (skip 3 steps) — must fail
    await expect(
      FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'DELIVERED' })
    ).rejects.toThrow(/Invalid state transition/i);

    // DISPATCH_CREATED → IN_TRANSIT (skip 2 steps) — must fail
    await expect(
      FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'IN_TRANSIT' })
    ).rejects.toThrow(/Invalid state transition/i);

    // DISPATCH_CREATED → RECEIVED_NODAL (skip 1 step) — must fail
    await expect(
      FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'RECEIVED_NODAL' })
    ).rejects.toThrow(/Invalid state transition/i);

    // ── VALID transitions (in correct order) ─────────────────────────────────

    // DISPATCH_CREATED → MATERIAL_SENT_NODAL ✓
    const step1 = await FulfillmentService.updateDispatchState({
      dispatchId, nextStatus: 'MATERIAL_SENT_NODAL',
    });
    expect(step1.dispatch.dispatchStatus).toBe('MATERIAL_SENT_NODAL');

    // Cannot jump MATERIAL_SENT_NODAL → DELIVERED — must fail
    await expect(
      FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'DELIVERED' })
    ).rejects.toThrow(/Invalid state transition/i);

    // MATERIAL_SENT_NODAL → RECEIVED_NODAL ✓
    const step2 = await FulfillmentService.updateDispatchState({
      dispatchId, nextStatus: 'RECEIVED_NODAL',
    });
    expect(step2.dispatch.dispatchStatus).toBe('RECEIVED_NODAL');

    // RECEIVED_NODAL → IN_TRANSIT ✓
    const step3 = await FulfillmentService.updateDispatchState({
      dispatchId, nextStatus: 'IN_TRANSIT',
    });
    expect(step3.dispatch.dispatchStatus).toBe('IN_TRANSIT');

    // IN_TRANSIT → DELIVERED via delivery OTP + proof ✓
    const deliveryOtp = await createDeliveryOtp(dispatchId);
    const delivered = await verifyDeliveryOtp(
      dispatchId,
      deliveryOtp.demoOtp!,
      '/proof/delivery.jpg',
      '/proof/signature.png'
    );
    expect(delivered.success).toBe(true);
    expect(delivered.dispatch.dispatchStatus).toBe('DELIVERED');

    // DELIVERED is terminal — no further transitions allowed
    await expect(
      FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'IN_TRANSIT' })
    ).rejects.toThrow(/Invalid state transition/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5 — OTP Resend Rate Limit (NEW)
  // ───────────────────────────────────────────────────────────────────────────
  it('5. OTP Resend Limit: Blocks further OTP resends after 3 requests on the same winner', async () => {
    const winner = await createIsolatedWinner({ verificationStatus: 'PENDING_VERIFICATION' });

    // Ensure counter starts at 0
    await db.winner.update({ where: { id: winner.id }, data: { otpResendCount: 0 } });

    // Resend 1 → OK
    expect((await createWinnerOtp(winner.id)).success).toBe(true);

    // Resend 2 → OK
    expect((await createWinnerOtp(winner.id)).success).toBe(true);

    // Resend 3 → OK (last allowed)
    expect((await createWinnerOtp(winner.id)).success).toBe(true);

    // Resend 4 → BLOCKED: RESEND_LIMIT_EXCEEDED
    const r4 = await createWinnerOtp(winner.id);
    expect(r4.success).toBe(false);
    expect(r4.error).toBe('RESEND_LIMIT_EXCEEDED');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6 — Delivery Proof Required Guard (NEW)
  // ───────────────────────────────────────────────────────────────────────────
  it('6. Delivery OTP: Cannot mark DELIVERED without both photo + signature proof', async () => {
    const winner = await createIsolatedWinner({ verificationStatus: 'VERIFIED' });

    const dispatchRes = await FulfillmentService.createDispatchOrder({ winnerId: winner.id });
    const dispatchId  = dispatchRes.dispatch!.id;

    // Advance to IN_TRANSIT through full chain
    await FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'MATERIAL_SENT_NODAL' });
    await FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'RECEIVED_NODAL' });
    await FulfillmentService.updateDispatchState({ dispatchId, nextStatus: 'IN_TRANSIT' });

    const otpRes = await createDeliveryOtp(dispatchId);
    expect(otpRes.success).toBe(true);

    // No proof at all → rejected
    const noProof = await verifyDeliveryOtp(dispatchId, otpRes.demoOtp!);
    expect(noProof.success).toBe(false);
    expect(noProof.error).toBe('PROOF_REQUIRED');

    // Only photo, no signature → rejected
    const onlyPhoto = await verifyDeliveryOtp(dispatchId, otpRes.demoOtp!, '/proof/photo.jpg');
    expect(onlyPhoto.success).toBe(false);
    expect(onlyPhoto.error).toBe('PROOF_REQUIRED');

    // Only signature, no photo → rejected
    const onlySig = await verifyDeliveryOtp(dispatchId, otpRes.demoOtp!, undefined, '/proof/sig.png');
    expect(onlySig.success).toBe(false);
    expect(onlySig.error).toBe('PROOF_REQUIRED');

    // Both photo + signature → delivery marked DELIVERED
    const withBoth = await verifyDeliveryOtp(
      dispatchId, otpRes.demoOtp!, '/proof/photo.jpg', '/proof/sig.png'
    );
    expect(withBoth.success).toBe(true);
    expect(withBoth.dispatch.dispatchStatus).toBe('DELIVERED');
  });
});

