'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Fuel,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Filter,
  Trophy,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Lock,
  Zap,
} from 'lucide-react';

export default function DSMPerformanceDashboardPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [userRole, setUserRole] = useState('CAMPAIGN_ADMIN');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [campaignId, setCampaignId] = useState('ALL');
  const [territoryId, setTerritoryId] = useState('ALL');
  const [stationId, setStationId] = useState('ALL');
  const [dsmId, setDsmId] = useState('ALL');

  // Filter Dropdowns Seed Data
  const [territories, setTerritories] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [dsms, setDsms] = useState<any[]>([]);

  const fetchFiltersSeed = async () => {
    try {
      const res = await fetch('/api/v1/admin/dsm');
      const data = await res.json();
      if (data.success) {
        setTerritories(data.territories || []);
        setStations(data.stations || []);
        setDsms(data.dsms || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPerformanceMetrics = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        userRole,
        dateFrom,
        dateTo,
        campaignId,
        territoryId,
        stationId,
        dsmId,
      });

      const res = await fetch(`/api/v1/admin/dsm/performance?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersSeed();
  }, []);

  useEffect(() => {
    fetchPerformanceMetrics();
  }, [userRole, dateFrom, dateTo, campaignId, territoryId, stationId, dsmId]);

  const kpis = metrics?.kpis || {};

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-bpcl-darkBlue">DSM & Territory Performance Dashboard</h1>
              {userRole === 'DSM' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  SCOPED DSM DATA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Real database metrics, territory rankings, station performance, and registration trends</p>
          </div>

          <div className="flex items-center gap-3">
            {/* RBAC Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300 text-xs">
              <span className="text-[10px] font-bold text-slate-500 pl-2">RBAC Mode:</span>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="bg-white font-bold text-xs text-slate-800 py-1 px-2.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="CAMPAIGN_ADMIN">Campaign Admin (Global View)</option>
                <option value="TERRITORY_MANAGER">Territory Manager (Regional View)</option>
                <option value="DSM">DSM Manager (Assigned Scoped View)</option>
              </select>
            </div>

            <button
              onClick={fetchPerformanceMetrics}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Bar */}
        <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-bpcl-darkBlue uppercase tracking-wider">
              <Filter className="w-4 h-4 text-bpcl-blue" />
              <span>Multi-Dimensional Performance Filters</span>
            </div>
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setCampaignId('ALL');
                setTerritoryId('ALL');
                setStationId('ALL');
                setDsmId('ALL');
              }}
              className="text-[11px] text-bpcl-blue hover:underline font-bold"
            >
              Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-500 block mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Territory</label>
              <select
                value={territoryId}
                onChange={(e) => setTerritoryId(e.target.value)}
                disabled={userRole === 'DSM'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none disabled:opacity-50"
              >
                <option value="ALL">All Territories</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Fuel Station</label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
              >
                <option value="ALL">All Stations</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.stationCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">DSM Manager</label>
              <select
                value={dsmId}
                onChange={(e) => setDsmId(e.target.value)}
                disabled={userRole === 'DSM'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none disabled:opacity-50"
              >
                <option value="ALL">All DSM Managers</option>
                {dsms.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Campaign</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
              >
                <option value="ALL">Sapno Ki Sawari (S2)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real DB Scoped KPI Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Total Registrations</span>
              <Users className="w-4 h-4 text-bpcl-blue" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.totalRegistrations || 0}</div>
            <div className="text-[11px] text-slate-500 font-bold">Today: <span className="text-bpcl-blue">+{kpis.todaysRegistrations || 0}</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Valid Registrations</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{kpis.validRegistrations || 0}</div>
            <div className="text-[11px] text-emerald-800 font-bold">{kpis.validationRate || 0}% Approval Rate</div>
          </div>

          <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">QR Code Scans</span>
              <QrCode className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">{kpis.totalQrScans || 0}</div>
            <div className="text-[11px] text-purple-700 font-bold">Verified Stations</div>
          </div>

          <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Total Fuel Volume</span>
              <Fuel className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">₹{kpis.totalFuelAmount?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[11px] text-amber-800 font-bold">Audited Volume</div>
          </div>

          <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Instant Rewards</span>
              <Zap className="w-4 h-4 text-bpcl-yellow" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.instantRewardsIssued || 0}</div>
            <div className="text-[11px] text-slate-500 font-bold">Coupons Dispatched</div>
          </div>

          <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Active Stations</span>
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.activeStationsCount || 0}</div>
            <div className="text-[11px] text-blue-600 font-bold">Mapped Outlets</div>
          </div>
        </div>

        {/* Trend Analytics Charts Visualizers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Trends Visualizer */}
          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-bpcl-blue" />
                Registration & Valid Trends (14 Days)
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-bpcl-blue inline-block" /> Total</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Valid</span>
              </div>
            </div>

            <div className="h-44 flex items-end justify-between gap-1 pt-4 border-b border-slate-200 pb-2">
              {metrics?.registrationTrends?.map((trend: any) => {
                const maxVal = Math.max(...metrics.registrationTrends.map((t: any) => t.total), 1);
                const totalHeight = Math.max(10, Math.round((trend.total / maxVal) * 100));
                const validHeight = Math.max(5, Math.round((trend.valid / maxVal) * 100));

                return (
                  <div key={trend.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex items-end justify-center gap-0.5 h-36">
                      <div
                        style={{ height: `${totalHeight}%` }}
                        className="w-2 bg-blue-500 rounded-t-sm transition-all group-hover:brightness-110"
                        title={`${trend.formattedDate}: ${trend.total} Submissions`}
                      />
                      <div
                        style={{ height: `${validHeight}%` }}
                        className="w-2 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-110"
                        title={`${trend.formattedDate}: ${trend.valid} Valid`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 rotate-45 sm:rotate-0">{trend.formattedDate.split(' ')[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QR Code Scan Trends Visualizer */}
          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-600" />
                QR Code Scan Engagement Trends
              </h3>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Live Scan Velocity
              </span>
            </div>

            <div className="h-44 flex items-end justify-between gap-1 pt-4 border-b border-slate-200 pb-2">
              {metrics?.qrScanTrends?.map((trend: any) => {
                const maxVal = Math.max(...metrics.qrScanTrends.map((t: any) => t.scans), 1);
                const scanHeight = Math.max(10, Math.round((trend.scans / maxVal) * 100));

                return (
                  <div key={trend.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex items-end justify-center h-36">
                      <div
                        style={{ height: `${scanHeight}%` }}
                        className="w-3.5 bg-gradient-to-t from-purple-700 to-purple-400 rounded-t-md transition-all group-hover:brightness-125"
                        title={`${trend.formattedDate}: ${trend.scans} Scans`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{trend.formattedDate.split(' ')[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Territory & Fuel Station Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Territory Performance Rankings */}
          <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Trophy className="w-4 h-4 text-amber-500" /> Territory Rankings & Performance
              </div>
              <span className="text-[11px] font-bold text-slate-500">Sorted by Valid Count</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold uppercase border-b">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Territory</th>
                    <th className="p-3 text-center">Stations</th>
                    <th className="p-3 text-right">Valid Regs</th>
                    <th className="p-3 text-right">Fuel Litres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.territoryRankings?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-3 font-extrabold">
                        {t.rank === 1 ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-300">🥇 #1</span>
                        ) : t.rank === 2 ? (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md border border-slate-300">🥈 #2</span>
                        ) : t.rank === 3 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">🥉 #3</span>
                        ) : (
                          <span className="text-slate-400">#{t.rank}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.code} • {t.state}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{t.stationCount}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-700">{t.validRegistrations}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{t.totalFuelAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DSM Manager Leaderboard */}
          <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Users className="w-4 h-4 text-bpcl-blue" /> DSM Leaderboard & Rankings
              </div>
              <span className="text-[11px] font-bold text-slate-500">District Sales Managers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold uppercase border-b">
                    <th className="p-3">Rank</th>
                    <th className="p-3">DSM Name</th>
                    <th className="p-3">Territory</th>
                    <th className="p-3 text-center">Outlets</th>
                    <th className="p-3 text-right">Valid Regs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.dsmRankings?.map((dsm: any) => (
                    <tr key={dsm.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-3 font-extrabold">
                        {dsm.rank === 1 ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-300">🥇 #1</span>
                        ) : dsm.rank === 2 ? (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md border border-slate-300">🥈 #2</span>
                        ) : dsm.rank === 3 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">🥉 #3</span>
                        ) : (
                          <span className="text-slate-400">#{dsm.rank}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{dsm.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{dsm.dsmCode}</div>
                      </td>
                      <td className="p-3 text-slate-700">{dsm.territoryName}</td>
                      <td className="p-3 text-center font-bold text-slate-700">{dsm.stationCount}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-700">{dsm.validRegistrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Fuel Station Performance Table */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <Fuel className="w-4 h-4 text-bpcl-blue" /> Fuel Station Performance & Rankings
            </div>
            <span className="text-[11px] font-bold text-slate-500">Individual Outlet Analytics</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-bold uppercase border-b">
                  <th className="p-4">Rank</th>
                  <th className="p-4">Station Code & Name</th>
                  <th className="p-4">City & Territory</th>
                  <th className="p-4">Assigned DSM</th>
                  <th className="p-4 text-center">Total Regs</th>
                  <th className="p-4 text-center">Valid Regs</th>
                  <th className="p-4 text-center">Approval Rate</th>
                  <th className="p-4 text-right">Fuel Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.stationRankings?.map((st: any) => (
                  <tr key={st.id} className="hover:bg-slate-50 font-medium">
                    <td className="p-4 font-extrabold">
                      {st.rank === 1 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-300">🥇 #1</span>
                      ) : st.rank === 2 ? (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md border border-slate-300">🥈 #2</span>
                      ) : st.rank === 3 ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">🥉 #3</span>
                      ) : (
                        <span className="text-slate-400">#{st.rank}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{st.name}</div>
                      <div className="font-mono text-[11px] text-bpcl-blue font-bold">{st.stationCode}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-900 font-bold">{st.city}</div>
                      <div className="text-[11px] text-slate-500">{st.territoryName}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">{st.dsmName}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{st.totalRegistrations}</td>
                    <td className="p-4 text-center font-black text-emerald-700">{st.validRegistrations}</td>
                    <td className="p-4 text-center font-extrabold text-blue-600">{st.validationRate}%</td>
                    <td className="p-4 text-right font-mono font-black text-slate-900">₹{st.totalFuelAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
