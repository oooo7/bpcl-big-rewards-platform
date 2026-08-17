import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { maskCustomerPII } from '@/lib/auth';

let cachedDashboardMetrics: { data: any; expiresAt: number } | null = null;
const DASHBOARD_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export class AdminService {
  /**
   * 1. Dashboard Executive Real DB-Backed KPIs & Charts
   */
  static async getDashboardMetrics(bypassCache = false) {
    const nowMs = Date.now();
    if (!bypassCache && cachedDashboardMetrics && nowMs < cachedDashboardMetrics.expiresAt) {
      return cachedDashboardMetrics.data;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalRegistrations,
      todaysRegistrations,
      qrScans,
      validRegistrations,
      pendingValidation,
      instantRewards,
      fuelSum,
      territories,
      rewardInventories,
      allStations,
      recentRegs,
    ] = await Promise.all([
      db.registration.count(),
      db.registration.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.qRCode.aggregate({
        _sum: { scanCount: true },
      }),
      db.registration.count({
        where: { status: { in: ['VALID', 'REWARD_ISSUED', 'REWARD_ELIGIBLE', 'DRAW_ELIGIBLE'] } },
      }),
      db.bill.count({
        where: { validationStatus: 'PENDING' },
      }),
      db.rewardTransaction.count(),
      db.registration.aggregate({
        _sum: { fuelAmount: true },
      }),
      db.territory.findMany({
        include: {
          stations: {
            include: {
              registrations: true,
            },
          },
        },
      }),
      db.rewardInventory.findMany({
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      }),
      db.fuelStation.findMany({
        include: {
          territory: true,
          _count: { select: { registrations: true } },
          registrations: { select: { fuelAmount: true } },
        },
      }),
      db.registration.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Registrations over time (grouped by day for past 14 days)
    const timeMap: Record<string, number> = {};
    const daysToShow = 14;
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      timeMap[key] = 0;
    }

    recentRegs.forEach((r) => {
      const key = new Date(r.createdAt).toISOString().split('T')[0];
      if (timeMap[key] !== undefined) {
        timeMap[key] += 1;
      }
    });

    const registrationsOverTime = Object.entries(timeMap).map(([date, count]) => ({
      date,
      formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    }));

    // Territory performance stats
    const territoryPerformance = territories.map((t) => {
      let regCount = 0;
      let totalFuel = 0;
      t.stations.forEach((s) => {
        regCount += s.registrations.length;
        totalFuel += s.registrations.reduce((acc, r) => acc + r.fuelAmount, 0);
      });
      return {
        id: t.id,
        name: t.name,
        code: t.code,
        stationCount: t.stations.length,
        registrationCount: regCount,
        totalFuel,
      };
    });

    // Station performance stats (top stations by registration count)
    const stationPerformance = allStations
      .map((s) => ({
        id: s.id,
        stationCode: s.stationCode,
        name: s.name,
        city: s.city,
        territoryName: s.territory?.name || 'Unknown',
        registrationCount: s._count.registrations,
        totalFuel: s.registrations.reduce((sum, r) => sum + r.fuelAmount, 0),
      }))
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, 10);

    const rewardSummary = rewardInventories.map((r) => ({
      id: r.id,
      title: r.title,
      rewardType: r.rewardType,
      totalQuantity: r.totalQuantity,
      availableQuantity: r.availableQuantity,
      issuedQuantity: r.totalQuantity - r.availableQuantity,
      unitValue: r.unitValue,
    }));

    const result = {
      kpis: {
        totalRegistrations,
        todaysRegistrations,
        qrScans: qrScans._sum.scanCount || 0,
        totalQrScans: qrScans._sum.scanCount || 0,
        validRegistrations,
        pendingValidation,
        instantRewards,
        instantRewardsIssued: instantRewards,
        totalFuelAmount: fuelSum._sum.fuelAmount || 0,
      },
      registrationsOverTime,
      territoryPerformance,
      stationPerformance,
      rewardSummary,
    };

    cachedDashboardMetrics = {
      data: result,
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    };

    return result;
  }

  /**
   * 2. Registrations Master Search, Filter, & Pagination Query with Privacy Masking
   */
  static async getRegistrationsList(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    stationCode?: string;
    territoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    userRole?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (params.status && params.status !== 'ALL') {
      whereClause.status = params.status;
    }

    if (params.stationCode && params.stationCode !== 'ALL') {
      whereClause.station = { stationCode: params.stationCode };
    }

    if (params.territoryId && params.territoryId !== 'ALL') {
      whereClause.station = {
        ...(whereClause.station || {}),
        territoryId: params.territoryId,
      };
    }

    if (params.dateFrom || params.dateTo) {
      whereClause.createdAt = {};
      if (params.dateFrom) {
        whereClause.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        const to = new Date(params.dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }

    if (params.search) {
      const q = params.search.trim();
      whereClause.OR = [
        { billNumber: { contains: q } },
        { vehicleNumber: { contains: q } },
        { customer: { fullName: { contains: q } } },
        { customer: { mobileNumber: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.registration.findMany({
        where: whereClause,
        include: {
          customer: true,
          station: { include: { territory: true } },
          bill: true,
          reward: true,
          fraudFlags: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.registration.count({ where: whereClause }),
    ]);

    // Apply customer PII masking based on userRole permission
    const sanitizedItems = items.map((item) => {
      const maskedCustomer = maskCustomerPII(item.customer, params.userRole || 'VALIDATION_TEAM');
      return {
        ...item,
        customer: {
          ...item.customer,
          fullName: maskedCustomer.fullName,
          mobileNumber: maskedCustomer.mobileNumber,
          isMasked: maskedCustomer.isMasked,
        },
      };
    });

    return {
      items: sanitizedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3. Get Single Registration Detail with Audit History & Masking
   */
  static async getRegistrationById(id: string, userRole: string = 'VALIDATION_TEAM') {
    const reg = await db.registration.findUnique({
      where: { id },
      include: {
        customer: true,
        station: { include: { territory: true, dsm: true } },
        bill: true,
        reward: { include: { reward: true } },
        fraudFlags: true,
      },
    });

    if (!reg) {
      throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }

    // Fetch audit history logs for this registration or its bill
    const auditLogs = await db.auditLog.findMany({
      where: {
        OR: [
          { entityId: reg.id },
          { entityId: reg.bill?.id || '' },
        ],
      },
      include: { actor: { select: { id: true, name: true, role: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const maskedCustomer = maskCustomerPII(reg.customer, userRole);

    return {
      ...reg,
      customer: {
        ...reg.customer,
        fullName: maskedCustomer.fullName,
        mobileNumber: maskedCustomer.mobileNumber,
        isMasked: maskedCustomer.isMasked,
      },
      auditLogs,
    };
  }

  /**
   * 4. Bill Validation Queue & Reviewer Actions
   */
  static async getPendingBillQueue(params: { search?: string; userRole?: string } = {}) {
    const whereClause: any = { validationStatus: 'PENDING' };

    if (params.search) {
      const q = params.search.trim();
      whereClause.registration = {
        OR: [
          { billNumber: { contains: q } },
          { customer: { fullName: { contains: q } } },
          { customer: { mobileNumber: { contains: q } } },
          { station: { stationCode: { contains: q } } },
        ],
      };
    }

    const pendingBills = await db.bill.findMany({
      where: whereClause,
      include: {
        registration: {
          include: {
            customer: true,
            station: { include: { territory: true } },
            fraudFlags: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return pendingBills.map((bill) => {
      const maskedCustomer = maskCustomerPII(bill.registration.customer, params.userRole || 'VALIDATION_TEAM');
      return {
        ...bill,
        registration: {
          ...bill.registration,
          customer: {
            ...bill.registration.customer,
            fullName: maskedCustomer.fullName,
            mobileNumber: maskedCustomer.mobileNumber,
            isMasked: maskedCustomer.isMasked,
          },
        },
      };
    });
  }

  static async reviewBill(data: {
    billId: string;
    action: 'APPROVE' | 'REJECT';
    reviewerNotes: string;
    actorId: string;
    actorRole: string;
    clientIp?: string;
  }) {
    const bill = await db.bill.findUnique({
      where: { id: data.billId },
      include: { registration: true },
    });

    if (!bill) {
      throw new AppError('Bill record not found', 404, 'BILL_NOT_FOUND');
    }

    const newValidationStatus = data.action === 'APPROVE' ? 'MANUALLY_APPROVED' : 'MANUALLY_REJECTED';
    const newRegistrationStatus = data.action === 'APPROVE' ? 'VALID' : 'REJECTED';

    await db.$transaction([
      db.bill.update({
        where: { id: bill.id },
        data: {
          validationStatus: newValidationStatus,
          reviewerNotes: data.reviewerNotes,
          validatedBy: data.actorId,
          validatedAt: new Date(),
        },
      }),
      db.registration.update({
        where: { id: bill.registrationId },
        data: { status: newRegistrationStatus },
      }),
    ]);

    // Create Immutable Audit Trail
    await logAuditEvent({
      actorId: data.actorId,
      actorRole: data.actorRole || 'VALIDATION_TEAM',
      action: `BILL_REVIEW_${data.action}`,
      entityType: 'Bill',
      entityId: bill.id,
      newValues: { validationStatus: newValidationStatus, notes: data.reviewerNotes },
      ipAddress: data.clientIp || '127.0.0.1',
    });

    return { success: true, validationStatus: newValidationStatus };
  }

  /**
   * 5. Instant Rewards Module Overview & Transactions
   */
  static async getRewardsSummaryAndTransactions(params: {
    page?: number;
    limit?: number;
    search?: string;
    rewardType?: string;
    userRole?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const inventories = await db.rewardInventory.findMany({
      include: {
        _count: { select: { transactions: true } },
      },
    });

    const whereClause: any = {};

    if (params.rewardType && params.rewardType !== 'ALL') {
      whereClause.reward = { rewardType: params.rewardType };
    }

    if (params.search) {
      const q = params.search.trim();
      whereClause.OR = [
        { couponCode: { contains: q } },
        { registration: { billNumber: { contains: q } } },
        { registration: { customer: { fullName: { contains: q } } } },
        { registration: { customer: { mobileNumber: { contains: q } } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      db.rewardTransaction.findMany({
        where: whereClause,
        include: {
          reward: true,
          registration: {
            include: {
              customer: true,
              station: true,
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.rewardTransaction.count({ where: whereClause }),
    ]);

    const sanitizedTransactions = transactions.map((t) => {
      const maskedCustomer = maskCustomerPII(t.registration.customer, params.userRole || 'READ_ONLY_MGMT');
      return {
        ...t,
        registration: {
          ...t.registration,
          customer: {
            ...t.registration.customer,
            fullName: maskedCustomer.fullName,
            mobileNumber: maskedCustomer.mobileNumber,
            isMasked: maskedCustomer.isMasked,
          },
        },
      };
    });

    return {
      inventories: inventories.map((inv) => ({
        id: inv.id,
        title: inv.title,
        rewardType: inv.rewardType,
        totalQuantity: inv.totalQuantity,
        availableQuantity: inv.availableQuantity,
        issuedQuantity: inv.totalQuantity - inv.availableQuantity,
        unitValue: inv.unitValue,
      })),
      transactions: sanitizedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
