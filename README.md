# Enterprise Campaign Management Platform
## BPCL BIG REWARDS – Sapno Ki Sawari (Season 2)

This repository contains the enterprise-grade, multi-year reusable Campaign Management Platform for Bharat Petroleum Corporation Limited (BPCL).

---

## 🚀 Architecture Highlights

- **Multi-Year Annual Campaign Reusability**: Parameterized database models (`Campaign`, `CampaignRule`, `CampaignBranding`, `RewardInventory`, `DrawSchedule`) ensure zero hardcoding of campaign dates or rules.
- **Cryptographic QR Security**: Station QR code URLs embed server-verified HMAC-SHA256 tokens (`/c/[slug]/s/[stationCode]?sig=[hmac]`).
- **Bill Upload & OCR Duplicate Fraud Prevention**: Multi-format JPG/PNG/PDF uploads (5MB max) with binary SHA-256 hash deduplication and assistive OCR scoring.
- **Atomic Scratch & Win Engine**: Row-level database transaction isolation (`$transaction` / row locks) guaranteeing non-negative stock.
- **CSPRNG Draw Engine**: Cryptographically secure pseudorandom number generator operating on frozen entry snapshot pools (`DrawEntry`) producing SHA-256 audit hashes.
- **Dual OTP Verification**: Stage 1 Winner verification OTP + Stage 2 Delivery executive OTP with electronic photo and signature audit proof.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14+ App Router (TypeScript, React 18)
- **Styling**: Tailwind CSS v3 with BPCL Enterprise Brand Palette
- **Database & ORM**: PostgreSQL schema compatibility with Prisma ORM
- **State Management**: TanStack Query / React Hook Form + Zod
- **Validation**: Zod Schemas (`src/lib/validations/`)
- **Testing**: Vitest (Unit/Integration) & Playwright (E2E)

---

## 📂 Folder Layout

```
bpcl-big-rewards-platform/
├── docs/                        # Architecture & Workflow Diagrams
├── prisma/
│   ├── schema.prisma            # Relational database schema with compound indexes
│   └── seed.ts                  # Campaign 2026 seed script
├── src/
│   ├── app/                     # Next.js App Router (Customer & Admin routes)
│   ├── components/              # Design System Components
│   │   ├── ui/                  # Primitives (Button, Card, Badge, Alert)
│   │   ├── customer/            # ScratchCard, BillUploader
│   │   └── admin/               # Dashboard Stats & Verification Modals
│   ├── lib/                     # Technical infrastructure helpers
│   │   ├── config.ts            # Centralized environment config
│   │   ├── db.ts                # Prisma singleton instance
│   │   ├── errors.ts            # AppError & API handlers
│   │   ├── logger.ts            # Structured logger
│   │   ├── qr.ts                # Cryptographic HMAC QR resolver
│   │   ├── reward-engine.ts     # Scratch & Win engine
│   │   ├── draw-engine.ts       # CSPRNG draw engine
│   │   ├── otp.ts               # SMS OTP verification service
│   │   ├── ocr.ts               # Bill OCR & duplicate hash scanner
│   │   ├── storage.ts           # File storage abstraction (S3/Local)
│   │   └── audit.ts             # Append-only audit logger
│   ├── services/                # Business Logic Services (Separated from UI)
│   │   ├── campaign.service.ts  # Campaign service
│   │   └── registration.service.ts # Registration service
│   └── types/                   # TypeScript interfaces
└── tests/                       # Vitest Unit & Integration Tests
```

---

## 🚦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database & Seed**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

3. **Run Unit Tests**:
   ```bash
   npm test
   ```

4. **Launch Local Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
