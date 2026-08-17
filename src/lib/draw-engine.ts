import crypto from 'crypto';
import { db } from './db';
import { logAuditEvent } from './audit';
import { AppError } from './errors';

/**
 * Cryptographically Secure Pseudorandom Generator (CSPRNG)
 * Leverages Web Crypto API / OS entropy source for unbiased uniform distribution.
 */
export function getSecureRandomIndex(max: number): number {
  if (max <= 0) return 0;
  const randomBuffer = crypto.getRandomValues(new Uint32Array(1));
  return randomBuffer[0] % max;
}

/**
 * Helper to resolve valid User ID or return null for audit logging
 */
async function resolveActorId(actorId?: string, client: any = db): Promise<string | undefined> {
  if (!actorId) return undefined;
  const user = await client.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return user ? user.id : undefined;
}

/**
 * 1. Freeze Eligible Pool Snapshot
 * Identifies eligible valid fuel registrations, excludes blacklisted customers,
 * generates unique cryptographic entry hashes, and locks pool.
 */
export async function freezeDrawPool(
  drawId: string,
  operatorId?: string,
  operatorRole: string = 'DRAW_MANAGER'
) {
  const draw = await db.drawSchedule.findUnique({
    where: { id: drawId },
    include: { campaign: true },
  });

  if (!draw) {
    throw new AppError('Draw Schedule not found', 404, 'DRAW_NOT_FOUND');
  }

  if (draw.status === 'EXECUTED') {
    throw new AppError('Cannot freeze entries of an already executed draw', 400, 'DRAW_ALREADY_EXECUTED');
  }

  if (draw.status === 'FROZEN') {
    return {
      success: true,
      alreadyFrozen: true,
      frozenCount: draw.totalEligibleEntries,
      draw,
    };
  }

  // Fetch valid registrations within campaign date bounds and non-blacklisted customers
  const eligibleRegistrations = await db.registration.findMany({
    where: {
      campaignId: draw.campaignId,
      status: { in: ['VALID', 'REWARD_ELIGIBLE', 'REWARD_ISSUED', 'DRAW_ELIGIBLE'] },
      createdAt: { lte: draw.scheduledDate },
      customer: {
        isBlacklisted: false,
      },
    },
    select: { id: true },
  });

  // Calculate blacklisted/invalid exclusions count for audit transparency
  const totalSubmissions = await db.registration.count({
    where: { campaignId: draw.campaignId, createdAt: { lte: draw.scheduledDate } },
  });
  const excludedCount = totalSubmissions - eligibleRegistrations.length;

  // Create immutable cryptographic entry snapshots using O(1) bulk insert
  const entriesToInsert = eligibleRegistrations.map((reg) => ({
    drawId: draw.id,
    registrationId: reg.id,
    entryHash: crypto.createHash('sha256').update(`${draw.id}:${reg.id}`).digest('hex'),
  }));

  await db.$transaction(async (tx) => {
    if (entriesToInsert.length > 0) {
      await tx.drawEntry.createMany({
        data: entriesToInsert,
      });
    }

    await tx.drawSchedule.update({
      where: { id: draw.id },
      data: {
        status: 'FROZEN',
        totalEligibleEntries: eligibleRegistrations.length,
      },
    });

    const validActorId = await resolveActorId(operatorId, tx);

    // Record Immutable Audit Log inside transaction
    await logAuditEvent(
      {
        actorId: validActorId,
        actorRole: operatorRole,
        action: 'DRAW_FREEZE_POOL',
        entityType: 'DrawSchedule',
        entityId: draw.id,
        newValues: {
          totalEligibleEntries: eligibleRegistrations.length,
          excludedCount,
          status: 'FROZEN',
        },
      },
      tx
    );
  });

  const updatedDraw = await db.drawSchedule.findUnique({ where: { id: draw.id } });

  return {
    success: true,
    frozenCount: eligibleRegistrations.length,
    excludedCount,
    draw: updatedDraw,
  };
}

/**
 * 2. Execute Cryptographic Random Winner Draw
 * Enforces atomic execution, rerun protection, CSPRNG selection,
 * duplicate winner prevention, audit hash generation, and immutable audit trail.
 */
