'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Users,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  FileText,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Lock,
  Fuel,
  MapPin,
  Building,
} from 'lucide-react';

export default function RegistrationsMasterPage() {
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [stationCode, setStationCode] = useState('ALL');
  const [territoryId, setTerritoryId] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userRole, setUserRole] = useState('VALIDATION_TEAM');

  // Modal / Detail drawer states
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Active filter options
  const [territoryOptions, setTerritoryOptions] = useState<any[]>([]);
  const [stationOptions, setStationOptions] = useState<any[]>([]);

  const fetchRegistrations = async (page = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
        stationCode,
        territoryId,
        userRole,
      });

      if (dateFrom) query.append('dateFrom', dateFrom);
      if (dateTo) query.append('dateTo', dateTo);

      const res = await fetch(`/api/v1/admin/registrations?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
        setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setSelectedRegId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/registrations/${id}?userRole=${userRole}`);
      const json = await res.json();
      if (json.success) {
        setDetailData(json.registration);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations(1);
  }, [status, stationCode, territoryId, dateFrom, dateTo, userRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegistrations(1);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'VALID':
      case 'REWARD_ISSUED':
      case 'REWARD_ELIGIBLE':
      case 'DRAW_ELIGIBLE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">VALID</span>;
      case 'PENDING':
      case 'UNDER_VALIDATION':
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">PENDING</span>;
      case 'REJECTED':
      case 'INVALID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">REJECTED</span>;
      case 'FRAUD_FLAGGED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">FRAUD FLAGGED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border">{st}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Customer Registrations Master</h1>
            <p className="text-xs text-slate-500">Query, search, filter, inspect bills, and trace audit logs for all fuel entries</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none"
              title="Active Role for Privacy Masking"
            >
              <option value="CAMPAIGN_ADMIN">Role: Campaign Admin (Unmasked PII)</option>
              <option value="VALIDATION_TEAM">Role: Validation Officer (Masked PII)</option>
              <option value="DSM">Role: DSM (Territory Masked)</option>
              <option value="AUDITOR">Role: Auditor (Read-Only Masked)</option>
            </select>
            <button
              onClick={() => fetchRegistrations(pagination.page)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bill #, Vehicle #, Customer Name, Mobile..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-bpcl-blue outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-bpcl-blue outline-none"
              >
                <option value="ALL">Status: All Records</option>
                <option value="VALID">Status: Valid</option>
                <option value="UNDER_VALIDATION">Status: Pending Validation</option>
                <option value="REJECTED">Status: Rejected</option>
                <option value="FRAUD_FLAGGED">Status: Fraud Flagged</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Start Date"
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-bpcl-blue outline-none text-slate-700"
              />
            </div>

            {/* Submit Filter Button */}
            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-bpcl-blue text-white rounded-xl font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Filter className="w-3.5 h-3.5" /> Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Registrations Master Table */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Station & Territory</th>
                  <th className="p-4">Vehicle & Fuel</th>
                  <th className="p-4">Bill No. & Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading customer registrations...</div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-sm text-slate-800">No Registrations Found</div>
                      <div className="text-xs text-slate-400">Try broadening your search query or removing status filters.</div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {item.customer?.fullName}
                          {item.customer?.isMasked && (
                            <span title="PII Masked by RBAC Rule"><Lock className="w-3 h-3 text-amber-500" /></span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">{item.customer?.mobileNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">
                          <span className="font-mono text-bpcl-blue font-bold mr-1">[{item.station?.stationCode}]</span>
                          {item.station?.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.station?.territory?.name || 'Gujarat Zone'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{item.vehicleNumber}</div>
                        <div className="text-[11px] text-slate-500 uppercase">{item.vehicleType} • {item.fuelType}</div>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="font-bold text-bpcl-blue">{item.billNumber}</div>
                        <div className="text-emerald-700 font-bold">₹{item.fuelAmount}</div>
                      </td>
                      <td className="p-4">{getStatusBadge(item.status)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => fetchDetail(item.id)}
                          className="px-3 py-1.5 bg-bpcl-blue text-white rounded-lg font-bold text-xs hover:brightness-110 flex items-center gap-1 ml-auto shadow-sm transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {!loading && items.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-900">{items.length}</span> of <span className="font-bold text-slate-900">{pagination.total}</span> entries (Page {pagination.page} of {pagination.totalPages})
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRegistrations(pagination.page - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg disabled:opacity-40 hover:bg-slate-100 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchRegistrations(pagination.page + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg disabled:opacity-40 hover:bg-slate-100 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Slide-Over Modal */}
        {selectedRegId && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full bpcl-card-shadow border-2 border-bpcl-yellow max-h-[90vh] overflow-y-auto space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-black text-xl text-bpcl-darkBlue">Registration Audit Inspection</h3>
                  <p className="text-xs text-slate-500">Full audit history, bill details, and customer information</p>
                </div>
                <button
                  onClick={() => { setSelectedRegId(null); setDetailData(null); }}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold p-2"
                >
                  ✕
                </button>
              </div>

              {detailLoading || !detailData ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="inline-block w-8 h-8 border-3 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
                  <div>Loading audit details...</div>
                </div>
              ) : (
                <div className="space-y-6 text-xs">
                  {/* Customer Information Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-bpcl-blue" /> Customer Profile
                      </div>
                      {detailData.customer?.isMasked ? (
                        <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          <Lock className="w-3 h-3" /> PII Masked (Role Restriction)
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          Unmasked PII Authorized
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Full Name:</span>
                        <span className="font-bold text-slate-900 text-sm">{detailData.customer?.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Mobile Number:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{detailData.customer?.mobileNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fuel & Bill Details */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                      <Fuel className="w-4 h-4 text-emerald-600" /> Fuel Transaction & Station Detail
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-500 block">Station:</span>
                        <span className="font-bold text-slate-900">{detailData.station?.name} ({detailData.station?.stationCode})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Vehicle:</span>
                        <span className="font-bold text-slate-900">{detailData.vehicleNumber} ({detailData.vehicleType})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Fuel Type & Amount:</span>
                        <span className="font-bold text-emerald-700">{detailData.fuelType} • ₹{detailData.fuelAmount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bill Invoice #:</span>
                        <span className="font-mono font-bold text-bpcl-blue">{detailData.billNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">OCR Score:</span>
                        <span className="font-bold text-purple-700">
                          {detailData.bill?.ocrConfidence ? `${(detailData.bill.ocrConfidence * 100).toFixed(0)}% Match` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Validation Status:</span>
                        <span className="font-extrabold text-slate-900 uppercase">{detailData.bill?.validationStatus || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit History Log Timeline */}
                  <div className="space-y-3">
                    <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                      <Clock className="w-4 h-4 text-bpcl-blue" /> Immutable System Audit History
                    </div>

                    {detailData.auditLogs && detailData.auditLogs.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {detailData.auditLogs.map((log: any) => (
                          <div key={log.id} className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-bpcl-blue">{log.action}</span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Actor: <span className="font-bold">{log.actor?.name || 'System'}</span> ({log.actorRole}) • IP: {log.ipAddress || '127.0.0.1'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                        No manual review audit events logged yet for this registration.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
