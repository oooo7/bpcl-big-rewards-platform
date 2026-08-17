import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ShieldCheck, ArrowLeft, Lock, FileCode } from 'lucide-react';

export const revalidate = 0;

export default async function AuditLogsPage() {
  const auditLogs = await db.auditLog.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-bpcl-darkBlue">Immutable System Audit Logs</h1>
            <p className="text-xs text-slate-500">Append-only audit trail capturing user actions, IP addresses, and state modifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200">
          <Lock className="w-4 h-4 text-emerald-600" /> Append-Only Protected
        </div>
      </div>

      <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor Role</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Details / Diffs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 font-mono">
                  <td className="p-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="font-bold text-bpcl-blue bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-900">{log.action}</td>
                  <td className="p-4 text-slate-700">{log.entityType} ({log.entityId.substring(0, 8)})</td>
                  <td className="p-4 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="p-4 text-slate-600 max-w-xs truncate">{log.newValues || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