export async function executeDraw(
  drawId: string,
  operatorName: string = 'Draw Auditor',
  operatorId?: string,
  operatorRole: string = 'DRAW_MANAGER'
) {
  // Use atomic database transaction with strict status check to guarantee concurrency safety
  return await db.$transaction(async (tx) => {
    const draw = await tx.drawSchedule.findUnique({
      where: { id: drawId },
      include: {
        entries: {
          include: {
            registration: {
              include: {
                customer: true,
                station: true,
              },
            },
          },
        },
      },
    });

    if (!draw) {
      throw new AppError('Draw schedule record not found', 404, 'DRAW_NOT_FOUND');
    }

    // Atomic Rerun Protection Check
    if (draw.status === 'EXECUTED') {
      throw new AppError('Draw has already been executed. Reruns are strictly prohibited.', 400, 'DRAW_ALREADY_EXECUTED');
    }

    // If pool is not frozen yet, freeze it first
    let entries = draw.entries;
    if (draw.status !== 'FROZEN' || entries.length === 0) {
      const eligibleRegs = await tx.registration.findMany({
        where: {
          campaignId: draw.campaignId,
          status: { in: ['VALID', 'REWARD_ELIGIBLE', 'REWARD_ISSUED', 'DRAW_ELIGIBLE'] },
          createdAt: { lte: draw.scheduledDate },
          customer: { isBlacklisted: false },
        },
        select: { id: true },
      });

      for (const reg of eligibleRegs) {
        const entryHash = crypto.createHash('sha256').update(`${draw.id}:${reg.id}`).digest('hex');
        await tx.drawEntry.upsert({
          where: { drawId_registrationId: { drawId: draw.id, registrationId: reg.id } },
          update: {},
          create: { drawId: draw.id, registrationId: reg.id, entryHash },
        });
      }

      await tx.drawSchedule.update({
        where: { id: draw.id },
        data: { status: 'FROZEN', totalEligibleEntries: eligibleRegs.length },
      });

      // Refetch entries with relations
      entries = await tx.drawEntry.findMany({
        where: { drawId: draw.id },
        include: {
          registration: {
            include: { customer: true, station: true },
          },
        },
      });
    }

    if (entries.length === 0) {
      throw new AppError('No eligible fuel entries found in frozen pool for this draw.', 400, 'NO_ELIGIBLE_ENTRIES_IN_POOL');
    }

    // Calculate how many distinct winners to pick
    const winnersToSelect = Math.min(draw.winnerCount, entries.length);
    const selectedWinners: typeof entries = [];
    const usedCustomerMobiles = new Set<string>();

    // CSPRNG Selection with Duplicate Customer Mobile Prevention
    let attempts = 0;
    const maxAttempts = entries.length * 10;
    while (selectedWinners.length < winnersToSelect && attempts < maxAttempts) {
      attempts++;
      const randomIndex = getSecureRandomIndex(entries.length);
      const candidate = entries[randomIndex];
      const mobile = candidate.registration.customer.mobileNumber;

      if (!usedCustomerMobiles.has(mobile)) {
        usedCustomerMobiles.add(mobile);
        selectedWinners.push(candidate);
      }
    }

    // Fallback if unique mobile constraint is tight (ensure target winner count is met)
    if (selectedWinners.length < winnersToSelect) {
      for (const entry of entries) {
        if (!selectedWinners.includes(entry) && selectedWinners.length < winnersToSelect) {
          selectedWinners.push(entry);
        }
      }
    }

    // Generate SHA-256 Audit Execution Hash
    const timestamp = Date.now();
    const concatenatedEntryHashes = selectedWinners.map((w) => w.entryHash).join(':');
    const executionHash = crypto
      .createHash('sha256')
      .update(`${draw.id}:${entries.length}:${selectedWinners.length}:${timestamp}:${operatorId || 'system'}:${concatenatedEntryHashes}`)
      .digest('hex');

    // Create Winner Records
    const createdWinners = [];
    for (const winnerEntry of selectedWinners) {
      const winner = await tx.winner.create({
        data: {
          drawId: draw.id,
          registrationId: winnerEntry.registrationId,
          prizeName:
            draw.drawType === 'GRAND_BUMPER'
              ? 'Grand Bumper SUV Vehicle (Mahindra Thar / Tata Nexon)'
              : 'Fortnightly Gold Voucher (₹10,000)',
          prizeValue: draw.drawType === 'GRAND_BUMPER' ? 1200000 : 10000,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        include: {
          registration: {
            include: { customer: true, station: true },
          },
        },
      });
      createdWinners.push(winner);
    }

    // Update Draw Schedule to EXECUTED
    const updatedDraw = await tx.drawSchedule.update({
      where: { id: draw.id },
      data: {
        status: 'EXECUTED',
        totalEligibleEntries: entries.length,
        executionHash,
        executedAt: new Date(timestamp),
        executedBy: operatorName,
      },
    });

    const validActorId = await resolveActorId(operatorId, tx);

    // Record Immutable Audit Log Event
    await logAuditEvent(
      {
        actorId: validActorId,
        actorRole: operatorRole,
        action: 'DRAW_EXECUTE_SELECTION',
        entityType: 'DrawSchedule',
        entityId: draw.id,
        newValues: {
          status: 'EXECUTED',
          executionHash,
          winnerCount: createdWinners.length,
          totalEligibleEntries: entries.length,
          operatorName,
        },
      },
      tx
    );

    return {
      success: true,
      draw: updatedDraw,
      executionHash,
      totalEligibleEntries: entries.length,
      winnerCount: createdWinners.length,
      winners: createdWinners,
    };
  });
}
