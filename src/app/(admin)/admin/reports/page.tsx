'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3, FileText, FileCheck, MapPin, Building2, Gift, Trophy,
  Crown, Package, Truck, Users, ShieldCheck, Download, TrendingUp,
} from 'lucide-react';

const REPORT_CONFIG = [
  {
    type: 'registration', label: 'Registration Report', icon: FileText, color: 'blue',
    desc: 'Complete log of all customer registrations, vehicle types, fuel amounts, and station IDs.',
    countApi: 'registrations',
  },
  {
    type: 'bill_upload', label: 'Bill Upload Report', icon: FileCheck, color: 'violet',
    desc: 'All uploaded bill images with OCR confidence scores, file sizes, and formats.',
    countApi: 'bills_upload',
  },
  {
    type: 'bill_validation', label: 'Bill Validation Report', icon: ShieldCheck, color: 'emerald',
    desc: 'Reviewer decisions, notes, OCR results, duplicate flags, and validation timestamps.',
    countApi: 'bills_validation',
  },
  {
    type: 'territory_performance', label: 'Territory Performance', icon: MapPin, color: 'amber',
    desc: 'Territory-wise registration totals, validation rates, and fuel amounts.',
    countApi: 'territories',
  },
  {
    type: 'station_performance', label: 'Station Performance', icon: Building2, color: 'cyan',
    desc: 'Station-level breakdown of registrations, QR scans, DSM assignments, and conversion rates.',
    countApi: 'stations',
  },
  {
    type: 'instant_reward', label: 'Instant Reward Report', icon: Gift, color: 'pink',
    desc: 'Coupon issuances, reward types, values, redemption status, and customer details.',
    countApi: 'rewards',
  },
  {
    type: 'draw', label: 'Draw Report', icon: Trophy, color: 'yellow',
    desc: 'Fortnightly and Grand Bumper draw schedules, execution hashes, and entry snapshots.',
    countApi: 'draws',
  },
  {
    type: 'winner', label: 'Winner Report', icon: Crown, color: 'orange',
    desc: 'All draw winners with OTP verification status, prize details, and dispatch information.',
    countApi: 'winners',
  },
  {
    type: 'prize_distribution', label: 'Prize Distribution', icon: Package, color: 'teal',
    desc: 'Inventory levels for all draw prizes and instant rewards — allocated vs available.',
    countApi: 'prizes',
  },
  {
    type: 'dispatch', label: 'Dispatch Report', icon: Truck, color: 'indigo',
    desc: 'Shipment tracking, nodal point logs, delivery OTP, photo and signature proofs.',
    countApi: 'dispatch',
  },
  {
    type: 'dsm_performance', label: 'DSM Performance', icon: Users, color: 'rose',
    desc: 'DSM-level registration counts, valid rates, QR scans, and territory rankings.',
    countApi: 'dsm',
  },
  {
    type: 'audit', label: 'Audit Log Report', icon: ShieldCheck, color: 'slate',
    desc: 'Complete immutable audit trail of all platform actions, exports, and system events.',
    countApi: 'audit',
  },
];

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    iconBg: 'bg-blue-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  iconBg: 'bg-violet-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   iconBg: 'bg-amber-500' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    iconBg: 'bg-cyan-600' },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    iconBg: 'bg-pink-600' },
  yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200',  iconBg: 'bg-yellow-500' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  iconBg: 'bg-orange-600' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    iconBg: 'bg-teal-600' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  iconBg: 'bg-indigo-600' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    iconBg: 'bg-rose-600' },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   iconBg: 'bg-slate-700' },
};

export default function ReportsHubPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/v1/admin/reports/registration?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, registrations: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/bill_upload?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, bills_upload: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/bill_validation?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, bills_validation: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/instant_reward?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, rewards: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/draw?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, draws: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/winner?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, winners: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/dispatch?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, dispatch: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/dsm_performance?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, dsm: d.total })); })
      .catch(() => {});
    fetch('/api/v1/admin/reports/audit?format=json&pageSize=1')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(prev => ({ ...prev, audit: d.total })); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/25">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Reports & Export Center</h1>
              <p className="text-sm text-slate-500 mt-0.5">12 operational reports with CSV, Excel, and PDF exports</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">All exports are audited</span>
          </div>
        </div>
      </div>

      {/* Report Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CONFIG.map((report) => {
          const Icon = report.icon;
          const colors = COLOR_CLASSES[report.color] || COLOR_CLASSES.blue;
          const count = counts[report.countApi];
          return (
            <div
              key={report.type}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {count !== undefined && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                      {count.toLocaleString()} records
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">{report.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{report.desc}</p>
              </div>

              <div className="px-5 pb-5 flex gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/admin/reports/${report.type}`}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs rounded-xl text-center transition-colors"
                >
                  View Report
                </Link>
                <a
                  href={`/api/v1/admin/reports/${report.type}?format=csv&pageSize=10000`}
                  download
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </a>
                <a
                  href={`/api/v1/admin/reports/${report.type}?format=xlsx&pageSize=10000`}
                  download
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> XLS
                </a>
                <a
                  href={`/api/v1/admin/reports/${report.type}?format=pdf&pageSize=1000`}
                  download
                  className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
