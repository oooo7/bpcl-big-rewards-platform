import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Calendar, Gift, Sparkles, CheckCircle2, Clock } from 'lucide-react';

export default function SchedulePage() {
  const drawSchedules = [
    { name: '1st Fortnightly Lucky Draw', date: '28 September 2026', time: '18:00 PM', prizes: '25x Smart Watches', status: 'EXECUTED' },
    { name: '2nd Fortnightly Lucky Draw', date: '12 October 2026', time: '18:00 PM', prizes: '25x LED Televisions', status: 'SCHEDULED' },
    { name: '3rd Fortnightly Lucky Draw', date: '26 October 2026', time: '18:00 PM', prizes: '25x Smartphones', status: 'SCHEDULED' },
    { name: '4th Fortnightly Lucky Draw', date: '09 November 2026', time: '18:00 PM', prizes: '25x Laptops', status: 'SCHEDULED' },
    { name: 'Grand Bumper Mega Draw', date: '14 November 2026', time: '18:00 PM', prizes: '1x Mega SUV Vehicle', status: 'SCHEDULED', isGrand: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-10 px-4 max-w-5xl mx-auto w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-bpcl-blue rounded-full text-xs font-bold">
            <Calendar className="w-4 h-4" /> OFFICIAL CAMPAIGN DRAW TIMELINE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-bpcl-darkBlue">Lucky Draw Schedule</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Every valid bill upload automatically enters all 4 Fortnightly Draws and the Grand Finale!
          </p>
        </div>

        <div className="space-y-4">
          {drawSchedules.map((item, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-6 bpcl-card-shadow border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                item.isGrand ? 'border-2 border-bpcl-yellow bg-amber-50/40' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 ${
                    item.isGrand
                      ? 'bg-bpcl-yellow text-bpcl-darkBlue'
                      : item.status === 'EXECUTED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-bpcl-blue'
                  }`}
                >
                  {item.isGrand ? <Sparkles className="w-6 h-6" /> : idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{item.name}</h3>
                    {item.isGrand && (
                      <span className="text-[10px] font-black uppercase bg-bpcl-darkBlue text-bpcl-yellow px-2 py-0.5 rounded-full">
                        GRAND FINALE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                    <span className="font-semibold text-slate-700">{item.date} at {item.time}</span>
                    <span>•</span>
                    <span className="font-bold text-bpcl-blue">{item.prizes}</span>
                  </div>
                </div>
              </div>

              <div>
                {item.status === 'EXECUTED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> Draw Executed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4 text-bpcl-blue" /> Scheduled
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
