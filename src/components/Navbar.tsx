'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Fuel, Menu, X, Award, ShieldCheck, User } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bpcl-gradient-header text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* BPCL Logo & Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bpcl-gradient-gold flex items-center justify-center text-bpcl-darkBlue shadow-lg font-black text-xl">
              <Fuel className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-lg sm:text-xl tracking-tight leading-none text-white">
                BHARAT PETROLEUM
              </div>
              <div className="text-xs sm:text-sm font-bold text-bpcl-yellow tracking-wider uppercase mt-0.5">
                BIG REWARDS • SEASON 2
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-sm">
            <Link href="/" className="hover:text-bpcl-yellow transition-colors">
              Home
            </Link>
            <Link href="/register" className="hover:text-bpcl-yellow transition-colors">
              Participate Now
            </Link>
            <Link href="/winners" className="hover:text-bpcl-yellow transition-colors flex items-center gap-1">
              <Award className="w-4 h-4 text-bpcl-yellow" />
              Winners Gallery
            </Link>
            <Link href="/schedule" className="hover:text-bpcl-yellow transition-colors">
              Draw Schedule
            </Link>
            <Link href="/faq" className="hover:text-bpcl-yellow transition-colors">
              FAQs & Rules
            </Link>
          </nav>

          {/* Action Callouts & Portal Links */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/register"
              className="bpcl-gradient-gold text-bpcl-darkBlue font-bold px-4 py-2 rounded-lg hover:brightness-105 transition-all shadow-md text-sm"
            >
              Upload Bill & Win
            </Link>
            <Link
              href="/admin"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-bpcl-yellow" />
              Admin Portal
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-white hover:bg-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-bpcl-darkBlue border-t border-white/10 px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-white hover:text-bpcl-yellow"
          >
            Home
          </Link>
          <Link
            href="/register"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-bpcl-yellow"
          >
            Participate & Upload Bill
          </Link>
          <Link
            href="/winners"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-white hover:text-bpcl-yellow"
          >
            Winners Gallery
          </Link>
          <Link
            href="/schedule"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-white hover:text-bpcl-yellow"
          >
            Draw Schedule
          </Link>
          <Link
            href="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-white hover:text-bpcl-yellow"
          >
            FAQs & Terms
          </Link>
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center bg-white/10 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-bpcl-yellow" />
              Admin Portal Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
