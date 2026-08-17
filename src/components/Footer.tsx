import React from 'react';
import Link from 'next/link';
import { Shield, PhoneCall, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-bpcl-darkBlue text-slate-300 pt-12 pb-8 border-t-4 border-bpcl-yellow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="font-extrabold text-lg text-white mb-2">BHARAT PETROLEUM</div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              BPCL BIG REWARDS (Sapno Ki Sawari – Season 2) is an annual promotional property across 1,000+ participating fuel stations in Gujarat.
            </p>
            <div className="flex items-center gap-2 text-xs text-bpcl-yellow font-semibold">
              <Shield className="w-4 h-4 text-bpcl-yellow" />
              100% Verified & Secure Platform
            </div>
          </div>

          <div>
            <div className="font-bold text-sm text-white uppercase tracking-wider mb-4">Quick Links</div>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-bpcl-yellow transition-colors">Home Page</Link></li>
              <li><Link href="/register" className="hover:text-bpcl-yellow transition-colors">Submit Bill</Link></li>
              <li><Link href="/winners" className="hover:text-bpcl-yellow transition-colors">Winner Announcement</Link></li>
              <li><Link href="/schedule" className="hover:text-bpcl-yellow transition-colors">Fortnightly Draw Schedule</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-sm text-white uppercase tracking-wider mb-4">Campaign Info</div>
            <ul className="space-y-2 text-xs">
              <li><Link href="/faq" className="hover:text-bpcl-yellow transition-colors">How to Participate</Link></li>
              <li><Link href="/faq#terms" className="hover:text-bpcl-yellow transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/faq#privacy" className="hover:text-bpcl-yellow transition-colors">Privacy Policy</Link></li>
              <li><Link href="/admin" className="hover:text-bpcl-yellow transition-colors">DSM & Staff Login</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-sm text-white uppercase tracking-wider mb-4">Campaign Helpdesk</div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-bpcl-yellow shrink-0" />
                <span>Toll Free: 1800-22-4344 (BPCL Help)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-bpcl-yellow shrink-0" />
                <span>bpclbigrewards@bpcl.in</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-bpcl-yellow shrink-0 mt-0.5" />
                <span>Bharat Petroleum Corporation Limited, Bharat Bhavan, Mumbai, India</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700/60 text-center text-xs text-slate-400">
          <p>© 2026 Bharat Petroleum Corporation Limited (BPCL). All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
