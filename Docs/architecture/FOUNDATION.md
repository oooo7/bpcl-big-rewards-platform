# Foundation Architecture Overview
## BPCL BIG REWARDS – Sapno Ki Sawari (Season 2)

> [!NOTE]  
> This document summarizes the production-ready technical foundation created for the BPCL Big Rewards Campaign Platform.

---

## Key Technical Foundations

1. **Decoupled Business Logic & Services**:
   - `src/services/campaign.service.ts`
   - `src/services/registration.service.ts`
   - Business logic is completely separated from React UI components and Next.js route handlers.

2. **Standardized Error Handling & Logging**:
   - `src/lib/errors.ts`: Centralized `AppError` class with HTTP status codes and structured JSON response envelopes.
   - `src/lib/logger.ts`: Structured APM-compatible logger capturing timestamp, context, message, actor ID, and metadata.

3. **Storage & SMS Abstraction**:
   - `src/lib/storage.ts`: Pluggable `StorageProvider` interface supporting local filesystem uploads for dev and S3 Presigned Upload POST policies for production.
   - `src/lib/otp.ts`: Pluggable `SmsProvider` interface for Indian DLT-registered SMS gateways.

4. **Design System Primitives**:
   - `src/components/ui/Button.tsx`: Primary Gold, Primary Blue, Secondary Outline, Danger, Ghost variants.
   - `src/components/ui/Badge.tsx`: Status indicators (`success`, `warning`, `error`, `info`, `gold`, `navy`).
   - `src/components/ui/Card.tsx`: Shadowed border cards with hover states.

5. **Relational Database Schema & Compound Indexes**:
   - `prisma/schema.prisma`: Normalized multi-tenant PostgreSQL schema with compound indexes on `(campaignId, status, createdAt)`, `(fileHash)`, `(drawId, verificationStatus)`.
