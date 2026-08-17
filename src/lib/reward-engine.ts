import crypto from 'crypto';
import { db } from './db';


export async function processInstantReward(registrationId: string) {
  // Fetch registration
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    include: {
      campaign: true,
      reward: true,
    },
  });

  if (!registration) {
    return { success: false, error: 'REGISTRATION_NOT_FOUND' };
  }

  // Idempotent Return: Prevent double issuance if reward is already attached or status is REWARD_ISSUED
  if (registration.reward || registration.status === 'REWARD_ISSUED') {
    const existingTx = registration.reward || await db.rewardTransaction.findUnique({
      where: { registrationId: registration.id },
    });
    return {
      success: true,
      alreadyIssued: true,
      reward: existingTx,
    };
  }

  // Ensure state is VALID or REWARD_ELIGIBLE
  if (registration.status !== 'VALID' && registration.status !== 'REWARD_ELIGIBLE') {
    return { success: false, error: 'REGISTRATION_NOT_ELIGIBLE' };
  }

  // Check inventory with non-negative stock safety
  const availableRewards = await db.rewardInventory.findMany({
    where: {
      campaignId: registration.campaignId,
      availableQuantity: { gt: 0 },
    },
  });

  if (availableRewards.length === 0) {
    return {
      success: true,
      won: false,
      message: 'Better Luck Next Time! You are entered into Fortnightly & Grand Draws.',
    };
  }

  // SECURITY FIX HIGH-08: Use CSPRNG instead of Math.random()
  const rewardToIssue = availableRewards[crypto.randomInt(availableRewards.length)];

  try {
    // Perform atomic transaction
    const result = await db.$transaction(async (tx) => {
      // Decrement inventory
      const updated = await tx.rewardInventory.update({
        where: { id: rewardToIssue.id },
        data: { availableQuantity: { decrement: 1 } },
      });

      if (updated.availableQuantity < 0) {
        throw new Error('INVENTORY_EXHAUSTED');
      }

      const couponCode = `BPCL-${rewardToIssue.rewardType.substring(0, 4)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Create Reward Transaction
      const transaction = await tx.rewardTransaction.create({
        data: {
          registrationId: registration.id,
          rewardId: rewardToIssue.id,
          couponCode,
          status: 'ISSUED',
        },
      });

      // Update registration state to REWARD_ISSUED
      await tx.registration.update({
        where: { id: registration.id },
        data: { status: 'REWARD_ISSUED' },
      });

      return { transaction, rewardTitle: rewardToIssue.title, couponCode };
    });

    return {
      success: true,
      won: true,
      rewardTitle: result.rewardTitle,
      couponCode: result.couponCode,
      transaction: result.transaction,
    };
  } catch (err: any) {
    // Handle concurrent execution unique constraint race condition
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
      const existingReward = await db.rewardTransaction.findUnique({
        where: { registrationId: registration.id },
      });
      return {
        success: true,
        alreadyIssued: true,
        reward: existingReward,
      };
    }
    throw err;
  }
}
