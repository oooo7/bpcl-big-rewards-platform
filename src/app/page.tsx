import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Fuel, QrCode, Gift, Trophy, ArrowRight, ShieldCheck, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Hero Banner Section */}
      <section className="relative bpcl-gradient-header text-white pt-10 pb-16 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-bpcl-yellow text-xs font-extrabold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="w-4 h-4" /> 14 SEPT – 14 NOV 2026 • GUJARAT
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              BPCL BIG REWARDS <br />
              <span className="text-bpcl-yellow">SAPNO KI SAWARI</span>
              <span className="text-2xl sm:text-3xl block text-slate-200 mt-1 font-bold">SEASON 2</span>
            </h1>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 font-medium">
              Fuel your vehicle at any participating BPCL fuel station across Gujarat, scan the QR code, upload your bill & win exciting instant rewards, fortnightly prizes & bumper grand prizes!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/register?station=GJ1001"
                className="w-full sm:w-auto bpcl-gradient-gold text-bpcl-darkBlue font-black text-base px-8 py-3.5 rounded-xl shadow-xl hover:brightness-105 transition-all flex items-center justify-center gap-2"
              >
                Participate Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/schedule"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-base px-6 py-3.5 rounded-xl backdrop-blur-sm transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5 text-bpcl-yellow" /> View Draw Dates
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center z-10">
            {/* Visual Simulated Mobile Screen Mockup */}
            <div className="w-72 sm:w-80 bg-white text-slate-900 rounded-3xl p-5 shadow-2xl border-4 border-bpcl-yellow relative transform rotate-1 hover:rotate-0 transition-transform">
              <div className="w-16 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="bg-bpcl-darkBlue text-white p-4 rounded-xl text-center mb-4">
                <div className="text-xs text-bpcl-yellow font-bold uppercase">Scan & Win Reward</div>
                <div className="text-lg font-black mt-1">₹100 FUEL VOUCHER</div>
                <div className="text-[11px] text-slate-300 mt-0.5">Instant Scratch Winner</div>
              </div>
              <div className="border-2 border-dashed border-bpcl-yellow p-4 rounded-xl text-center bg-amber-50">
                <QrCode className="w-20 h-20 text-bpcl-darkBlue mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">Participating Station QR</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Station: GJ1001 (Ahmedabad)</div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 py-1 px-3 rounded-full">
                  ✓ Verified Campaign Station
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step How to Participate */}
      <section className="py-14 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-extrabold text-bpcl-blue uppercase tracking-widest">Simple & Easy</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-bpcl-darkBlue mt-1">How to Participate in 3 Steps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow bpcl-card-hover border border-slate-100 text-center">
            <div className="w-14 h-14 bg-blue-100 text-bpcl-blue rounded-2xl flex items-center justify-center mx-auto text-xl font-black mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Fuel Vehicle & Scan QR</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Visit any participating BPCL fuel station in Gujarat, fuel your vehicle, and scan the campaign QR code on display.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow bpcl-card-hover border border-slate-100 text-center">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-xl font-black mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Enter Details & Upload Bill</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fill your mobile number, vehicle number, fuel details, and upload a clear photo/document of your fuel bill (Max 5MB).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow bpcl-card-hover border border-slate-100 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto text-xl font-black mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Scratch & Lucky Draws</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Play Instant Scratch & Win for immediate vouchers, plus automatically enter Fortnightly Draws & Grand Bumper Draw!
            </p>
          </div>
        </div>
      </section>

      {/* Prize Gallery Section */}
      <section className="py-14 bg-white border-y border-slate-200 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs font-extrabold text-bpcl-yellow uppercase tracking-widest bg-bpcl-darkBlue inline-block px-3 py-1 rounded-full">
              Prizes to be Won
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-bpcl-darkBlue mt-2">Bumper Rewards & Draw Prizes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-50 border-2 border-bpcl-yellow rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Instant Scratch Rewards</h4>
              <p className="text-xs text-slate-600 mt-1">₹100 / ₹250 Fuel & Shopping Vouchers issued immediately upon valid submission.</p>
            </div>

            <div className="bg-slate-50 border-2 border-bpcl-blue rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 text-bpcl-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Fortnightly Draws</h4>
              <p className="text-xs text-slate-600 mt-1">100+ Mega Prizes (Smartwatches, LED TVs, Smartphones, Laptops) drawn every 15 days.</p>
            </div>

            <div className="bg-bpcl-darkBlue text-white rounded-2xl p-6 text-center shadow-xl">
              <div className="w-12 h-12 bg-bpcl-yellow text-bpcl-darkBlue rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-bpcl-yellow text-lg">Grand Bumper Finale</h4>
              <p className="text-xs text-slate-200 mt-1">1 Mega SUV Vehicle Winner selected at campaign conclusion on 14 November 2026!</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
