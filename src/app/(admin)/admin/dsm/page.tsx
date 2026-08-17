'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Users,
  Search,
  Plus,
  Edit,
  MapPin,
  Fuel,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function DSMManagementPage() {
  const [dsms, setDsms] = useState<any[]>([]);
  const [territories, setTerritories] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState('ALL');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Create / Edit DSM Modal State
  const [isDsmModalOpen, setIsDsmModalOpen] = useState(false);
  const [editingDsm, setEditingDsm] = useState<any | null>(null);
  const [dsmForm, setDsmForm] = useState({
    dsmCode: '',
    name: '',
    email: '',
    mobile: '',
    territoryId: '',
  });

  // Assign Stations Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDsmForAssign, setSelectedDsmForAssign] = useState<any | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  const fetchDsmData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/dsm?territoryId=${selectedTerritory}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setDsms(data.dsms || []);
        setTerritories(data.territories || []);
        setStations(data.stations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDsmData();
  }, [selectedTerritory]);

  const handleOpenCreateModal = () => {
    setEditingDsm(null);
    setDsmForm({
      dsmCode: `DSM-${Math.floor(Math.random() * 900) + 100}`,
      name: '',
      email: '',
      mobile: '',
      territoryId: territories[0]?.id || '',
    });
    setIsDsmModalOpen(true);
  };

  const handleOpenEditModal = (dsm: any) => {
    setEditingDsm(dsm);
    setDsmForm({
      dsmCode: dsm.dsmCode,
      name: dsm.name,
      email: dsm.email,
      mobile: dsm.mobile,
      territoryId: dsm.territoryId,
    });
    setIsDsmModalOpen(true);
  };

  const handleSaveDsm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/dsm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingDsm ? 'UPDATE_DSM' : 'CREATE_DSM',
          id: editingDsm?.id,
          ...dsmForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(editingDsm ? 'DSM updated successfully' : 'DSM created successfully');
        setIsDsmModalOpen(false);
        fetchDsmData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAssignModal = (dsm: any) => {
    setSelectedDsmForAssign(dsm);
    setSelectedStationIds(dsm.stations.map((s: any) => s.id));
    setIsAssignModalOpen(true);
  };

  const handleSaveStationAssignments = async () => {
    if (!selectedDsmForAssign) return;
    try {
      const res = await fetch('/api/v1/admin/dsm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_STATIONS',
          id: selectedDsmForAssign.id,
          stationIds: selectedStationIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Updated fuel station assignments for DSM ${selectedDsmForAssign.name}`);
        setIsAssignModalOpen(false);
        fetchDsmData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <AdminSidebar userRole="CAMPAIGN_ADMIN" />

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">District Sales Manager (DSM) Console</h1>
            <p className="text-xs text-slate-500">Manage DSM profiles, territory mappings, and fuel station assignments</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/dsm/dashboard"
              className="px-4 py-2 bg-bpcl-blue text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm hover:brightness-110"
            >
              <BarChart2 className="w-4 h-4" /> DSM Performance Analytics
            </Link>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New DSM
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

        {/* Filter & Search Bar */}
        <div className="bg-white p-5 rounded-2xl bpcl-card-shadow border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DSM Name, Code, Email, Mobile..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-bpcl-blue outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-bpcl-blue outline-none"
            >
              <option value="ALL">Territory: All Territories</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* DSM List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full p-12 text-center text-slate-400">
              <div className="inline-block w-6 h-6 border-2 border-bpcl-blue border-t-transparent rounded-full animate-spin mb-2" />
              <div>Loading DSM records...</div>
            </div>
          ) : dsms.length === 0 ? (
            <div className="col-span-full p-12 bg-white rounded-2xl text-center text-slate-500 border">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-sm text-slate-800">No DSM Records Found</div>
              <div className="text-xs text-slate-400">Click "Add New DSM" to register a District Sales Manager.</div>
            </div>
          ) : (
            dsms.map((dsm) => (
              <div key={dsm.id} className="bg-white rounded-2xl p-6 bpcl-card-shadow border border-slate-200 flex flex-col justify-between space-y-4 hover:border-bpcl-blue transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-black text-bpcl-blue bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                      {dsm.dsmCode}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(dsm)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                      title="Edit DSM Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-black text-lg text-slate-900">{dsm.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{dsm.email} • {dsm.mobile}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-medium">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Territory: <strong className="text-slate-900">{dsm.territoryName}</strong></span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Fuel Stations</div>
                      <div className="font-extrabold text-slate-900 text-sm">{dsm.stationCount} Stations</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Registrations</div>
                      <div className="font-extrabold text-emerald-700 text-sm">{dsm.totalRegistrations}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAssignModal(dsm)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-bpcl-blue hover:text-white text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Fuel className="w-4 h-4" /> Manage Station Assignments
                </button>
              </div>
            ))
          )}
        </div>

        {/* Create / Edit DSM Modal */}
        {isDsmModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-4">
              <h3 className="font-black text-xl text-bpcl-darkBlue text-center">
                {editingDsm ? 'Edit DSM Profile' : 'Register New District Sales Manager'}
              </h3>

              <form onSubmit={handleSaveDsm} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DSM Code</label>
                  <input
                    type="text"
                    required
                    value={dsmForm.dsmCode}
                    onChange={(e) => setDsmForm({ ...dsmForm, dsmCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={dsmForm.name}
                    onChange={(e) => setDsmForm({ ...dsmForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="dsm@bpcl.in"
                    value={dsmForm.email}
                    onChange={(e) => setDsmForm({ ...dsmForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    placeholder="9825012345"
                    value={dsmForm.mobile}
                    onChange={(e) => setDsmForm({ ...dsmForm, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Territory</label>
                  <select
                    required
                    value={dsmForm.territoryId}
                    onChange={(e) => setDsmForm({ ...dsmForm, territoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    {territories.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDsmModalOpen(false)}
                    className="py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow"
                  >
                    Save DSM
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Station Assignment Modal */}
        {isAssignModalOpen && selectedDsmForAssign && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full bpcl-card-shadow border-2 border-bpcl-yellow space-y-4">
              <h3 className="font-black text-xl text-bpcl-darkBlue text-center">
                Assign Fuel Stations to {selectedDsmForAssign.name}
              </h3>
              <p className="text-xs text-slate-500 text-center">
                Select stations to assign to DSM ({selectedDsmForAssign.dsmCode})
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 p-2 text-xs">
                {stations.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No stations registered</div>
                ) : (
                  stations.map((st) => {
                    const isChecked = selectedStationIds.includes(st.id);
                    return (
                      <label key={st.id} className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="font-bold text-slate-900">{st.name} ({st.stationCode})</div>
                          <div className="text-[11px] text-slate-500">{st.city}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStationIds([...selectedStationIds, st.id]);
                            } else {
                              setSelectedStationIds(selectedStationIds.filter((id) => id !== st.id));
                            }
                          }}
                          className="w-4 h-4 text-bpcl-blue rounded focus:ring-bpcl-blue"
                        />
                      </label>
                    );
                  })
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStationAssignments}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow"
                >
                  Save Station Mapping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
