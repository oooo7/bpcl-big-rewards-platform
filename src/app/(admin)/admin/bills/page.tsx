'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  Scan,
  ShieldAlert,
  Lock,
  Fuel,
  Info,
} from 'lucide-react';

export default function BillVerificationPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState('VALIDATION_TEAM');

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/bills?search=${encodeURIComponent(search)}&userRole=${userRole}`);
      const data = await res.json();
      if (data.success) {
        setBills(data.bills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [userRole]);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedBill) return;
    setProcessing(true);

    try {
      const res = await fetch('/api/v1/admin/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: selectedBill.id,
          action,
          reviewerNotes,
          actorId: 'user-val-01',
          actorRole: userRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedBill(null);
        setReviewerNotes('');
        fetchBills();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Bill Verification Queue</h1>
            <p className="text-xs text-slate-500">Review fuel receipt uploads flagged for manual validation, low OCR score, or duplicate flags</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none"
            >
              <option value="VALIDATION_TEAM">Role: Validation Officer (Masked PII)</option>
              <option value="CAMPAIGN_ADMIN">Role: Campaign Admin (Unmasked PII)</option>
            </select>
            <button
              onClick={fetchBills}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
            </button>
          </div>
        </div>

        {/* Table of Pending Bills */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Customer & Mobile</th>
                  <th className="p-4">Station</th>
                  <th className="p-4">Bill No. & Claimed Amount</th>
                  <th className="p-4">OCR Extracted Data</th>
                  <th className="p-4">Fraud Flags</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading pending verification queue...</div>
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <div className="font-bold text-sm text-slate-800">Verification Queue is Empty</div>
                      <div className="text-xs text-slate-400">All submitted fuel receipts have been processed.</div>
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => {
                    const conf = Math.round((bill.ocrConfidence || 0.85) * 100);
                    const ocrMatch = bill.ocrAmount && bill.registration?.fuelAmount && bill.ocrAmount === bill.registration.fuelAmount;
                    const fraudFlags = bill.registration?.fraudFlags || [];

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-slate-500">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            {bill.registration?.customer?.fullName}
                            {bill.registration?.customer?.isMasked && <span title="PII Masked"><Lock className="w-3 h-3 text-amber-500" /></span>}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">{bill.registration?.customer?.mobileNumber}</div>
                        </td>
                        <td className="p-4 text-slate-700 font-medium">
                          <div className="font-bold">{bill.registration?.station?.name}</div>
                          <div className="font-mono text-[11px] text-bpcl-blue">[{bill.registration?.station?.stationCode}]</div>
                        </td>
                        <td className="p-4 font-mono">
                          <div className="font-bold text-bpcl-blue">{bill.registration?.billNumber}</div>
                          <div className="text-emerald-700 font-bold">₹{bill.registration?.fuelAmount}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                conf >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {conf}% Confidence
                            </span>
                            {ocrMatch ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                OCR Match
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                OCR Check
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {fraudFlags.length > 0 ? (
                            <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3 text-rose-600" /> {fraudFlags.length} Flagged
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Clean</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="px-3.5 py-1.5 bg-bpcl-blue text-white rounded-lg font-bold text-xs hover:brightness-110 flex items-center gap-1 ml-auto shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect & Validate
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Bill Verification Modal */}
        {selectedBill && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-black text-xl text-bpcl-darkBlue">Receipt Manual Validation</h3>
                  <p className="text-xs text-slate-500">Cross-reference OCR scan, fraud risk indicators, and claimed fuel details</p>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Bill Receipt Preview Mock Frame */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <FileText className="w-4 h-4" /> Receipt Image Preview ({selectedBill.fileFormat || 'JPG'})
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">HASH: {selectedBill.fileHash?.slice(0, 16)}...</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2 font-mono text-xs text-slate-300">
                  <div className="font-black text-amber-400 text-sm uppercase">*** BHARAT PETROLEUM RECEIPT ***</div>
                  <div>STATION: {selectedBill.registration?.station?.name} [{selectedBill.registration?.station?.stationCode}]</div>
                  <div>INVOICE NO: <span className="text-white font-bold">{selectedBill.registration?.billNumber}</span></div>
                  <div>AMOUNT: <span className="text-emerald-400 font-bold">₹{selectedBill.registration?.fuelAmount}</span></div>
                  <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
                    OCR SCAN CONFIDENCE: {Math.round((selectedBill.ocrConfidence || 0.85) * 100)}%
                  </div>
                </div>
              </div>

              {/* OCR vs Claimed Comparison */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Customer Claimed Amount:</span>
                  <span className="font-mono font-bold text-slate-900 text-base">₹{selectedBill.registration?.fuelAmount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">OCR Extracted Amount:</span>
                  <span className="font-mono font-bold text-purple-700 text-base">
                    ₹{selectedBill.ocrAmount || selectedBill.registration?.fuelAmount}
                  </span>
                </div>
              </div>

              {/* Reviewer Notes Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reviewer Validation Notes
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="e.g. Receipt verified against station terminal logs"
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-bpcl-blue outline-none"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleAction('REJECT')}
                  disabled={processing}
                  className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject Bill Receipt
                </button>
                <button
                  onClick={() => handleAction('APPROVE')}
                  disabled={processing}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Fuel Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
