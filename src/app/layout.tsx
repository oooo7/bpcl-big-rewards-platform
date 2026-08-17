import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BPCL BIG REWARDS - Sapno Ki Sawari (Season 2)',
  description:
    'Official campaign management platform for BPCL Big Rewards (Season 2). Fuel your vehicle, scan station QR code, upload fuel bill & win instant vouchers, fortnightly draws & grand bumper prizes.',
  keywords: ['BPCL', 'Big Rewards', 'Sapno Ki Sawari', 'Gujarat Fuel Station', 'Bharat Petroleum', 'Lucky Draw'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
