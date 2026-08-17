'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Gift,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ticket,
  CheckCircle2,
  Lock,
  Fuel,
  TrendingUp,
} from 'lucide-react';

export default function InstantRewardsPage() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [rewardType, setRewardType] = useState('ALL');
  const [userRole, setUserRole] = useState('READ_ONLY_MGMT');

  const fetchRewards = async (page = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        rewardType,
        userRole,
      });

      const res = await fetch(`/api/v1/admin/rewards?${query.toString()}`);
      const json = await res.json();

      if (json.success) {
        setInventories(json.inventories || []);
        setTransactions(json.transactions || []);
        setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards(1);
  }, [rewardType, userRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRewards(1);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole={userRole} />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Instant Rewards Management</h1>
            <p className="text-xs text-slate-500">Monitor fuel vouchers, merchandise stock inventory, and coupon issuance transactions</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none"
            >
              <option value="CAMPAIGN_ADMIN">Role: Campaign Admin (Unmasked PII)</option>
              <option value="READ_ONLY_MGMT">Role: Management (Masked PII)</option>
            </select>
            <button
              onClick={() => fetchRewards(pagination.page)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Inventory Overview Stock Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventories.map((inv) => (
            <div key={inv.id} className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-bpcl-darkBlue tracking-wide">{inv.title}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 font-mono">
                  ₹{inv.unitValue} Unit
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Total Stock</div>
                  <div className="font-mono font-black text-slate-900 text-base">{inv.totalQuantity}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Issued</div>
                  <div className="font-mono font-black text-amber-600 text-base">{inv.issuedQuantity}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Available</div>
                  <div className="font-mono font-black text-emerald-600 text-base">{inv.availableQuantity}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Coupon Code, Bill #, Customer Name, Mobile..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-bpcl-blue outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-bpcl-blue text-white rounded-xl font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Filter className="w-3.5 h-3.5" /> Search Transactions
              </button>
            </div>
          </form>
        </div>

        {/* Issued Transactions Log Table */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="p-4">Issued Timestamp</th>
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Reward Type & Value</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Station & Bill #</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading reward transactions...</div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-sm text-slate-800">No Reward Transactions Found</div>
                      <div className="text-xs text-slate-400">Transactions appear here when customer scratch card rewards are claimed.</div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-slate-500">
                        {new Date(tx.issuedAt).toLocaleDateString()} {new Date(tx.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-600">
                        {tx.couponCode}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{tx.reward?.title}</div>
                        <div className="font-mono text-emerald-700 font-bold">₹{tx.reward?.unitValue}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          {tx.registration?.customer?.fullName}
                          {tx.registration?.customer?.isMasked && <span title="PII Masked"><Lock className="w-3 h-3 text-amber-500" /></span>}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">{tx.registration?.customer?.mobileNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{tx.registration?.station?.name}</div>
                        <div className="font-mono text-bpcl-blue text-[11px]">Bill: {tx.registration?.billNumber}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && transactions.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-900">{transactions.length}</span> of <span className="font-bold text-slate-900">{pagination.total}</span> transactions
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRewards(pagination.page - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg disabled:opacity-40 hover:bg-slate-100 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchRewards(pagination.page + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg disabled:opacity-40 hover:bg-slate-100 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
