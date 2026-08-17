'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  FileCheck,
  FileText,
  Users,
  Gift,
  Trophy,
  Truck,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Lock,
  Fuel,
} from 'lucide-react';

interface AdminSidebarProps {
  userRole?: string;
  userName?: string;
}

export function AdminSidebar({ userRole: initialRole, userName: initialName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/v1/admin/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser({ name: initialName || 'Campaign Admin', role: initialRole || 'CAMPAIGN_ADMIN', email: 'admin@bpcl.in' });
        }
      })
      .catch(() => {
        setUser({ name: initialName || 'Campaign Admin', role: initialRole || 'CAMPAIGN_ADMIN', email: 'admin@bpcl.in' });
      });
  }, [initialName, initialRole]);

  const handleLogout = async () => {
    await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard Overview', href: '/admin', icon: BarChart3 },
    { label: 'DSM Analytics', href: '/admin/dsm/dashboard', icon: BarChart3 },
    { label: 'DSM Management', href: '/admin/dsm', icon: Users },
    { label: 'Registrations Master', href: '/admin/registrations', icon: Users },
    { label: 'Bill Verification Queue', href: '/admin/bills', icon: FileCheck },
    { label: 'Instant Rewards', href: '/admin/rewards', icon: Gift },
    { label: 'Draw Management', href: '/admin/draws', icon: Trophy },
    { label: 'Winner Verification', href: '/admin/winners', icon: ShieldCheck },
    { label: 'Prize Dispatch', href: '/admin/dispatch', icon: Truck },
    { label: 'Reports & Exports', href: '/admin/reports', icon: FileText },
    { label: 'System Audit Logs', href: '/admin/audit', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white shrink-0 hidden md:flex flex-col border-r border-slate-800 h-screen sticky top-0">
      {/* Platform Branding Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-amber-500/20">
            <Fuel className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white">BPCL REWARDS</div>
            <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Campaign Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-1.5 text-xs font-semibold flex-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 tracking-wider">
          Campaign Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Role Footer */}
      <div className="p-4 border-t border-white/10 bg-slate-950/60 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="truncate">
              <div className="font-bold text-white text-xs truncate">{user?.name || 'Campaign Admin'}</div>
              <div className="text-[10px] text-amber-400 font-mono font-semibold truncate">
                {user?.role || 'CAMPAIGN_ADMIN'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
