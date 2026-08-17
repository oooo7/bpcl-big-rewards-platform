import { describe, it, expect } from 'vitest';
import { db } from '../../src/lib/db';
import { DSMService } from '../../src/services/dsm.service';

describe('DSM Performance System & RBAC Data Isolation Integration Tests', () => {
  // 1. DSM Creation & Station Assignment Test
  it('1. DSM Management: Creates DSM and assigns fuel stations', async () => {
    const territory = await db.territory.findFirst();
    expect(territory).not.toBeNull();

    const dsmResult = await DSMService.createOrUpdateDSM({
      dsmCode: `DSM-TEST-${Date.now()}`,
      name: 'Ramesh DSM',
      email: `ramesh-${Date.now()}@bpcl.in`,
      mobile: '9825099999',
      territoryId: territory!.id,
    });

    expect(dsmResult.success).toBe(true);
    expect(dsmResult.dsm.name).toBe('Ramesh DSM');

    // Fetch station in territory
    const station = await db.fuelStation.findFirst({ where: { territoryId: territory!.id } });
    if (station) {
      const assignResult = await DSMService.assignStationsToDSM(dsmResult.dsm.id, [station.id]);
      expect(assignResult.success).toBe(true);
      expect(assignResult.assignedCount).toBe(1);

      const checkStation = await db.fuelStation.findUnique({ where: { id: station.id } });
      expect(checkStation?.dsmId).toBe(dsmResult.dsm.id);
    }
  });

  // 2. RBAC Data Scoping & Isolation Test
  it('2. RBAC Data Isolation: Restricts DSM user to assigned territory and mapped stations', async () => {
    const territories = await db.territory.findMany({ take: 2 });
    if (territories.length < 2) return;

    const territoryA = territories[0];
    const territoryB = territories[1];

    // Create a DSM assigned to Territory A
    const dsmA = await db.dSM.create({
      data: {
        dsmCode: `DSM-A-${Date.now()}`,
        name: 'Manager Territory A',
        email: `managerA-${Date.now()}@bpcl.in`,
        mobile: '9825011111',
        territoryId: territoryA.id,
      },
    });

    const stationA = await db.fuelStation.findFirst({ where: { territoryId: territoryA.id } });
    const stationB = await db.fuelStation.findFirst({ where: { territoryId: territoryB.id } });
    const campaign = await db.campaign.findFirst({ where: { isActive: true } });
    const customer = await db.customer.findFirst();

    if (stationA && stationB && campaign && customer) {
      // Map stationA to dsmA
      await db.fuelStation.update({
        where: { id: stationA.id },
        data: { dsmId: dsmA.id },
      });

      // Create 1 registration in Station A (Territory A)
      await db.registration.create({
        data: {
          campaignId: campaign.id,
          stationId: stationA.id,
          customerId: customer.id,
          vehicleType: 'CAR',
          vehicleNumber: 'GJ01DSMA1',
          fuelType: 'PETROL',
          fuelAmount: 1500,
          billNumber: `BILL-DSMA-${Date.now()}`,
          status: 'VALID',
        },
      });

      // Create 1 registration in Station B (Territory B)
      await db.registration.create({
        data: {
          campaignId: campaign.id,
          stationId: stationB.id,
          customerId: customer.id,
          vehicleType: 'CAR',
          vehicleNumber: 'GJ01DSMB1',
          fuelType: 'PETROL',
          fuelAmount: 2500,
          billNumber: `BILL-DSMB-${Date.now()}`,
          status: 'VALID',
        },
      });

      // Query DSM performance as dsmA (role: DSM)
      const dsmContext = {
        role: 'DSM',
        email: dsmA.email,
        territoryId: territoryA.id,
      };

      const metrics = await DSMService.getDSMPerformanceMetrics(dsmContext);

      // Verify that DSM metrics include Territory A stations and exclude Territory B stations
      const stationIdsInMetrics = metrics.stationRankings.map((s) => s.id);
      expect(stationIdsInMetrics).toContain(stationA.id);
      expect(stationIdsInMetrics).not.toContain(stationB.id);

      // Territory rankings should only list Territory A
      const territoryIdsInMetrics = metrics.territoryRankings.map((t) => t.id);
      expect(territoryIdsInMetrics).toContain(territoryA.id);
      expect(territoryIdsInMetrics).not.toContain(territoryB.id);
    }
  });

  // 3. Admin Filtered Access Test
  it('3. Admin Access: Allows Campaign Admin to view global metrics and filter by territory', async () => {
    const territory = await db.territory.findFirst();
    if (!territory) return;

    const adminContext = { role: 'CAMPAIGN_ADMIN' };
    const globalMetrics = await DSMService.getDSMPerformanceMetrics(adminContext);
    expect(globalMetrics.kpis.totalRegistrations).toBeGreaterThanOrEqual(0);

    const filteredMetrics = await DSMService.getDSMPerformanceMetrics(adminContext, {
      territoryId: territory.id,
    });
    expect(filteredMetrics.territoryRankings.every((t) => t.id === territory.id)).toBe(true);
  });

  // 4. Trend & Rankings Calculation Test
  it('4. Analytics Engine: Calculates daily registration trends and station rankings', async () => {
    const adminContext = { role: 'CAMPAIGN_ADMIN' };
    const metrics = await DSMService.getDSMPerformanceMetrics(adminContext);

    expect(Array.isArray(metrics.registrationTrends)).toBe(true);
    expect(metrics.registrationTrends.length).toBeGreaterThan(0);
    expect(Array.isArray(metrics.stationRankings)).toBe(true);
    expect(Array.isArray(metrics.dsmRankings)).toBe(true);
  });
});
