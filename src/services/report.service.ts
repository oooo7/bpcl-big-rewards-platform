import { db } from '@/lib/db';
import { hasPermission, maskCustomerPII } from '@/lib/auth';

export interface ReportUserContext {
  id?: string;
  email?: string;
  role: string;
  territoryId?: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  campaignId?: string;
  territoryId?: string;
  stationId?: string;
  status?: string;
  dsmId?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const REPORT_PERMISSIONS: Record<string, string> = {
  registration:         'registrations.view',
  bill_upload:          'bill.view',
  bill_validation:      'bill.validate',
  territory_performance:'report.export',
  station_performance:  'report.export',
  instant_reward:       'rewards.view',
  draw:                 'draw.configure',
  winner:               'winner.view',
  prize_distribution:   'prize.dispatch',
  dispatch:             'prize.dispatch',
  dsm_performance:      'dsm.view_territory',
  audit:                'audit.view_logs',
};

function buildDateRange(filters: ReportFilters) {
  if (!filters.dateFrom && !filters.dateTo) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    range.lte = to;
  }
  return range;
}

async function getAllowedStationIds(user: ReportUserContext, filters: ReportFilters): Promise<string[] | undefined> {
  if (user.role === 'DSM') {
    const dsm = (user.id || user.email)
      ? await db.dSM.findFirst({
          where: { OR: [...(user.id ? [{ id: user.id }] : []), ...(user.email ? [{ email: user.email }] : [])] },
          include: { stations: { select: { id: true } } },
        })
      : await db.dSM.findFirst({
          where: { territoryId: user.territoryId },
          include: { stations: { select: { id: true } } },
        });
    if (dsm) return dsm.stations.map((s) => s.id);
    if (user.territoryId) {
      const stations = await db.fuelStation.findMany({ where: { territoryId: user.territoryId }, select: { id: true } });
      return stations.map((s) => s.id);
    }
    return [];
  }
  if (user.role === 'TERRITORY_MANAGER' && user.territoryId) {
    const territory = filters.territoryId && filters.territoryId !== 'ALL' ? filters.territoryId : user.territoryId;
    const stations = await db.fuelStation.findMany({ where: { territoryId: territory }, select: { id: true } });
    return stations.map((s) => s.id);
  }
  if (filters.stationId && filters.stationId !== 'ALL') return [filters.stationId];
  if (filters.territoryId && filters.territoryId !== 'ALL') {
    const stations = await db.fuelStation.findMany({ where: { territoryId: filters.territoryId }, select: { id: true } });
    return stations.map((s) => s.id);
  }
  return undefined;
}

