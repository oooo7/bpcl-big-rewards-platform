import { z } from 'zod';

export const customerRegistrationSchema = z.object({
  campaignSlug: z.string().default('sapno-ki-sawari-season-2'),
  stationCode: z.string().min(3, 'Station code is required'),
  fullName: z.string().min(2, 'Full Name is required'),
  mobileNumber: z.string().length(10, 'Mobile Number must be 10 digits'),
  vehicleType: z.enum(['CAR', 'TWO_WHEELER', 'COMMERCIAL', 'OTHER']),
  vehicleNumber: z.string().min(4, 'Valid Vehicle Number required'),
  fuelType: z.enum(['PETROL', 'DIESEL', 'CNG', 'EV']),
  fuelAmount: z.number().min(100, 'Fuel Amount must be at least ₹100'),
  billNumber: z.string().min(3, 'Bill Number required'),
  fileName: z.string().min(1, 'File name required'),
  fileFormat: z.enum(['JPG', 'PNG', 'PDF']),
});

export const drawExecuteSchema = z.object({
  drawId: z.string().uuid('Valid Draw ID required'),
  operatorName: z.string().optional().default('Draw Auditor'),
});

export const otpVerifySchema = z.object({
  winnerId: z.string().uuid('Valid Winner ID required'),
  otpInput: z.string().length(6, 'OTP must be 6 digits'),
  verifierName: z.string().optional().default('Verification Officer'),
});
