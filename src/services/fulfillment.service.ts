import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';

export class FulfillmentService {
  /**
   * 1. Atomic Non-Negative Prize Stock Allocation
   * Ensures availableStock >= 1 inside transaction before decrementing. Stock never becomes negative.
   */
  static async allocatePrizeToWinner(
    winnerId: string,
    prizeSku?: string,
    actorId?: string,
    actorRole: string = 'FULFILLMENT_TEAM'
  ) {
    return await db.$transaction(async (tx) => {
      const winner = await tx.winner.findUnique({
        where: { id: winnerId },
        include: { registration: { include: { campaign: true } } },
      });

      if (!winner) {
        throw new AppError('Winner record not found', 404, 'WINNER_NOT_FOUND');
      }

      if (winner.verificationStatus !== 'VERIFIED') {
        throw new AppError('Winner must be verified before prize allocation', 400, 'WINNER_NOT_VERIFIED');
      }

      // Find suitable prize inventory by SKU or campaign
      let prize = prizeSku
        ? await tx.prizeInventory.findUnique({ where: { sku: prizeSku } })
        : await tx.prizeInventory.findFirst({
            where: { campaignId: winner.registration.campaignId },
          });

      // If no prize inventory exists yet for campaign, auto-create prize stock record
      if (!prize) {
        prize = await tx.prizeInventory.create({
          data: {
            campaignId: winner.registration.campaignId,
            name: winner.prizeName || 'Fortnightly Campaign Prize',
            sku: prizeSku || `PRIZE-${Date.now()}`,
            prizeType: 'FORTNIGHTLY',
            totalStock: 500,
            availableStock: 500,
            unitValue: winner.prizeValue || 5000,
          },
        });
      }

      // Strict Non-Negative Check
      if (prize.availableStock < 1) {
        throw new AppError('Prize inventory is fully exhausted', 400, 'INVENTORY_EXHAUSTED');
      }

      // Atomic Stock Decrement with strict non-negative check
      const updatedPrize = await tx.prizeInventory.update({
        where: { id: prize.id },
        data: {
          availableStock: { decrement: 1 },
        },
      });

      if (updatedPrize.availableStock < 0) {
        throw new AppError('Prize inventory is fully exhausted', 400, 'INVENTORY_EXHAUSTED');
      }

      // Write Audit Log Event
      await logAuditEvent(
        {
          actorId,
          actorRole,
          action: 'PRIZE_ALLOCATED',
          entityType: 'PrizeInventory',
          entityId: prize.id,
          newValues: { winnerId, remainingStock: updatedPrize.availableStock },
        },
        tx
      );

      return {
        success: true,
        winnerId,
        prize: updatedPrize,
      };
    });
  }

  /**
   * 2. Create Dispatch Order for Verified Winner
   */
  static async createDispatchOrder(params: {
    winnerId: string;
    shippingAddress?: string;
    nodalPoint?: string;
    trackingNumber?: string;
    actorId?: string;
    actorRole?: string;
  }) {
    return await db.$transaction(async (tx) => {
      const winner = await tx.winner.findUnique({
        where: { id: params.winnerId },
        include: {
          registration: { include: { customer: true } },
          dispatch: true,
        },
      });

      if (!winner) {
        throw new AppError('Winner record not found', 404, 'WINNER_NOT_FOUND');
      }

      if (winner.verificationStatus !== 'VERIFIED') {
        throw new AppError('Winner must be in VERIFIED state to initiate dispatch', 400, 'WINNER_NOT_VERIFIED');
      }

      if (winner.dispatch) {
        return { success: true, dispatch: winner.dispatch, alreadyCreated: true };
      }

      const trackingNumber = params.trackingNumber || `BPCL-TRK-${Math.floor(Math.random() * 90000) + 10000}`;
      const shippingAddress = params.shippingAddress || 'BPCL Regional Logistics Depot, Gujarat';
      const nodalPoint = params.nodalPoint || 'Ahmedabad Central Nodal Point';

      const dispatch = await tx.dispatch.create({
        data: {
          winnerId: winner.id,
          prizeName: winner.prizeName,
          shippingAddress,
          nodalPoint,
          dispatchStatus: 'DISPATCH_CREATED',
          trackingNumber,
          receiverName: winner.registration.customer.fullName,
          receiverMobile: winner.registration.customer.mobileNumber,
          dispatchedAt: new Date(),
        },
      });

      await tx.winner.update({
        where: { id: winner.id },
        data: { verificationStatus: 'DISPATCHED' },
      });

      await logAuditEvent(
        {
          actorId: params.actorId,
          actorRole: params.actorRole || 'FULFILLMENT_TEAM',
          action: 'DISPATCH_CREATED',
          entityType: 'Dispatch',
          entityId: dispatch.id,
          newValues: { trackingNumber, status: 'DISPATCH_CREATED', nodalPoint },
        },
        tx
      );

      return {
        success: true,
        dispatch,
      };
    });
  }

  /**
   * 3. Controlled Dispatch State Machine Transitions
   * DISPATCH_CREATED -> MATERIAL_SENT_NODAL -> RECEIVED_NODAL -> IN_TRANSIT -> DELIVERED
   */
  static async updateDispatchState(params: {
    dispatchId: string;
    nextStatus: 'MATERIAL_SENT_NODAL' | 'RECEIVED_NODAL' | 'IN_TRANSIT' | 'DELIVERED';
    metadata?: object;
    actorId?: string;
    actorRole?: string;
  }) {
    return await db.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id: params.dispatchId },
      });

      if (!dispatch) {
        throw new AppError('Dispatch record not found', 404, 'DISPATCH_NOT_FOUND');
      }

      const validTransitions: Record<string, string[]> = {
        DISPATCH_CREATED: ['MATERIAL_SENT_NODAL'],
        MATERIAL_SENT_NODAL: ['RECEIVED_NODAL', 'IN_TRANSIT'],
        RECEIVED_NODAL: ['IN_TRANSIT'],
        IN_TRANSIT: ['DELIVERED'],
        DELIVERED: [],
      };

      const allowed = validTransitions[dispatch.dispatchStatus] || [];
      if (!allowed.includes(params.nextStatus)) {
        throw new AppError(
          `Invalid state transition from ${dispatch.dispatchStatus} to ${params.nextStatus}`,
          400,
          'INVALID_STATE_TRANSITION'
        );
      }

      const updatedDispatch = await tx.dispatch.update({
        where: { id: dispatch.id },
        data: {
          dispatchStatus: params.nextStatus,
          ...(params.nextStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });

      await logAuditEvent(
        {
          actorId: params.actorId,
          actorRole: params.actorRole || 'FULFILLMENT_TEAM',
          action: `DISPATCH_TRANSITION_${params.nextStatus}`,
          entityType: 'Dispatch',
          entityId: dispatch.id,
          oldValues: { status: dispatch.dispatchStatus },
          newValues: { status: params.nextStatus, ...(params.metadata || {}) },
        },
        tx
      );

      return {
        success: true,
        dispatch: updatedDispatch,
      };
    });
  }
}
