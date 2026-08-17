import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      q: 'Who is eligible to participate in BPCL Big Rewards (Season 2)?',
      a: 'Any customer who purchases fuel at any of the 1,000 participating BPCL fuel stations across Gujarat between 14 September 2026 and 14 November 2026 is eligible.',
    },
    {
      q: 'What is the minimum fuel amount required for bill upload?',
      a: 'The minimum fuel purchase amount required to submit a bill is ₹200 for 4-wheelers and ₹100 for 2-wheelers.',
    },
    {
      q: 'How does Instant Scratch & Win work?',
      a: 'After submitting a valid fuel bill image/document, your submission is validated automatically. Upon validation, an interactive scratch card is presented on screen revealing instant fuel or shopping vouchers.',
    },
    {
      q: 'Can I submit multiple fuel bills?',
      a: 'Yes! Multiple entries per customer mobile number are allowed as long as each entry corresponds to a distinct, valid fuel receipt from a participating BPCL outlet.',
    },
    {
      q: 'How are lucky draw winners chosen and notified?',
      a: 'Draw winners are selected using a cryptographically secure random number selection system operating on frozen entry snapshots. Winners receive an SMS OTP for verification prior to prize handover.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-10 px-4 max-w-4xl mx-auto w-full space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
            <HelpCircle className="w-4 h-4 text-amber-600" /> CAMPAIGN HELPDESK
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-bpcl-darkBlue">Frequently Asked Questions</h1>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 bpcl-card-shadow border border-slate-200 space-y-2">
              <h3 className="font-extrabold text-slate-900 text-base flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-bpcl-blue shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 pl-7 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Terms & Conditions Section */}
        <div id="terms" className="bg-white rounded-2xl p-6 sm:p-8 bpcl-card-shadow border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-lg border-b pb-3">
            <FileText className="w-5 h-5 text-bpcl-blue" /> Campaign Terms & Conditions
          </div>
          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <p>1. BPCL Big Rewards (Sapno Ki Sawari - Season 2) is valid from 14 September 2026 to 14 November 2026 across designated outlets in Gujarat.</p>
            <p>2. Uploaded bills must clearly show the station code, transaction amount, date, and invoice number. Duplicate uploads or altered images will be permanently rejected.</p>
            <p>3. All prizes are non-transferable and cannot be exchanged for cash equivalent. Winner verification requires OTP validation against the registered mobile number.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
