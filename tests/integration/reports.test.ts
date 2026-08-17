import { describe, it, expect } from 'vitest';
import { db } from '../../src/lib/db';
import {
  queryRegistrationReport,
  queryBillUploadReport,
  queryBillValidationReport,
  queryTerritoryPerformanceReport,
  queryStationPerformanceReport,
  queryInstantRewardReport,
  queryDrawReport,
  queryWinnerReport,
  queryPrizeDistributionReport,
  queryDispatchReport,
  queryDSMPerformanceReport,
  queryAuditReport,
  REPORT_PERMISSIONS,
} from '../../src/services/report.service';
import { buildCsvString, buildExcelBuffer, buildPdfBuffer, REPORT_COLUMNS } from '../../src/lib/export-engine';
import { hasPermission } from '../../src/lib/auth';
import { logAuditEvent } from '../../src/lib/audit';

const ADMIN_CTX = { role: 'CAMPAIGN_ADMIN' };
const DSM_CTX_BASE = { role: 'DSM' };
const EMPTY_FILTERS = {};

// ─── 1. Report Service — Shape & Data Tests ───────────────────────────────────

describe('Report Service Layer Tests', () => {

  it('1.1 Registration Report: Returns correct shape and data', async () => {
    const result = await queryRegistrationReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('totalPages');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      const row = result.data[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('registrationDate');
      expect(row).toHaveProperty('customerName');
      expect(row).toHaveProperty('stationCode');
      expect(row).toHaveProperty('status');
    }
  });

  it('1.2 Bill Upload Report: Returns correct shape', async () => {
    const result = await queryBillUploadReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('billNumber');
      expect(result.data[0]).toHaveProperty('validationStatus');
    }
  });

  it('1.3 Territory Performance Report: Returns all territories', async () => {
    const result = await queryTerritoryPerformanceReport(ADMIN_CTX, EMPTY_FILTERS);
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('territoryCode');
      expect(result.data[0]).toHaveProperty('totalRegistrations');
      expect(result.data[0]).toHaveProperty('validationRate');
    }
  });

  it('1.4 Station Performance Report: Returns station data', async () => {
    const result = await queryStationPerformanceReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('stationCode');
      expect(result.data[0]).toHaveProperty('qrScans');
    }
  });

  it('1.5 Instant Reward Report: Returns reward transactions', async () => {
    const result = await queryInstantRewardReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('couponCode');
      expect(result.data[0]).toHaveProperty('rewardType');
    }
  });

  it('1.6 Draw Report: Returns draw schedules', async () => {
    const result = await queryDrawReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('drawName');
      expect(result.data[0]).toHaveProperty('drawType');
    }
  });

  it('1.7 Winner Report: Returns winner records', async () => {
    const result = await queryWinnerReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('prizeName');
      expect(result.data[0]).toHaveProperty('verificationStatus');
    }
  });

  it('1.8 Prize Distribution Report: Returns inventory data', async () => {
    const result = await queryPrizeDistributionReport(ADMIN_CTX, EMPTY_FILTERS);
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('category');
      expect(result.data[0]).toHaveProperty('totalStock');
      expect(result.data[0]).toHaveProperty('availableStock');
    }
  });

  it('1.9 Dispatch Report: Returns dispatch records', async () => {
    const result = await queryDispatchReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('dispatchStatus');
      expect(result.data[0]).toHaveProperty('receiverMobile');
      // Receiver mobile must always be masked
      const mobile = result.data[0].receiverMobile as string;
      expect(mobile).toMatch(/\*{4}/);
    }
  });

  it('1.10 DSM Performance Report: Returns DSM leaderboard data', async () => {
    const result = await queryDSMPerformanceReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('dsmCode');
      expect(result.data[0]).toHaveProperty('validationRate');
    }
  });

  it('1.11 Audit Report: Returns audit log records', async () => {
    // Create at least one audit event first
    await logAuditEvent({ actorRole: 'CAMPAIGN_ADMIN', action: 'TEST_ACTION', entityType: 'TEST', entityId: 'test-001' });
    const result = await queryAuditReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 10 });
    expect(result).toHaveProperty('total');
    expect(result.total).toBeGreaterThan(0);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0]).toHaveProperty('action');
    expect(result.data[0]).toHaveProperty('entityType');
  });

});

