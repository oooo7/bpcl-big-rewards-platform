'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Fuel, KeyRound, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@bpcl.in');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('CAMPAIGN_ADMIN');

  const demoPresets = [
    { label: 'Campaign Admin', email: 'admin@bpcl.in', role: 'CAMPAIGN_ADMIN', desc: 'Full platform access & PII permission' },
    { label: 'Validation Officer', email: 'validation@bpcl.in', role: 'VALIDATION_TEAM', desc: 'Bill verification & masked PII view' },
    { label: 'Operations Lead', email: 'operations@bpcl.in', role: 'OPERATIONS_ADMIN', desc: 'Registrations & Rewards management' },
    { label: 'Auditor', email: 'auditor@bpcl.in', role: 'AUDITOR', desc: 'Read-only access & audit logs' },
  ];

  const handlePresetSelect = (preset: (typeof demoPresets)[0]) => {
    setEmail(preset.email);
    setPassword('admin123');
    setSelectedPreset(preset.role);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials or inactive staff account');
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      setError('Connection failed. Please verify network and server state.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 mb-2">
            <Fuel className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">BPCL BIG REWARDS</h1>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Internal Campaign Portal</p>
        </div>

        {/* Preset Role Switcher for Testing/Demo */}
        <div className="space-y-2 border-t border-b border-slate-800/80 py-4">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Select Role Demo Preset
          </label>
          <div className="grid grid-cols-2 gap-2">
            {demoPresets.map((preset) => {
              const isSelected = selectedPreset === preset.role;
              return (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{preset.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[10px] opacity-75 truncate">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Staff Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                placeholder="staff@bpcl.in"
              />
              <UserCheck className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                placeholder="••••••••"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" /> Sign In to Platform
              </>
            )}
          </button>
        </form>

        <div className="text-center text-[10px] text-slate-500">
          Bharat Petroleum Corporation Limited • Secure RBAC Operations
        </div>
      </div>
    </div>
  );
}
