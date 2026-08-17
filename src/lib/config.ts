/**
 * Centralized Configuration Architecture
 * Enforces typed environment variables and campaign defaults.
 */

export const config = {
  env: process.env.NODE_ENV || 'development',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'bpcl_super_secret_jwt_key_2026',
  qrHmacSecret: process.env.QR_HMAC_SECRET || 'bpcl_qr_hmac_secret_key_2026',
  
  // Storage Provider ('local' | 's3')
  storageProvider: (process.env.STORAGE_PROVIDER as 'local' | 's3') || 'local',
  s3Bucket: process.env.S3_BUCKET_NAME || 'bpcl-campaign-uploads',
  s3Region: process.env.AWS_REGION || 'ap-south-1',

  // SMS Gateway Provider ('mock' | 'dlt')
  smsProvider: (process.env.SMS_PROVIDER as 'mock' | 'dlt') || 'mock',
  
  // Campaign 2026 Defaults (Overridden dynamically by DB Campaign record)
  defaultCampaignSlug: 'sapno-ki-sawari-season-2',
  maxBillSizeBytes: 5 * 1024 * 1024, // 5MB limit
  allowedFileFormats: ['JPG', 'PNG', 'PDF'],
  otpTtlMinutes: 5,
  maxOtpAttempts: 3,
};
