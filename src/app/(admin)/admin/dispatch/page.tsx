'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Truck,
  Package,
  Camera,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  MapPin,
  FileCheck,
  ChevronRight,
  Lock,
  ArrowRight,
} from 'lucide-react';

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispatch, setSelectedDispatch] = useState<any | null>(null);
  const [userRole, setUserRole] = useState('FULFILLMENT_TEAM');

  // Delivery Verification States
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('/samples/delivery_proof.jpg');
  const [signatureUrl, setSignatureUrl] = useState('/samples/signature.png');
  const [processing, setProcessing] = useState(false);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/dispatches?userRole=${userRole}`);
      const data = await res.json();
      if (data.success) {
        setDispatches(data.dispatches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, [userRole]);

  const handleUpdateStatus = async (dispatchId: string, nextStatus: string) => {
    try {
      const res = await fetch('/api/v1/admin/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          dispatchId,
          nextStatus,
          actorRole: userRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Shipment status advanced to ${nextStatus}`);
        fetchDispatches();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDeliveryOtp = async (dispatch: any) => {
    setSelectedDispatch(dispatch);
    setDemoOtp(null);
    setDeliveryOtp('');
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/admin/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_DELIVERY_OTP', dispatchId: dispatch.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDemoOtp(data.demoOtp || '654321');
        setStatusMsg(`Delivery verification OTP sent to receiver ${data.mobileNumber}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyDeliveryOtp = async () => {
    if (!selectedDispatch || !deliveryOtp) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/admin/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_DELIVERY_OTP',
          dispatchId: selectedDispatch.id,
          otpInput: deliveryOtp,
          photoUrl,
          signatureUrl,
          actorRole: userRole,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || 'Invalid delivery OTP code');
        setProcessing(false);
        return;
      }

      setSelectedDispatch(null);
      setDeliveryOtp('');
      setDemoOtp(null);
      setStatusMsg('Delivery successfully completed, photo/signature proof attached, and audit closed!');
      fetchDispatches();
    } catch (err: any) {
      setErrorMsg('Error verifying delivery OTP');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DELIVERED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">DELIVERED & AUDITED</span>;
      case 'IN_TRANSIT':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">IN TRANSIT TO WINNER</span>;
      case 'RECEIVED_NODAL':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-bpcl-blue border border-blue-300">RECEIVED AT NODAL DEPOT</span>;
      case 'MATERIAL_SENT_NODAL':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">SENT TO NODAL DEPOT</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border">DISPATCH CREATED</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Prize Dispatch & Delivery Pipeline</h1>
            <p className="text-xs text-slate-500">Controlled state transitions from Nodal Depot to Receiver Handover with Receiver OTP & Audit Proof</p>
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
              onClick={fetchDispatches}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Dispatches
            </button>
          </div>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
          </div>
        )}

        {/* Dispatches Table */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase">
                  <th className="p-4">Tracking No.</th>
                  <th className="p-4">Prize Title</th>
                  <th className="p-4">Receiver & Mobile</th>
                  <th className="p-4">Nodal Point Depot</th>
                  <th className="p-4">Shipment Status</th>
                  <th className="p-4 text-right">Controlled Transition Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading dispatches records...</div>
                    </td>
                  </tr>
                ) : dispatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-sm text-slate-800">No Dispatches Created Yet</div>
                      <div className="text-xs text-slate-400">Verify winners in the Winner Console to trigger shipment dispatches.</div>
                    </td>
                  </tr>
                ) : (
                  dispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-bpcl-blue">{d.trackingNumber}</td>
                      <td className="p-4 font-extrabold text-slate-900">{d.prizeName}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          {d.receiverName}
                          {d.winner?.registration?.customer?.isMasked && <span title="PII Masked"><Lock className="w-3 h-3 text-amber-500" /></span>}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">{d.receiverMobile}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{d.nodalPoint}</td>
                      <td className="p-4">{getStatusBadge(d.dispatchStatus)}</td>
                      <td className="p-4 text-right">
                        {d.dispatchStatus === 'DISPATCH_CREATED' && (
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'MATERIAL_SENT_NODAL')}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1 ml-auto shadow-sm"
                          >
                            Send Material to Nodal <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {d.dispatchStatus === 'MATERIAL_SENT_NODAL' && (
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'IN_TRANSIT')}
                            className="px-3 py-1.5 bg-bpcl-blue text-white rounded-lg font-bold text-xs hover:brightness-110 flex items-center gap-1 ml-auto shadow-sm"
                          >
                            Mark In-Transit <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {d.dispatchStatus === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleSendDeliveryOtp(d)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 ml-auto shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Verify Receiver OTP
                          </button>
                        )}

                        {d.dispatchStatus === 'DELIVERED' && (
                          <div className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Delivered & Audit Closed
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

        {/* Receiver Delivery Verification Modal */}
        {selectedDispatch && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Camera className="w-6 h-6 text-emerald-700" />
              </div>

              <div>
                <h3 className="font-black text-xl text-bpcl-darkBlue">Receiver Delivery Handover Proof</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter receiver delivery OTP ({selectedDispatch.receiverMobile}) and capture handover proof
                </p>
              </div>

              {demoOtp && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-900">
                  <span className="font-bold">RECEIVER DELIVERY OTP:</span>{' '}
                  <span className="text-base font-black text-bpcl-blue">{demoOtp}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                  {errorMsg}
                </div>
              )}

              <input
                type="text"
                maxLength={6}
                value={deliveryOtp}
                onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="654321"
                className="w-full text-center text-3xl font-mono tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-300 focus:border-bpcl-blue outline-none"
              />

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                <div className="font-bold text-slate-800">Delivery Proof Assets:</div>
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span>Photo Handover Proof:</span>
                  <span className="font-mono text-emerald-700 font-bold">Attached (JPG)</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span>Electronic Signature Canvas:</span>
                  <span className="font-mono text-emerald-700 font-bold">Attached (PNG)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispatch(null)}
                  className="py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing || !deliveryOtp}
                  onClick={handleVerifyDeliveryOtp}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow disabled:opacity-50"
                >
                  {processing ? 'Verifying...' : 'Complete & Close Audit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
