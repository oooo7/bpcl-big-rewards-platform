'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Lock,
  Trophy,
  ShieldCheck,
  Fuel,
  KeyRound,
  Truck,
  AlertCircle,
  Clock,
  Package,
} from 'lucide-react';

export default function WinnersVerificationPage() {
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [userRole, setUserRole] = useState('FULFILLMENT_TEAM');

  // Winner OTP & Allocation Modal State
  const [selectedWinner, setSelectedWinner] = useState<any | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchWinners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/winners?search=${encodeURIComponent(search)}&status=${status}&userRole=${userRole}`);
      const data = await res.json();
      if (data.success) {
        setWinners(data.winners || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();
  }, [status, userRole]);

  const handleInitiateOtp = async (winner: any) => {
    setSelectedWinner(winner);
    setOtpSent(false);
    setDemoOtp(null);
    setOtpInput('');
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/admin/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'INITIATE_OTP', winnerId: winner.id }),
      });
      const data = await res.json();

      if (data.success) {
        setOtpSent(true);
        setDemoOtp(data.demoOtp || '123456');
        setStatusMsg(`Verification OTP sent to winner mobile ${data.mobileNumber}`);
      } else {
        setErrorMsg(data.error || 'Failed to initiate OTP verification');
      }
    } catch (err: any) {
      setErrorMsg('Network error initiating OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedWinner || !otpInput) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/admin/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          winnerId: selectedWinner.id,
          otpInput,
          actorRole: userRole,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || 'Invalid OTP code entered');
        setOtpAttempts((prev) => prev + 1);
        setProcessing(false);
        return;
      }

      // Step 2: Allocate Prize & Create Dispatch
      await fetch('/api/v1/admin/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_DISPATCH',
          winnerId: selectedWinner.id,
          actorRole: userRole,
        }),
      });

      setSelectedWinner(null);
      setOtpInput('');
      setStatusMsg('Winner verified successfully and dispatch order created!');
      fetchWinners();
    } catch (err: any) {
      setErrorMsg('Error verifying OTP');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'VERIFIED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">VERIFIED</span>;
      case 'DISPATCHED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-bpcl-blue border border-blue-300">DISPATCHED</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">DELIVERED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">PENDING VERIFICATION</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Winner Verification Console</h1>
            <p className="text-xs text-slate-500">Perform 2-Factor OTP Claim Verification, atomic prize allocation, and trigger shipment orders</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none"
            >
              <option value="FULFILLMENT_TEAM">Role: Fulfillment Lead (Masked PII)</option>
              <option value="CAMPAIGN_ADMIN">Role: Campaign Admin (Unmasked PII)</option>
            </select>

            <button
              onClick={fetchWinners}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Status Message Alert */}
        {statusMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
          <form onSubmit={(e) => { e.preventDefault(); fetchWinners(); }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bill #, Customer Name, Mobile..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-bpcl-blue outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-bpcl-blue outline-none"
              >
                <option value="ALL">Status: All Winners</option>
                <option value="PENDING_VERIFICATION">Status: Pending Verification</option>
                <option value="VERIFIED">Status: Verified</option>
                <option value="DISPATCHED">Status: Dispatched</option>
                <option value="DELIVERED">Status: Delivered</option>
              </select>
            </div>
          </form>
        </div>

        {/* Winners Table */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-4">Draw Name & Type</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Station & Bill #</th>
                  <th className="p-4">Prize & Value</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading winner records...</div>
                    </td>
                  </tr>
                ) : winners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                      <div className="font-bold text-sm text-slate-800">No Winners Found</div>
                      <div className="text-xs text-slate-400">Execute lucky draw schedules to select winners.</div>
                    </td>
                  </tr>
                ) : (
                  winners.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{w.draw?.drawName}</div>
                        <span className="text-[10px] bg-slate-100 font-extrabold text-slate-700 px-2 py-0.5 rounded-full uppercase border">
                          {w.draw?.drawType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          {w.registration?.customer?.fullName}
                          {w.registration?.customer?.isMasked && <span title="PII Masked"><Lock className="w-3 h-3 text-amber-500" /></span>}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">{w.registration?.customer?.mobileNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{w.registration?.station?.name}</div>
                        <div className="font-mono text-bpcl-blue text-[11px]">Bill: {w.registration?.billNumber}</div>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="font-bold text-amber-600">{w.prizeName}</div>
                        <div className="font-bold text-emerald-700">₹{w.prizeValue?.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="p-4">{getStatusBadge(w.verificationStatus)}</td>
                      <td className="p-4 text-right">
                        {w.verificationStatus === 'PENDING_VERIFICATION' ? (
                          <button
                            onClick={() => handleInitiateOtp(w)}
                            className="px-3.5 py-1.5 bg-bpcl-blue text-white rounded-lg font-bold text-xs hover:brightness-110 flex items-center gap-1.5 ml-auto shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Initiate Claim OTP
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Verified</span>
                            <Link href="/admin/dispatch" className="text-bpcl-blue underline text-[11px]">Track Shipment</Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OTP Verification & Prize Allocation Modal */}
        {selectedWinner && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <KeyRound className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-black text-xl text-bpcl-darkBlue">Winner 2-Factor OTP Claim Verification</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter 6-digit claim code sent to winner mobile ({selectedWinner.registration?.customer?.mobileNumber})
                </p>
              </div>

              {demoOtp && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-900">
                  <span className="font-bold">DEMO OTP (Dev Environment):</span>{' '}
                  <span className="text-base font-black text-bpcl-blue">{demoOtp}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center justify-between">
                  <span>{errorMsg}</span>
                  <span className="text-[10px] text-rose-600 font-mono">Attempts: {otpAttempts}/3</span>
                </div>
              )}

              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-3xl font-mono tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-300 focus:border-bpcl-blue outline-none"
              />

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                <div className="font-bold text-slate-900">{selectedWinner.prizeName}</div>
                <div className="text-[11px] text-slate-500">
                  Prize allocation uses atomic stock validation (<code className="text-emerald-700">availableStock &gt;= 1</code>). Stock will never become negative.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWinner(null)}
                  className="py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing || !otpInput}
                  onClick={handleVerifyOtp}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow disabled:opacity-50"
                >
                  {processing ? 'Verifying...' : 'Verify OTP & Allocate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