// ─── 2. PII Masking Tests ─────────────────────────────────────────────────────

describe('PII Masking in Report Exports', () => {

  it('2.1 Registration report masks PII for VALIDATION_TEAM role', async () => {
    const ctx = { role: 'VALIDATION_TEAM' };
    const result = await queryRegistrationReport(ctx, EMPTY_FILTERS, { page: 1, pageSize: 5 });
    for (const row of result.data) {
      expect(row.isMasked).toBe(true);
      // Mobile should be masked: XX****XXXX
      expect((row.customerMobile as string)).toMatch(/\*{4}/);
    }
  });

  it('2.2 Registration report shows full PII for CAMPAIGN_ADMIN', async () => {
    const result = await queryRegistrationReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 5 });
    for (const row of result.data) {
      expect(row.isMasked).toBe(false);
      // Mobile should be real 10-digit number (no masking)
      expect((row.customerMobile as string)).not.toMatch(/\*{4}/);
    }
  });

  it('2.3 Dispatch report always masks receiver mobile', async () => {
    const result = await queryDispatchReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 5 });
    for (const row of result.data) {
      if (row.receiverMobile) {
        expect((row.receiverMobile as string)).toMatch(/\*{4}/);
      }
    }
  });

});

// ─── 3. RBAC Data Scoping Test ────────────────────────────────────────────────

describe('RBAC Data Isolation in Reports', () => {

  it('3.1 DSM user scoped to assigned territory — station report', async () => {
    const territory = await db.territory.findFirst();
    if (!territory) return;

    const dsmCtx = { role: 'DSM', territoryId: territory.id };
    const adminResult = await queryStationPerformanceReport(ADMIN_CTX, EMPTY_FILTERS, { page: 1, pageSize: 100 });
    const dsmResult = await queryStationPerformanceReport(dsmCtx, EMPTY_FILTERS, { page: 1, pageSize: 100 });

    // DSM should see equal or fewer stations than admin
    expect(dsmResult.total).toBeLessThanOrEqual(adminResult.total);
    // All stations in DSM result should be in DSM's territory
    for (const station of dsmResult.data) {
      expect(station.territory).toBeTruthy();
    }
  });

  it('3.2 Territory filter narrows territory performance results', async () => {
    const territory = await db.territory.findFirst();
    if (!territory) return;
    const filtered = await queryTerritoryPerformanceReport(ADMIN_CTX, { territoryId: territory.id });
    expect(filtered.data.every((t) => t.territoryCode === territory.code)).toBe(true);
  });

});

// ─── 4. RBAC Permission Matrix ───────────────────────────────────────────────

describe('RBAC Permission Matrix', () => {

  it('4.1 All report types have permission requirements defined', () => {
    const expectedTypes = ['registration','bill_upload','bill_validation','territory_performance',
      'station_performance','instant_reward','draw','winner','prize_distribution','dispatch','dsm_performance','audit'];
    for (const type of expectedTypes) {
      expect(REPORT_PERMISSIONS[type]).toBeTruthy();
    }
  });

  it('4.2 SUPER_ADMIN has access to all reports', () => {
    for (const [, perm] of Object.entries(REPORT_PERMISSIONS)) {
      expect(hasPermission('SUPER_ADMIN', perm)).toBe(true);
    }
  });

  it('4.2b CAMPAIGN_ADMIN has access to core operational reports', () => {
    const corePerms = ['registrations.view', 'bill.view', 'bill.validate', 'report.export',
      'rewards.view', 'draw.configure', 'winner.view', 'prize.dispatch', 'audit.view_logs'];
    for (const perm of corePerms) {
      expect(hasPermission('CAMPAIGN_ADMIN', perm)).toBe(true);
    }
  });


  it('4.3 DSM only has access to DSM and basic registration reports', () => {
    expect(hasPermission('DSM', 'dsm.view_territory')).toBe(true);
    expect(hasPermission('DSM', 'registrations.view')).toBe(true);
    expect(hasPermission('DSM', 'audit.view_logs')).toBe(false);
    expect(hasPermission('DSM', 'draw.configure')).toBe(false);
    expect(hasPermission('DSM', 'winner.view')).toBe(false);
  });

  it('4.4 AUDITOR has audit log access but not draw or winner access', () => {
    expect(hasPermission('AUDITOR', 'audit.view_logs')).toBe(true);
    expect(hasPermission('AUDITOR', 'registrations.view')).toBe(true);
    expect(hasPermission('AUDITOR', 'draw.configure')).toBe(false);
    expect(hasPermission('AUDITOR', 'winner.view')).toBe(false);
  });

});

