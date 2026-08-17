'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Filter, Search, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, FileX } from 'lucide-react';
import { REPORT_COLUMNS } from '@/lib/report-columns';
import { AdminSidebar } from '@/components/AdminSidebar';

const REPORT_LABELS: Record<string, string> = {
  registration: 'Registration Report', bill_upload: 'Bill Upload Report',
  bill_validation: 'Bill Validation Report', territory_performance: 'Territory Performance Report',
  station_performance: 'Station Performance Report', instant_reward: 'Instant Reward Report',
  draw: 'Draw Report', winner: 'Winner Report', prize_distribution: 'Prize Distribution Report',
  dispatch: 'Dispatch Report', dsm_performance: 'DSM Performance Report', audit: 'Audit Log Report',
};

const STATUS_OPTIONS: Record<string, string[]> = {
  registration: ['SUBMITTED','BILL_UPLOADED','UNDER_VALIDATION','VALID','INVALID','REJECTED','REWARD_ELIGIBLE','REWARD_ISSUED','DRAW_ELIGIBLE','FRAUD_FLAGGED'],
  bill_upload: ['PENDING','AUTO_VALIDATED','MANUALLY_APPROVED','MANUALLY_REJECTED','DUPLICATE_FLAGGED'],
  bill_validation: ['PENDING','AUTO_VALIDATED','MANUALLY_APPROVED','MANUALLY_REJECTED','DUPLICATE_FLAGGED'],
  instant_reward: ['ISSUED','REDEEMED','EXPIRED'],
  draw: ['SCHEDULED','FROZEN','EXECUTED','CANCELLED'],
  winner: ['PENDING_VERIFICATION','VERIFIED','REJECTED','DISPATCHED','DELIVERED'],
  dispatch: ['DISPATCH_CREATED','MATERIAL_SENT_NODAL','RECEIVED_NODAL','IN_TRANSIT','DELIVERED'],
  audit: ['Registration','Bill','Winner','Dispatch','DSM','REPORT'],
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '✓ Yes' : '✗ No';
  if (typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('fuel'))) {
    return `₹${Number(value).toLocaleString('en-IN')}`;
  }
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
}

function StatusBadge({ value }: { value: string }) {
  const v = String(value).toUpperCase();
  let cls = 'bg-slate-100 text-slate-700';
  if (['VALID','VERIFIED','DELIVERED','ISSUED','AUTO_VALIDATED','MANUALLY_APPROVED','EXECUTED'].some(s => v.includes(s)))
    cls = 'bg-emerald-100 text-emerald-700';
  else if (['INVALID','REJECTED','FRAUD','DUPLICATE','CANCELLED','EXPIRED'].some(s => v.includes(s)))
    cls = 'bg-rose-100 text-rose-700';
  else if (['PENDING','SUBMITTED','SCHEDULED','BILL_UPLOADED'].some(s => v.includes(s)))
    cls = 'bg-amber-100 text-amber-700';
  else if (['TRANSIT','DISPATCH','NODAL'].some(s => v.includes(s)))
    cls = 'bg-blue-100 text-blue-700';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{value}</span>;
}

const STATUS_KEYS = ['status','validationStatus','verificationStatus','dispatchStatus','registrationStatus','isActive'];

export default function ReportViewPage({ params }: { params: { type: string } }) {
  const reportType = params.type;
  const cols = REPORT_COLUMNS[reportType] || [];
  const label = REPORT_LABELS[reportType] || reportType;

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', campaignId: 'ALL', territoryId: 'ALL',
    stationId: 'ALL', status: 'ALL', search: '',
  });
  const [exporting, setExporting] = useState<string>('');

  useEffect(() => {
    fetch('/api/v1/admin/campaigns').then(r => r.json()).then(d => { if (d.campaigns) setCampaigns(d.campaigns); }).catch(() => {});
    fetch('/api/v1/admin/dsm').then(r => r.json()).then(d => { if (d.territories) setTerritories(d.territories); }).catch(() => {});
  }, []);

  const buildQs = useCallback((extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({
      page: String(page), pageSize: String(pageSize),
      sort: sortKey, order: sortOrder,
      ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v && v !== 'ALL')),
      ...extra,
    });
    return q.toString();
  }, [page, pageSize, sortKey, sortOrder, filters]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/v1/admin/reports/${reportType}?format=json&${buildQs()}`);
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Failed to load report'); return; }
      setData(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setError('Network error loading report data');
    } finally {
      setLoading(false);
    }
  }, [reportType, buildQs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('desc'); }
    setPage(1);
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(format);
    try {
      const qs = buildQs({ format, pageSize: '10000' });
      const res = await fetch(`/api/v1/admin/reports/${reportType}?${qs}`);
      if (!res.ok) { alert('Export failed'); return; }
      const blob = await res.blob();
      const ext = format === 'xlsx' ? 'xlsx' : format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Export error'); }
    finally { setExporting(''); }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar />
      <main className="flex-1 p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/reports" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900">{label}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? 'Loading…' : `${total.toLocaleString()} total records`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'csv' ? 'Exporting…' : 'CSV'}
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <input
            type="date" value={filters.dateFrom} onChange={(e) => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
            className="col-span-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="From"
          />
          <input
            type="date" value={filters.dateTo} onChange={(e) => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
            className="col-span-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="To"
          />
          {campaigns.length > 0 && (
            <select
              value={filters.campaignId}
              onChange={(e) => { setFilters(f => ({ ...f, campaignId: e.target.value })); setPage(1); }}
              className="col-span-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Campaigns</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
          {territories.length > 0 && (
            <select
              value={filters.territoryId}
              onChange={(e) => { setFilters(f => ({ ...f, territoryId: e.target.value })); setPage(1); }}
              className="col-span-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Territories</option>
              {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {(STATUS_OPTIONS[reportType] || []).length > 0 && (
            <select
              value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className="col-span-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              {(STATUS_OPTIONS[reportType] || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {reportType === 'audit' && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text" placeholder="Search actions…" value={filters.search}
                onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                className="w-full pl-8 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <button
            onClick={() => { setFilters({ dateFrom:'', dateTo:'', campaignId:'ALL', territoryId:'ALL', stationId:'ALL', status:'ALL', search:'' }); setPage(1); }}
            className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-3 py-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-sm font-bold text-rose-600">{error}</p>
            <button onClick={fetchData} className="text-xs px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold hover:bg-rose-200">Retry</button>
          </div>
        ) : loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileX className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-500">No records found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {cols.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left px-4 py-3 font-bold cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap select-none"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1 text-amber-300">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri} className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${ri % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    {cols.map((col) => {
                      const isStatus = STATUS_KEYS.includes(col.key);
                      const val = row[col.key];
                      return (
                        <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                          {isStatus && typeof val === 'string' ? (
                            <StatusBadge value={val} />
                          ) : (
                            <span>{formatValue(col.key, val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && data.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
