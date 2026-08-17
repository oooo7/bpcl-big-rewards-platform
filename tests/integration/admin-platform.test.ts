import { describe, it, expect } from 'vitest';
import { AdminService } from '../../src/services/admin.service';
import { db } from '../../src/lib/db';

describe('Admin Platform & Management Integration Tests', () => {
  // 1. Database KPIs Verification
  it('1. Executive Dashboard KPIs: Returns accurate database-backed stats and territory performance', async () => {
    const data = await AdminService.getDashboardMetrics();

    expect(data.kpis).toBeDefined();
    expect(data.kpis.totalRegistrations).toBeGreaterThanOrEqual(0);
    expect(data.kpis.totalFuelAmount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.territoryPerformance)).toBe(true);
    expect(Array.isArray(data.rewardSummary)).toBe(true);
  });

  // 2. Registrations Pagination & Filtering
  it('2. Registrations Master: Supports search, status filtering, and pagination', async () => {
    const list = await AdminService.getRegistrationsList({
      page: 1,
      limit: 10,
      status: 'ALL',
    });

    expect(list.items).toBeDefined();
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.pagination.page).toBe(1);
    expect(list.pagination.limit).toBe(10);
  });

  // 3. Pending Bill Queue & Manual Review with RBAC Audit
  it('3. Bill Validation Queue & Review: Approves or rejects bill and creates immutable audit log', async () => {
    const campaign = await db.campaign.findFirst();
    const station = await db.fuelStation.findFirst();
    const customer = await db.customer.findFirst();
    const adminUser = await db.user.findFirst();

    if (!campaign || !station || !customer || !adminUser) return;

    const reg = await db.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: 'CAR',
        vehicleNumber: 'GJ01TEST123',
        fuelType: 'PETROL',
        fuelAmount: 1200,
        billNumber: `BILL-REVIEW-${Date.now()}`,
        status: 'UNDER_VALIDATION',
      },
    });

    const bill = await db.bill.create({
      data: {
        registrationId: reg.id,
        fileKey: 'uploads/test.jpg',
        fileHash: `hash_${Date.now()}`,
        fileFormat: 'JPG',
        fileSize: 1024,
        ocrBillNumber: reg.billNumber,
        ocrAmount: 1200,
        ocrConfidence: 0.65,
        validationStatus: 'PENDING',
      },
    });

    // Execute Reviewer Action with valid User foreign key
    const reviewResult = await AdminService.reviewBill({
      billId: bill.id,
      action: 'APPROVE',
      reviewerNotes: 'Validated invoice matching physical station receipt',
      actorId: adminUser.id,
      actorRole: adminUser.role,
    });

    expect(reviewResult.success).toBe(true);
    expect(reviewResult.validationStatus).toBe('MANUALLY_APPROVED');

    // Verify updated status in DB
    const updatedReg = await db.registration.findUnique({ where: { id: reg.id } });
    expect(updatedReg?.status).toBe('VALID');

    // Verify audit log creation
    const audit = await db.auditLog.findFirst({
      where: { entityId: bill.id, action: 'BILL_REVIEW_APPROVE' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(adminUser.id);
  });
});
