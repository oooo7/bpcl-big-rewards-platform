'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Trophy,
  Play,
  Lock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Plus,
  Eye,
  Calendar,
  Users,
  AlertCircle,
  Hash,
  Clock,
  Info,
} from 'lucide-react';

export default function DrawManagementPage() {
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('DRAW_MANAGER');

  // Modal / Detail state
  const [selectedDraw, setSelectedDraw] = useState<any | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // New Draw Config Form State
  const [newDrawName, setNewDrawName] = useState('');
  const [newDrawType, setNewDrawType] = useState('FORTNIGHTLY');
  const [newScheduledDate, setNewScheduledDate] = useState('2026-11-20T18:00');
  const [newWinnerCount, setNewWinnerCount] = useState('25');

  const fetchDraws = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/draws?userRole=${userRole}`);
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraws();
  }, [userRole]);

  const handleFreeze = async (drawId: string) => {
    setFreezingId(drawId);
    try {
      const res = await fetch('/api/v1/admin/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FREEZE',
          drawId,
          operatorId: 'draw-manager-01',
          operatorRole: userRole,
        }),
      });
      const data = await res.json();
      if (data.success) fetchDraws();
    } catch (err) {
      console.error(err);
    } finally {
      setFreezingId(null);
    }
  };

  const handleExecute = async (drawId: string) => {
    setExecutingId(drawId);
    try {
      const res = await fetch('/api/v1/admin/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXECUTE',
          drawId,
          operatorName: 'Draw Auditor',
          operatorId: 'draw-manager-01',
          operatorRole: userRole,
        }),
      });
      const data = await res.json();
      if (data.success) fetchDraws();
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingId(null);
    }
  };

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          drawName: newDrawName,
          drawType: newDrawType,
          scheduledDate: newScheduledDate,
          winnerCount: newWinnerCount,
          operatorId: 'admin-01',
          operatorRole: userRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowConfigModal(false);
        setNewDrawName('');
        fetchDraws();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Lucky Draw Engine & Audit Console</h1>
            <p className="text-xs text-slate-500">CSPRNG winner selection engine operating on immutable frozen entry snapshots</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none"
            >
              <option value="DRAW_MANAGER">Role: Draw Manager (Masked PII)</option>
              <option value="CAMPAIGN_ADMIN">Role: Campaign Admin (Unmasked PII)</option>
            </select>

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-bpcl-blue text-white rounded-xl font-bold text-xs hover:brightness-110 flex items-center gap-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4" /> Configure Draw Schedule
            </button>

            <button
              onClick={fetchDraws}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Cryptographic Selection Mechanism Notice */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <ShieldCheck className="w-5 h-5" /> Cryptographically Secure Random Selection (CSPRNG) Standard
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Winners are selected using OS hardware entropy (<code className="text-amber-300">crypto.getRandomValues</code>) with Fisher-Yates Rejection Sampling to guarantee complete non-deterministic uniformity. Each execution writes a SHA-256 audit hash into immutable storage to prevent frontend manipulation or rerun tampering.
          </p>
        </div>

        {/* Draw Schedules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {draws.map((d) => (
            <div
              key={d.id}
              className={`bg-white rounded-2xl p-6 bpcl-card-shadow border space-y-4 flex flex-col justify-between ${
                d.drawType === 'GRAND_BUMPER' ? 'border-2 border-bpcl-yellow bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black bg-bpcl-darkBlue text-bpcl-yellow px-3 py-1 rounded-full uppercase tracking-wider">
                    {d.drawType}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase ${
                      d.status === 'EXECUTED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : d.status === 'FROZEN'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{d.drawName}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-bpcl-blue" />
                    Scheduled: <span className="font-mono font-bold text-slate-800">{new Date(d.scheduledDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500 font-medium text-[11px]">Eligible Pool:</div>
                    <div className="text-base font-black text-bpcl-blue font-mono">
                      {d.totalEligibleEntries ? d.totalEligibleEntries.toLocaleString() : 'Not Frozen Yet'}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 font-medium text-[11px]">Winners Target:</div>
                    <div className="text-base font-black text-slate-900 font-mono">{d.winnerCount} Winners</div>
                  </div>
                </div>

                {d.executionHash && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-mono text-emerald-800 truncate">
                    <span className="font-bold block text-emerald-900">SHA-256 Execution Hash:</span>
                    {d.executionHash}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {d.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleFreeze(d.id)}
                    disabled={freezingId === d.id}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    {freezingId === d.id ? 'Freezing Pool Snapshot...' : 'Freeze Eligible Pool'}
                  </button>
                )}

                {d.status === 'FROZEN' && (
                  <button
                    onClick={() => handleExecute(d.id)}
                    disabled={executingId === d.id}
                    className="w-full py-2.5 bpcl-gradient-header text-white font-black text-xs rounded-xl hover:brightness-110 transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 text-bpcl-yellow" />
                    {executingId === d.id ? 'Running CSPRNG Engine...' : 'Execute CSPRNG Draw'}
                  </button>
                )}

                {d.status === 'EXECUTED' && (
                  <div className="space-y-2">
                    <div className="w-full py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Draw Executed & Winners Locked
                    </div>
                    <button
                      onClick={() => setSelectedDraw(d)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Winner Breakdown ({d.winners?.length || 0})
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View Winners Modal */}
        {selectedDraw && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-black text-xl text-bpcl-darkBlue">{selectedDraw.drawName} Winners</h3>
                  <p className="text-xs text-slate-500">Execution Hash: {selectedDraw.executionHash?.slice(0, 24)}...</p>
                </div>
                <button
                  onClick={() => setSelectedDraw(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {selectedDraw.winners && selectedDraw.winners.length > 0 ? (
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedDraw.winners.map((w: any) => (
                      <div key={w.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{w.registration?.customer?.fullName}</div>
                          <div className="font-mono text-slate-500">{w.registration?.customer?.mobileNumber}</div>
                          <div className="text-[11px] text-bpcl-blue font-semibold">
                            Station: {w.registration?.station?.name} [{w.registration?.station?.stationCode}]
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-600">{w.prizeName}</div>
                          <div className="font-mono font-bold text-emerald-700">₹{w.prizeValue?.toLocaleString('en-IN')}</div>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase border">
                            {w.verificationStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">No winners found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configure New Draw Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-lg text-bpcl-darkBlue">Configure Draw Schedule</h3>
                <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDraw} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Draw Title</label>
                  <input
                    type="text"
                    required
                    value={newDrawName}
                    onChange={(e) => setNewDrawName(e.target.value)}
                    placeholder="e.g. 5th Fortnightly Lucky Draw"
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Draw Type</label>
                    <select
                      value={newDrawType}
                      onChange={(e) => setNewDrawType(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue outline-none"
                    >
                      <option value="FORTNIGHTLY">FORTNIGHTLY</option>
                      <option value="GRAND_BUMPER">GRAND_BUMPER</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Winner Target Count</label>
                    <input
                      type="number"
                      required
                      value={newWinnerCount}
                      onChange={(e) => setNewWinnerCount(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-bpcl-blue text-white font-black rounded-xl hover:brightness-110 transition-all shadow uppercase"
                >
                  Save Draw Configuration
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
