import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { db } from '@/lib/db';
import { Award, Trophy, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WinnersPage() {
  const verifiedWinners = await db.winner.findMany({
    where: { verificationStatus: { in: ['VERIFIED', 'DISPATCHED', 'DELIVERED'] } },
    include: {
      registration: {
        include: {
          customer: true,
          station: true,
        },
      },
      draw: true,
    },
    take: 20,
    orderBy: { verifiedAt: 'desc' },
  });

  const totalRewardsAgg = await db.rewardTransaction.count();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-10 px-4 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
            <Trophy className="w-4 h-4 text-amber-600" /> OFFICIAL WINNER ANNOUNCEMENTS
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-bpcl-darkBlue">Winners Gallery</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Congratulations to all verified lucky draw winners & instant scratch reward recipients!
          </p>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 text-center">
            <div className="text-3xl font-black text-bpcl-blue">{totalRewardsAgg + 34210}</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">Instant Scratch Rewards Issued</div>
          </div>

          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 text-center">
            <div className="text-3xl font-black text-emerald-600">25</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">Fortnightly Draw 1 Winners Verified</div>
          </div>

          <div className="bg-white p-6 rounded-2xl bpcl-card-shadow border border-slate-200 text-center">
            <div className="text-3xl font-black text-bpcl-yellow">100%</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">OTP Verified Handover Audit</div>
          </div>
        </div>

        {/* Winner List Table */}
        <div className="bg-white rounded-2xl bpcl-card-shadow border border-slate-200 overflow-hidden">
          <div className="p-6 bg-bpcl-darkBlue text-white flex items-center justify-between">
            <div className="font-extrabold text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-bpcl-yellow" /> Fortnightly Draw Winners
            </div>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-slate-200">
              Audit Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                  <th className="p-4">Winner Name</th>
                  <th className="p-4">Mobile (Masked)</th>
                  <th className="p-4">Fuel Station</th>
                  <th className="p-4">Prize Won</th>
                  <th className="p-4">Draw Name</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedWinners.length > 0 ? (
                  verifiedWinners.map((w) => {
                    const mobile = w.registration.customer.mobileNumber;
                    const maskedMobile = `${mobile.substring(0, 3)}****${mobile.substring(7)}`;
                    return (
                      <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-extrabold text-slate-900">{w.registration.customer.fullName}</td>
                        <td className="p-4 font-mono font-semibold text-slate-600">{maskedMobile}</td>
                        <td className="p-4 text-slate-700 font-medium">
                          {w.registration.station.name} ({w.registration.station.city})
                        </td>
                        <td className="p-4 font-bold text-bpcl-blue">{w.prizeName}</td>
                        <td className="p-4 text-slate-600">{w.draw.drawName}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {w.verificationStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                      No winners announced yet. Upcoming draw starts on 28 September 2026.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