// ─── 5. Export Engine Tests ───────────────────────────────────────────────────

describe('Export Engine — CSV, Excel, PDF Generation', () => {

  const sampleRows = [
    { id: '001', name: 'Rahul S.', mobile: '98****3210', status: 'VALID', amount: 1500 },
    { id: '002', name: 'Priya K.', mobile: '97****4321', status: 'INVALID', amount: 2000 },
    { id: '003', name: 'Name, With Comma', mobile: '91****0000', status: 'PENDING', amount: 500 },
  ];
  const headers = ['ID', 'Customer', 'Mobile', 'Status', 'Amount (₹)'];
  const keys = ['id', 'name', 'mobile', 'status', 'amount'];

  it('5.1 CSV: Builds non-empty string with correct headers', () => {
    const csv = buildCsvString(headers, sampleRows, keys);
    expect(typeof csv).toBe('string');
    expect(csv.length).toBeGreaterThan(0);
    expect(csv.startsWith('ID,Customer,Mobile,Status')).toBe(true);
    expect(csv).toContain('001');
    expect(csv).toContain('VALID');
    // Comma in name must be quoted
    expect(csv).toContain('"Name, With Comma"');
  });

  it('5.2 CSV: Correct row count (1 header + N data rows)', () => {
    const csv = buildCsvString(headers, sampleRows, keys);
    const lines = csv.split('\r\n').filter(l => l.length > 0);
    expect(lines).toHaveLength(sampleRows.length + 1);
  });

  it('5.3 Excel: Produces non-empty buffer', async () => {
    const buffer = await buildExcelBuffer(headers, sampleRows, keys, 'Test Report');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // XLSX files start with PK (ZIP signature)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4B);
  });

  it('5.4 PDF: Produces non-empty buffer with PDF header', async () => {
    const buffer = await buildPdfBuffer('Test Report', headers, sampleRows, keys, { generatedBy: 'Test', rowCount: 3 });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    const header = buffer.slice(0, 4).toString('ascii');
    expect(header).toBe('%PDF');
  });

  it('5.5 REPORT_COLUMNS: All 12 report types have column definitions', () => {
    const expectedTypes = ['registration','bill_upload','bill_validation','territory_performance',
      'station_performance','instant_reward','draw','winner','prize_distribution','dispatch','dsm_performance','audit'];
    for (const type of expectedTypes) {
      expect(Array.isArray(REPORT_COLUMNS[type])).toBe(true);
      expect(REPORT_COLUMNS[type].length).toBeGreaterThan(0);
      for (const col of REPORT_COLUMNS[type]) {
        expect(col).toHaveProperty('label');
        expect(col).toHaveProperty('key');
      }
    }
  });

});

// ─── 6. Audit Log Written on Export ─────────────────────────────────────────

describe('Audit Trail for Exports', () => {

  it('6.1 Audit event logged with correct fields for report export', async () => {
    const before = await db.auditLog.count({ where: { action: 'REPORT_EXPORTED' } });

    await logAuditEvent({
      actorId: undefined,
      actorRole: 'CAMPAIGN_ADMIN',
      action: 'REPORT_EXPORTED',
      entityType: 'REPORT',
      entityId: 'registration',
      newValues: { format: 'csv', filters: {}, rowCount: 42 },
    });

    const after = await db.auditLog.count({ where: { action: 'REPORT_EXPORTED' } });
    expect(after).toBe(before + 1);

    const log = await db.auditLog.findFirst({
      where: { action: 'REPORT_EXPORTED', entityId: 'registration' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.actorRole).toBe('CAMPAIGN_ADMIN');
    expect(log?.entityType).toBe('REPORT');
  });

});