export async function queryRegistrationReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const allowedStationIds = await getAllowedStationIds(user, filters);
  const dateRange = buildDateRange(filters);
  const { page = 1, pageSize = 50, sort = 'createdAt', order = 'desc' } = pagination;
  const where: any = {};
  if (filters.campaignId && filters.campaignId !== 'ALL') where.campaignId = filters.campaignId;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (dateRange) where.createdAt = dateRange;
  if (allowedStationIds) where.stationId = { in: allowedStationIds };
  const [total, rows] = await Promise.all([
    db.registration.count({ where }),
    db.registration.findMany({
      where,
      include: {
        customer: { select: { fullName: true, mobileNumber: true } },
        station: { select: { stationCode: true, name: true, city: true, territory: { select: { name: true } } } },
        campaign: { select: { title: true } },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const data = rows.map((r) => {
    const pii = maskCustomerPII({ fullName: r.customer.fullName, mobileNumber: r.customer.mobileNumber }, user.role);
    return {
      id: r.id, registrationDate: r.createdAt.toISOString(),
      campaign: r.campaign.title, customerName: pii.fullName, customerMobile: pii.mobileNumber, isMasked: pii.isMasked,
      vehicleNumber: r.vehicleNumber, vehicleType: r.vehicleType, fuelType: r.fuelType,
      fuelAmount: r.fuelAmount, billNumber: r.billNumber, status: r.status,
      stationCode: r.station.stationCode, stationName: r.station.name, city: r.station.city,
      territory: r.station.territory?.name || '',
    };
  });
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryBillUploadReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const allowedStationIds = await getAllowedStationIds(user, filters);
  const dateRange = buildDateRange(filters);
  const { page = 1, pageSize = 50, sort = 'createdAt', order = 'desc' } = pagination;
  const where: any = {};
  if (dateRange) where.createdAt = dateRange;
  if (allowedStationIds) where.registration = { stationId: { in: allowedStationIds } };
  const [total, rows] = await Promise.all([
    db.bill.count({ where }),
    db.bill.findMany({
      where,
      include: { registration: { select: { billNumber: true, fuelAmount: true, status: true, station: { select: { stationCode: true, name: true } } } } },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const data = rows.map((b) => ({
    id: b.id, uploadDate: b.createdAt.toISOString(), registrationId: b.registrationId,
    billNumber: b.registration.billNumber, fuelAmount: b.registration.fuelAmount,
    fileFormat: b.fileFormat, fileSize: b.fileSize,
    ocrBillNumber: b.ocrBillNumber || '', ocrAmount: b.ocrAmount || '',
    ocrConfidence: b.ocrConfidence !== null ? `${Math.round((b.ocrConfidence || 0) * 100)}%` : '',
    validationStatus: b.validationStatus, stationCode: b.registration.station.stationCode,
    stationName: b.registration.station.name, registrationStatus: b.registration.status,
  }));
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryBillValidationReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const allowedStationIds = await getAllowedStationIds(user, filters);
  const dateRange = buildDateRange(filters);
  const { page = 1, pageSize = 50, order = 'desc' } = pagination;
  const where: any = {};
  if (dateRange) where.validatedAt = dateRange;
  if (filters.status && filters.status !== 'ALL') where.validationStatus = filters.status;
  if (allowedStationIds) where.registration = { stationId: { in: allowedStationIds } };
  const [total, rows] = await Promise.all([
    db.bill.count({ where }),
    db.bill.findMany({
      where,
      include: { registration: { select: { billNumber: true, fuelAmount: true, station: { select: { stationCode: true, name: true } } } } },
      orderBy: { createdAt: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const data = rows.map((b) => ({
    id: b.id, billNumber: b.registration.billNumber, fuelAmount: b.registration.fuelAmount,
    validationStatus: b.validationStatus,
    ocrConfidence: b.ocrConfidence !== null ? `${Math.round((b.ocrConfidence || 0) * 100)}%` : 'N/A',
    reviewerNotes: b.reviewerNotes || '', validatedBy: b.validatedBy || 'System',
    validatedAt: b.validatedAt?.toISOString() || '', stationCode: b.registration.station.stationCode,
    stationName: b.registration.station.name,
  }));
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryTerritoryPerformanceReport(user: ReportUserContext, filters: ReportFilters) {
  const dateRange = buildDateRange(filters);
  const regWhere: any = {};
  if (filters.campaignId && filters.campaignId !== 'ALL') regWhere.campaignId = filters.campaignId;
  if (dateRange) regWhere.createdAt = dateRange;
  const allowedTerritoryIds =
    (user.role === 'DSM' || user.role === 'TERRITORY_MANAGER') && user.territoryId ? [user.territoryId]
    : filters.territoryId && filters.territoryId !== 'ALL' ? [filters.territoryId]
    : undefined;
  const territories = await db.territory.findMany({
    where: allowedTerritoryIds ? { id: { in: allowedTerritoryIds } } : {},
    include: { stations: { include: { registrations: { where: regWhere, select: { status: true, fuelAmount: true } } } } },
  });
  const data = territories.map((t) => {
    let total = 0, valid = 0, fuel = 0;
    t.stations.forEach((s) => {
      total += s.registrations.length;
      fuel += s.registrations.reduce((a, r) => a + r.fuelAmount, 0);
      valid += s.registrations.filter((r) => ['VALID','REWARD_ISSUED','REWARD_ELIGIBLE','DRAW_ELIGIBLE'].includes(r.status)).length;
    });
    return {
      territoryCode: t.code, territoryName: t.name, state: t.state,
      activeStations: t.stations.filter((s) => s.isActive).length, totalStations: t.stations.length,
      totalRegistrations: total, validRegistrations: valid, invalidRegistrations: total - valid,
      validationRate: total > 0 ? `${Math.round((valid / total) * 100)}%` : '0%', totalFuelAmount: fuel,
    };
  }).sort((a, b) => b.validRegistrations - a.validRegistrations);
  return { total: data.length, data };
}

export async function queryStationPerformanceReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const allowedStationIds = await getAllowedStationIds(user, filters);
  const dateRange = buildDateRange(filters);
  const { page = 1, pageSize = 50 } = pagination;
  const stationWhere: any = {};
  if (allowedStationIds) stationWhere.id = { in: allowedStationIds };
  if (filters.campaignId && filters.campaignId !== 'ALL') stationWhere.campaignId = filters.campaignId;
  const regWhere: any = {};
  if (dateRange) regWhere.createdAt = dateRange;
  const [total, stations] = await Promise.all([
    db.fuelStation.count({ where: stationWhere }),
    db.fuelStation.findMany({
      where: stationWhere,
      include: {
        territory: { select: { name: true, code: true } }, dsm: { select: { name: true, dsmCode: true } },
        registrations: { where: regWhere, select: { status: true, fuelAmount: true } },
        qrCodes: { select: { scanCount: true } },
      },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = stations.map((s) => {
    const regs = s.registrations.length;
    const valid = s.registrations.filter((r) => ['VALID','REWARD_ISSUED','REWARD_ELIGIBLE','DRAW_ELIGIBLE'].includes(r.status)).length;
    const fuel = s.registrations.reduce((a, r) => a + r.fuelAmount, 0);
    const scans = s.qrCodes.reduce((a, q) => a + q.scanCount, 0);
    return {
      stationCode: s.stationCode, stationName: s.name, city: s.city,
      territory: s.territory?.name || '', territoryCode: s.territory?.code || '',
      dsmName: s.dsm?.name || 'Unassigned', dsmCode: s.dsm?.dsmCode || '',
      isActive: s.isActive ? 'Yes' : 'No', totalRegistrations: regs, validRegistrations: valid,
      validationRate: regs > 0 ? `${Math.round((valid / regs) * 100)}%` : '0%', totalFuelAmount: fuel, qrScans: scans,
    };
  });
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryInstantRewardReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const allowedStationIds = await getAllowedStationIds(user, filters);
  const dateRange = buildDateRange(filters);
  const { page = 1, pageSize = 50, sort = 'issuedAt', order = 'desc' } = pagination;
  const where: any = {};
  if (dateRange) where.issuedAt = dateRange;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (allowedStationIds) where.registration = { stationId: { in: allowedStationIds } };
  const [total, rows] = await Promise.all([
    db.rewardTransaction.count({ where }),
    db.rewardTransaction.findMany({
      where,
      include: {
        reward: { select: { title: true, rewardType: true, unitValue: true } },
        registration: { select: { billNumber: true, customer: { select: { fullName: true, mobileNumber: true } }, station: { select: { stationCode: true, name: true } } } },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = rows.map((rt) => {
    const pii = maskCustomerPII({ fullName: rt.registration.customer.fullName, mobileNumber: rt.registration.customer.mobileNumber }, user.role);
    return {
      id: rt.id, issuedAt: rt.issuedAt.toISOString(), couponCode: rt.couponCode,
      rewardTitle: rt.reward.title, rewardType: rt.reward.rewardType, rewardValue: rt.reward.unitValue,
      status: rt.status, customerName: pii.fullName, customerMobile: pii.mobileNumber, isMasked: pii.isMasked,
      billNumber: rt.registration.billNumber, stationCode: rt.registration.station.stationCode, stationName: rt.registration.station.name,
    };
  });
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryDrawReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const { page = 1, pageSize = 50, sort = 'scheduledDate', order = 'desc' } = pagination;
  const dateRange = buildDateRange(filters);
  const where: any = {};
  if (filters.campaignId && filters.campaignId !== 'ALL') where.campaignId = filters.campaignId;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (dateRange) where.scheduledDate = dateRange;
  const [total, rows] = await Promise.all([
    db.drawSchedule.count({ where }),
    db.drawSchedule.findMany({
      where,
      include: { campaign: { select: { title: true } }, _count: { select: { entries: true, winners: true } } },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = rows.map((d) => ({
    id: d.id, drawName: d.drawName, drawType: d.drawType, campaign: d.campaign.title,
    scheduledDate: d.scheduledDate.toISOString().split('T')[0], status: d.status,
    winnerCount: d.winnerCount, totalEligibleEntries: d.totalEligibleEntries,
    entriesSnapshot: d._count.entries, winnersSelected: d._count.winners,
    executedAt: d.executedAt?.toISOString() || '', executedBy: d.executedBy || '',
    executionHash: d.executionHash ? d.executionHash.substring(0, 16) + '...' : '',
  }));
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryWinnerReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const { page = 1, pageSize = 50, order = 'desc' } = pagination;
  const dateRange = buildDateRange(filters);
  const where: any = {};
  if (filters.status && filters.status !== 'ALL') where.verificationStatus = filters.status;
  if (dateRange) where.verifiedAt = dateRange;
  const [total, rows] = await Promise.all([
    db.winner.count({ where }),
    db.winner.findMany({
      where,
      include: {
        draw: { select: { drawName: true, drawType: true, scheduledDate: true } },
        registration: { select: { billNumber: true, fuelAmount: true, vehicleNumber: true, customer: { select: { fullName: true, mobileNumber: true } }, station: { select: { stationCode: true, name: true } } } },
        dispatch: { select: { dispatchStatus: true, trackingNumber: true, deliveredAt: true } },
      },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = rows.map((w) => {
    const pii = maskCustomerPII({ fullName: w.registration.customer.fullName, mobileNumber: w.registration.customer.mobileNumber }, user.role);
    return {
      id: w.id, drawName: w.draw.drawName, drawType: w.draw.drawType,
      drawDate: w.draw.scheduledDate.toISOString().split('T')[0],
      customerName: pii.fullName, customerMobile: pii.mobileNumber, isMasked: pii.isMasked,
      vehicleNumber: w.registration.vehicleNumber, prizeName: w.prizeName, prizeValue: w.prizeValue,
      verificationStatus: w.verificationStatus, verifiedAt: w.verifiedAt?.toISOString() || '',
      stationCode: w.registration.station.stationCode, stationName: w.registration.station.name,
      dispatchStatus: w.dispatch?.dispatchStatus || 'NOT_DISPATCHED',
      trackingNumber: w.dispatch?.trackingNumber || '', deliveredAt: w.dispatch?.deliveredAt?.toISOString() || '',
    };
  });
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryPrizeDistributionReport(user: ReportUserContext, filters: ReportFilters) {
  const campaignId = filters.campaignId && filters.campaignId !== 'ALL' ? filters.campaignId : undefined;
  const [prizeInventory, rewardInventory] = await Promise.all([
    db.prizeInventory.findMany({ where: campaignId ? { campaignId } : {}, include: { campaign: { select: { title: true } } } }),
    db.rewardInventory.findMany({ where: campaignId ? { campaignId } : {}, include: { campaign: { select: { title: true } } } }),
  ]);
  const prizes = prizeInventory.map((p) => ({
    category: 'DRAW_PRIZE', campaign: p.campaign.title, name: p.name, sku: p.sku, prizeType: p.prizeType,
    totalStock: p.totalStock, availableStock: p.availableStock, allocated: p.totalStock - p.availableStock,
    unitValue: p.unitValue, totalValue: p.totalStock * p.unitValue,
  }));
  const rewards = rewardInventory.map((r) => ({
    category: 'INSTANT_REWARD', campaign: r.campaign.title, name: r.title, sku: r.id.substring(0, 8), prizeType: r.rewardType,
    totalStock: r.totalQuantity, availableStock: r.availableQuantity, allocated: r.totalQuantity - r.availableQuantity,
    unitValue: r.unitValue, totalValue: r.totalQuantity * r.unitValue,
  }));
  const data = [...prizes, ...rewards];
  return { total: data.length, data };
}

export async function queryDispatchReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const { page = 1, pageSize = 50, order = 'desc' } = pagination;
  const dateRange = buildDateRange(filters);
  const where: any = {};
  if (filters.status && filters.status !== 'ALL') where.dispatchStatus = filters.status;
  if (dateRange) where.dispatchedAt = dateRange;
  const [total, rows] = await Promise.all([
    db.dispatch.count({ where }),
    db.dispatch.findMany({
      where,
      include: { winner: { select: { prizeName: true, prizeValue: true, registration: { select: { customer: { select: { fullName: true, mobileNumber: true } }, station: { select: { stationCode: true } } } } } } },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = rows.map((d) => {
    const mobile = d.receiverMobile;
    const maskedMobile = mobile.length >= 10 ? `${mobile.slice(0, 2)}****${mobile.slice(-4)}` : '**********';
    return {
      id: d.id, winnerId: d.winnerId, prizeName: d.prizeName, prizeValue: d.winner.prizeValue,
      receiverName: d.receiverName, receiverMobile: maskedMobile,
      shippingAddress: d.shippingAddress, nodalPoint: d.nodalPoint, dispatchStatus: d.dispatchStatus,
      trackingNumber: d.trackingNumber || '', dispatchedAt: d.dispatchedAt?.toISOString() || '',
      deliveredAt: d.deliveredAt?.toISOString() || '',
      hasPhotoProof: !!d.deliveryPhotoUrl, hasSignatureProof: !!d.deliverySignatureUrl,
      stationCode: d.winner.registration.station.stationCode,
    };
  });
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryDSMPerformanceReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const { page = 1, pageSize = 50 } = pagination;
  const dateRange = buildDateRange(filters);
  const regWhere: any = {};
  if (filters.campaignId && filters.campaignId !== 'ALL') regWhere.campaignId = filters.campaignId;
  if (dateRange) regWhere.createdAt = dateRange;
  const dsmWhere: any = {};
  if ((user.role === 'DSM' || user.role === 'TERRITORY_MANAGER') && user.territoryId) dsmWhere.territoryId = user.territoryId;
  else if (filters.territoryId && filters.territoryId !== 'ALL') dsmWhere.territoryId = filters.territoryId;
  if (filters.dsmId && filters.dsmId !== 'ALL') dsmWhere.id = filters.dsmId;
  const [total, dsms] = await Promise.all([
    db.dSM.count({ where: dsmWhere }),
    db.dSM.findMany({
      where: dsmWhere,
      include: { territory: { select: { name: true, code: true } }, stations: { include: { registrations: { where: regWhere, select: { status: true, fuelAmount: true } }, qrCodes: { select: { scanCount: true } } } } },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = dsms.map((dsm) => {
    let tot = 0, valid = 0, fuel = 0, scans = 0;
    dsm.stations.forEach((s) => {
      tot += s.registrations.length;
      fuel += s.registrations.reduce((a, r) => a + r.fuelAmount, 0);
      valid += s.registrations.filter((r) => ['VALID','REWARD_ISSUED','REWARD_ELIGIBLE','DRAW_ELIGIBLE'].includes(r.status)).length;
      scans += s.qrCodes.reduce((a, q) => a + q.scanCount, 0);
    });
    return {
      dsmCode: dsm.dsmCode, dsmName: dsm.name, email: dsm.email, mobile: dsm.mobile,
      territory: dsm.territory?.name || '', territoryCode: dsm.territory?.code || '',
      stationCount: dsm.stations.length, totalRegistrations: tot, validRegistrations: valid,
      validationRate: tot > 0 ? `${Math.round((valid / tot) * 100)}%` : '0%', totalFuelAmount: fuel, qrScans: scans,
    };
  });
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function queryAuditReport(user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams = {}) {
  const { page = 1, pageSize = 50, sort = 'createdAt', order = 'desc' } = pagination;
  const dateRange = buildDateRange(filters);
  const where: any = {};
  if (dateRange) where.createdAt = dateRange;
  if (filters.status && filters.status !== 'ALL') where.entityType = filters.status;
  if (filters.search) where.action = { contains: filters.search };
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true, role: true } } },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  const data = rows.map((log) => ({
    id: log.id, timestamp: log.createdAt.toISOString(),
    actorName: log.actor?.name || 'System', actorEmail: log.actor?.email || '',
    actorRole: log.actorRole, action: log.action, entityType: log.entityType,
    entityId: log.entityId, ipAddress: log.ipAddress || '',
    changes: log.newValues ? JSON.stringify(JSON.parse(log.newValues)).substring(0, 120) : '',
  }));
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data };
}

export async function getReportData(reportType: string, user: ReportUserContext, filters: ReportFilters, pagination: PaginationParams) {
  switch (reportType) {
    case 'registration':          return queryRegistrationReport(user, filters, pagination);
    case 'bill_upload':           return queryBillUploadReport(user, filters, pagination);
    case 'bill_validation':       return queryBillValidationReport(user, filters, pagination);
    case 'territory_performance': return queryTerritoryPerformanceReport(user, filters);
    case 'station_performance':   return queryStationPerformanceReport(user, filters, pagination);
    case 'instant_reward':        return queryInstantRewardReport(user, filters, pagination);
    case 'draw':                  return queryDrawReport(user, filters, pagination);
    case 'winner':                return queryWinnerReport(user, filters, pagination);
    case 'prize_distribution':    return queryPrizeDistributionReport(user, filters);
    case 'dispatch':              return queryDispatchReport(user, filters, pagination);
    case 'dsm_performance':       return queryDSMPerformanceReport(user, filters, pagination);
    case 'audit':                 return queryAuditReport(user, filters, pagination);
    default:                      throw new Error(`Unknown report type: ${reportType}`);
  }
}
