import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasPermission, verifySessionToken } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { getReportData, REPORT_PERMISSIONS, ReportFilters, PaginationParams } from '@/services/report.service';
import { buildCsvString, buildExcelBuffer, buildPdfBuffer, REPORT_COLUMNS } from '@/lib/export-engine';

// ─── Session Helper ───────────────────────────────────────────────────────────

async function getSessionUser(req: NextRequest) {
  try {
    const cookie = req.cookies.get('bpcl_admin_session');
    if (!cookie?.value) return null;
    // Use the same signed JWT verification as middleware
    const session = await verifySessionToken(cookie.value);
    if (!session?.userId) return null;
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, territoryId: true, name: true },
    });
    return user;
  } catch {
    return null;
  }
}

// ─── Report Type → Human Label ───────────────────────────────────────────────

const REPORT_LABELS: Record<string, string> = {
  registration:          'Registration Report',
  bill_upload:           'Bill Upload Report',
  bill_validation:       'Bill Validation Report',
  territory_performance: 'Territory Performance Report',
  station_performance:   'Station Performance Report',
  instant_reward:        'Instant Reward Report',
  draw:                  'Draw Report',
  winner:                'Winner Report',
  prize_distribution:    'Prize Distribution Report',
  dispatch:              'Dispatch Report',
  dsm_performance:       'DSM Performance Report',
  audit:                 'Audit Log Report',
};

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const reportType = type.toLowerCase();
    const requiredPermission = REPORT_PERMISSIONS[reportType];
    if (!requiredPermission) {
      return NextResponse.json({ success: false, error: 'UNKNOWN_REPORT_TYPE' }, { status: 404 });
    }

    // Auth
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });

    // RBAC
    if (!hasPermission(user.role, requiredPermission)) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', required: requiredPermission }, { status: 403 });
    }

    // Parse query params
    const sp = new URL(req.url).searchParams;
    const format = sp.get('format') || 'json';

    const filters: ReportFilters = {
      dateFrom:    sp.get('dateFrom') || undefined,
      dateTo:      sp.get('dateTo') || undefined,
      campaignId:  sp.get('campaignId') || undefined,
      territoryId: sp.get('territoryId') || undefined,
      stationId:   sp.get('stationId') || undefined,
      status:      sp.get('status') || undefined,
      dsmId:       sp.get('dsmId') || undefined,
      search:      sp.get('search') || undefined,
    };

    const pagination: PaginationParams = {
      page:     parseInt(sp.get('page') || '1'),
      pageSize: Math.min(parseInt(sp.get('pageSize') || '50'), format === 'json' ? 100 : 10000),
      sort:     sp.get('sort') || undefined,
      order:    (sp.get('order') as 'asc' | 'desc') || 'desc',
    };

    const userCtx = { id: user.id, email: user.email, role: user.role, territoryId: user.territoryId || undefined };

    // Query data
    const result = await getReportData(reportType, userCtx, filters, pagination);

    // ── JSON (paginated table view) ──────────────────────────────────────────
    if (format === 'json') {
      return NextResponse.json({ success: true, reportType, ...result });
    }

    // ── Export formats — all require audit log ───────────────────────────────
    const cols = REPORT_COLUMNS[reportType] || [];
    const headers = cols.map((c) => c.label);
    const keys = cols.map((c) => c.key);
    const rows = result.data as Record<string, unknown>[];
    const reportLabel = REPORT_LABELS[reportType] || reportType;

    // Audit the export
    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'REPORT_EXPORTED',
      entityType: 'REPORT',
      entityId: reportType,
      newValues: { format, filters, rowCount: rows.length, reportLabel },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
    });

    const filterDesc = Object.entries(filters)
      .filter(([, v]) => v && v !== 'ALL')
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'All Records';

    // ── CSV ──────────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const csv = buildCsvString(headers, rows, keys);
      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Report-Type': reportType,
          'X-Row-Count': String(rows.length),
        },
      });
    }

    // ── Excel ────────────────────────────────────────────────────────────────
    if (format === 'xlsx') {
      const buffer = await buildExcelBuffer(headers, rows, keys, reportLabel);
      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Report-Type': reportType,
          'X-Row-Count': String(rows.length),
        },
      });
    }

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const buffer = await buildPdfBuffer(reportLabel, headers, rows, keys, {
        generatedBy: user.name || user.email,
        filters: filterDesc,
        rowCount: rows.length,
      });
      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Report-Type': reportType,
          'X-Row-Count': String(rows.length),
        },
      });
    }

    return NextResponse.json({ success: false, error: 'UNSUPPORTED_FORMAT' }, { status: 400 });

  } catch (error) {
    return handleApiError(error);
  }
}
