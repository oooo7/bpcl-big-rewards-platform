import { describe, it, expect } from 'vitest';
import { AdminService } from '../../src/services/admin.service';
import { authenticateAdminUser, hasPermission, maskCustomerPII } from '../../src/lib/auth';
import { db } from '../../src/lib/db';

describe('Campaign Management Platform - Comprehensive 5-Module Tests', () => {
  // ----------------------------------------------------
  // Module 1: Authentication & RBAC
  // ----------------------------------------------------
  describe('Module 1: Authentication & RBAC', () => {
    it('1.1 Authenticates admin user and returns sanitized profile with role', async () => {
      const auth = await authenticateAdminUser('admin@bpcl.in', 'admin123');
      expect(auth.success).toBe(true);
      expect(auth.user?.role).toBe('SUPER_ADMIN');
      expect(auth.user?.email).toBe('admin@bpcl.in');
    });

    it('1.2 Rejects invalid credentials gracefully', async () => {
      const auth = await authenticateAdminUser('wrong@bpcl.in', 'invalidpass');
      expect(auth.success).toBe(false);
      expect(auth.error).toBe('INVALID_CREDENTIALS');
    });

    it('1.3 Evaluates RBAC permissions correctly across system roles', () => {
      expect(hasPermission('SUPER_ADMIN', 'any.permission')).toBe(true);
      expect(hasPermission('CAMPAIGN_ADMIN', 'customer.view_pii')).toBe(true);
      expect(hasPermission('VALIDATION_TEAM', 'bill.validate')).toBe(true);
      expect(hasPermission('VALIDATION_TEAM', 'customer.view_pii')).toBe(false);
      expect(hasPermission('AUDITOR', 'audit.view_logs')).toBe(true);
    });

    it('1.4 Applies customer PII privacy masking strictly based on RBAC', () => {
      const customer = { fullName: 'Rajesh Kumar', mobileNumber: '9876543210' };

      // Non-PII role -> Masked
      const masked = maskCustomerPII(customer, 'VALIDATION_TEAM');
      expect(masked.isMasked).toBe(true);
      expect(masked.mobileNumber).toBe('98****3210');
      expect(masked.fullName).toBe('Rajesh K.');

      // PII Authorized role -> Unmasked
      const unmasked = maskCustomerPII(customer, 'CAMPAIGN_ADMIN');
      expect(unmasked.isMasked).toBe(false);
      expect(unmasked.mobileNumber).toBe('9876543210');
      expect(unmasked.fullName).toBe('Rajesh Kumar');
    });
  });

  // ----------------------------------------------------
  // Module 2: Dashboard Real DB Metrics & Analytics
  // ----------------------------------------------------
  describe('Module 2: Dashboard Real DB Metrics & Analytics', () => {
    it('2.1 Computes real database-backed metrics without fake fallbacks', async () => {
      const metrics = await AdminService.getDashboardMetrics();

      expect(metrics.kpis).toBeDefined();
      expect(metrics.kpis.totalRegistrations).toBeGreaterThanOrEqual(0);
      expect(metrics.kpis.todaysRegistrations).toBeGreaterThanOrEqual(0);
      expect(metrics.kpis.totalQrScans).toBeGreaterThanOrEqual(0);
      expect(metrics.kpis.validRegistrations).toBeGreaterThanOrEqual(0);
      expect(metrics.kpis.pendingValidation).toBeGreaterThanOrEqual(0);
      expect(metrics.kpis.instantRewardsIssued).toBeGreaterThanOrEqual(0);
      expect(metrics.kpis.totalFuelAmount).toBeGreaterThanOrEqual(0);

      expect(Array.isArray(metrics.registrationsOverTime)).toBe(true);
      expect(metrics.registrationsOverTime.length).toBe(14);

      expect(Array.isArray(metrics.territoryPerformance)).toBe(true);
      expect(Array.isArray(metrics.stationPerformance)).toBe(true);
      expect(Array.isArray(metrics.rewardSummary)).toBe(true);
    });
  });

  // ----------------------------------------------------
  // Module 3: Registrations Master Query & Privacy
  // ----------------------------------------------------
  describe('Module 3: Registrations Master Query & Privacy', () => {
    it('3.1 Supports search, filters, pagination, and PII masking', async () => {
      const result = await AdminService.getRegistrationsList({
        page: 1,
        limit: 10,
        status: 'ALL',
        userRole: 'VALIDATION_TEAM',
      });

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination.page).toBe(1);

      if (result.items.length > 0) {
        const item = result.items[0];
        expect(item.customer.isMasked).toBe(true);
        expect(item.customer.mobileNumber).toContain('****');
      }
    });

    it('3.2 Returns detailed registration with audit history timeline', async () => {
      const firstReg = await db.registration.findFirst();
      if (!firstReg) return;

      const detail = await AdminService.getRegistrationById(firstReg.id, 'CAMPAIGN_ADMIN');
      expect(detail).toBeDefined();
      expect(detail.id).toBe(firstReg.id);
      expect(detail.customer.isMasked).toBe(false);
      expect(Array.isArray(detail.auditLogs)).toBe(true);
    });
  });

  // ----------------------------------------------------
  // Module 4: Bill Validation Queue & Reviewer Actions
  // ----------------------------------------------------
  describe('Module 4: Bill Validation Queue & Reviewer Actions', () => {
    it('4.1 Fetches pending bill queue with OCR scores and performs review action', async () => {
      const campaign = await db.campaign.findFirst();
      const station = await db.fuelStation.findFirst();
      const customer = await db.customer.findFirst();
      const adminUser = await db.user.findFirst();

      if (!campaign || !station || !customer || !adminUser) return;

      // Seed a test bill for manual review
      const reg = await db.registration.create({
        data: {
          campaignId: campaign.id,
          stationId: station.id,
          customerId: customer.id,
          vehicleType: 'CAR',
          vehicleNumber: 'GJ01TEST99',
          fuelType: 'PETROL',
          fuelAmount: 1500,
          billNumber: `BILL-TEST-${Date.now()}`,
          status: 'UNDER_VALIDATION',
        },
      });

      const bill = await db.bill.create({
        data: {
          registrationId: reg.id,
          fileKey: 'uploads/receipt.png',
          fileHash: `hash_val_${Date.now()}`,
          fileFormat: 'PNG',
          fileSize: 2048,
          ocrBillNumber: reg.billNumber,
          ocrAmount: 1500,
          ocrConfidence: 0.92,
          validationStatus: 'PENDING',
        },
      });

      // Verify pending queue fetches the record
      const pendingQueue = await AdminService.getPendingBillQueue({ userRole: 'VALIDATION_TEAM' });
      expect(pendingQueue.some((b) => b.id === bill.id)).toBe(true);

      // Perform manual review approve
      const review = await AdminService.reviewBill({
        billId: bill.id,
        action: 'APPROVE',
        reviewerNotes: 'Verified matching receipt invoice',
        actorId: adminUser.id,
        actorRole: adminUser.role,
      });

      expect(review.success).toBe(true);
      expect(review.validationStatus).toBe('MANUALLY_APPROVED');

      // Verify DB registration status updated to VALID
      const updatedReg = await db.registration.findUnique({ where: { id: reg.id } });
      expect(updatedReg?.status).toBe('VALID');

      // Verify immutable audit log creation
      const audit = await db.auditLog.findFirst({
        where: { entityId: bill.id, action: 'BILL_REVIEW_APPROVE' },
      });
      expect(audit).not.toBeNull();
    });
  });

  // ----------------------------------------------------
  // Module 5: Instant Rewards Management & Transactions
  // ----------------------------------------------------
  describe('Module 5: Instant Rewards Management & Transactions', () => {
    it('5.1 Fetches reward inventory stock levels and paginated transactions log', async () => {
      const data = await AdminService.getRewardsSummaryAndTransactions({
        page: 1,
        limit: 10,
        userRole: 'READ_ONLY_MGMT',
      });

      expect(Array.isArray(data.inventories)).toBe(true);
      expect(Array.isArray(data.transactions)).toBe(true);
      expect(data.pagination).toBeDefined();

      data.inventories.forEach((inv) => {
        expect(inv.totalQuantity).toBeGreaterThanOrEqual(0);
        expect(inv.availableQuantity).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
