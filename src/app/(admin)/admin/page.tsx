'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Users,
  FileCheck,
  Gift,
  Trophy,
  ArrowUpRight,
  BarChart3,
  Clock,
  RefreshCw,
  Fuel,
  MapPin,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/kpis');
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data);
      } else {
        setError(json.error || 'Failed to load dashboard metrics');
      }
    } catch (err: any) {
      setError('Unable to fetch live database metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const kpis = metrics?.kpis || {
    totalRegistrations: 0,
    todaysRegistrations: 0,
    totalQrScans: 0,
    validRegistrations: 0,
    pendingValidation: 0,
    instantRewardsIssued: 0,
    totalFuelAmount: 0,
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* Admin Navigation Sidebar */}
      <AdminSidebar />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live DB Metrics Synchronized
            </div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Campaign Executive Control Center</h1>
            <p className="text-xs text-slate-500">BPCL BIG REWARDS (Sapno Ki Sawari - Season 2)</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchMetrics}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link
              href="/admin/bills"
              className="px-4 py-2 bg-bpcl-blue text-white rounded-xl font-bold text-xs hover:brightness-110 transition-all shadow"
            >
              Verify Bills ({kpis.pendingValidation})
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={fetchMetrics} className="underline hover:text-rose-950">
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && !metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse h-28 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* 7 Core Database-Backed Metric Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Registrations */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Registrations</span>
                <Users className="w-5 h-5 text-bpcl-blue" />
              </div>
              <div className="text-3xl font-black text-bpcl-darkBlue">{kpis.totalRegistrations.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> {kpis.todaysRegistrations} Registered Today
              </div>
            </div>

            {/* 2. Today's Registrations */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Today's Registrations</span>
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-700">{kpis.todaysRegistrations.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Since 00:00 midnight
              </div>
            </div>

            {/* 3. QR Scans */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total QR Scans</span>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-purple-700">{kpis.totalQrScans.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Across active stations
              </div>
            </div>

            {/* 4. Valid Registrations */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Valid Registrations</span>
                <FileCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-600">{kpis.validRegistrations.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Verified fuel bills
              </div>
            </div>

            {/* 5. Pending Validation */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Validation</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600">{kpis.pendingValidation.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Awaiting manual check
              </div>
            </div>

            {/* 6. Instant Rewards */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Instant Rewards</span>
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600">{kpis.instantRewardsIssued.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Issued vouchers
              </div>
            </div>

            {/* 7. Total Fuel Amount */}
            <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 sm:col-span-2">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Fuel Value (₹)</span>
                <Fuel className="w-5 h-5 text-bpcl-blue" />
              </div>
              <div className="text-3xl font-black text-bpcl-blue">
                ₹{kpis.totalFuelAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                (₹{(kpis.totalFuelAmount / 100000).toFixed(2)} Lakh total validated fuel volume)
              </div>
            </div>
          </div>
        )}

        {/* Charts & Analytics Section */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Registrations Over Time Trend */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Registrations Over Time</h3>
                  <p className="text-xs text-slate-500">Daily registration volume for the last 14 days</p>
                </div>
                <span className="text-xs font-bold text-bpcl-blue bg-blue-50 px-3 py-1 rounded-full">
                  Daily Volume
                </span>
              </div>

              {metrics.registrationsOverTime && metrics.registrationsOverTime.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-end gap-2 h-40 pt-4 px-2 border-b border-slate-200">
                    {metrics.registrationsOverTime.map((item: any) => {
                      const maxVal = Math.max(...metrics.registrationsOverTime.map((d: any) => d.count), 1);
                      const pct = Math.max(8, Math.round((item.count / maxVal) * 100));
                      return (
                        <div key={item.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow font-bold whitespace-nowrap transition-opacity pointer-events-none z-10">
                            {item.count} Regs ({item.formattedDate})
                          </div>
                          <div
                            style={{ height: `${pct}%` }}
                            className="w-full bg-gradient-to-t from-bpcl-blue to-blue-500 hover:from-amber-400 hover:to-amber-500 rounded-t transition-all"
                          />
                          <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                            {item.formattedDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No trend data logged yet</div>
              )}
            </div>

            {/* Territory Performance */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Territory Performance</h3>
                  <p className="text-xs text-slate-500">Breakdown by state zones</p>
                </div>
                <MapPin className="w-5 h-5 text-bpcl-blue" />
              </div>

              <div className="space-y-4 text-xs">
                {metrics.territoryPerformance?.map((t: any) => {
                  const maxRegs = Math.max(...metrics.territoryPerformance.map((x: any) => x.registrationCount), 1);
                  const widthPct = Math.max(5, Math.round((t.registrationCount / maxRegs) * 100));
                  return (
                    <div key={t.id} className="space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{t.name} ({t.code})</span>
                        <span className="text-bpcl-blue font-mono">{t.registrationCount} Regs</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-bpcl-blue h-3 rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{t.stationCount} Stations</span>
                        <span>₹{t.totalFuel.toLocaleString('en-IN')} Fuel</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Station Performance & Reward Summary */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Station Performance Table */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Top Station Performance</h3>
                  <p className="text-xs text-slate-500">Highest registration volume fuel stations</p>
                </div>
                <Fuel className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase border-b">
                      <th className="p-3">Code & Station</th>
                      <th className="p-3">Territory</th>
                      <th className="p-3 text-right">Registrations</th>
                      <th className="p-3 text-right">Total Fuel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.stationPerformance?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          <span className="font-mono text-bpcl-blue font-bold mr-1">[{s.stationCode}]</span>
                          {s.name}
                        </td>
                        <td className="p-3 text-slate-500">{s.territoryName}</td>
                        <td className="p-3 font-mono font-bold text-right text-slate-800">
                          {s.registrationCount}
                        </td>
                        <td className="p-3 font-mono font-bold text-right text-emerald-700">
                          ₹{s.totalFuel.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instant Rewards Overview */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Reward Inventory Summary</h3>
                  <p className="text-xs text-slate-500">Stock availability and distribution</p>
                </div>
                <Gift className="w-5 h-5 text-amber-500" />
              </div>

              <div className="space-y-3">
                {metrics.rewardSummary?.map((r: any) => (
                  <div key={r.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{r.title}</span>
                      <span className="text-amber-600 font-mono">₹{r.unitValue}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                      <div>Total: <span className="font-mono font-bold text-slate-900">{r.totalQuantity}</span></div>
                      <div>Issued: <span className="font-mono font-bold text-amber-600">{r.issuedQuantity}</span></div>
                      <div>Available: <span className="font-mono font-bold text-emerald-600">{r.availableQuantity}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
