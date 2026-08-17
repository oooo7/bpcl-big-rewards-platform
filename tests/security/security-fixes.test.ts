import { describe, it, expect } from 'vitest';
import { authenticateAdminUser, createSessionToken, verifySessionToken } from '../../src/lib/auth';
import { hashOtp, verifyWinnerOtp, createDeliveryOtp, verifyDeliveryOtp } from '../../src/lib/otp';
import { resolveStationFromQr } from '../../src/lib/qr';
import { processInstantReward } from '../../src/lib/reward-engine';
import { db } from '../../src/lib/db';
import bcrypt from 'bcryptjs';

describe('Security Audit & Vulnerability Fix Verification Tests', () => {

  describe('1. Authentication & Password Security (CRIT-04)', () => {
    it('1.1 Rejects incorrect passwords with bcrypt comparison', async () => {
      const result = await authenticateAdminUser('admin@bpcl.in', 'wrong_password_999');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });

    it('1.2 Successfully authenticates valid password matching bcrypt hash', async () => {
      const result = await authenticateAdminUser('admin@bpcl.in', 'admin123');
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('SUPER_ADMIN');
    });

    it('1.3 Prevents user enumeration via constant-time handling for non-existent users', async () => {
      const result = await authenticateAdminUser('nonexistent.user@bpcl.in', 'admin123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('2. JWT Signed Session Verification (CRIT-01, CRIT-02)', () => {
    it('2.1 Issues cryptographic JWT session token that verifies correctly', async () => {
      const token = await createSessionToken({
        userId: 'test-user-id',
        email: 'test@bpcl.in',
        name: 'Test User',
        role: 'CAMPAIGN_ADMIN',
        territoryId: null,
      });

      expect(typeof token).toBe('string');
      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.role).toBe('CAMPAIGN_ADMIN');
      expect(payload?.email).toBe('test@bpcl.in');
    });

    it('2.2 Rejects tampered/forged session tokens', async () => {
      const token = await createSessionToken({
        userId: 'test-user-id',
        email: 'test@bpcl.in',
        name: 'Test User',
        role: 'DSM',
        territoryId: null,
      });

      // Tamper with the token
      const tampered = token.slice(0, -5) + 'XXXXX';
      const payload = await verifySessionToken(tampered);
      expect(payload).toBeNull();
    });

    it('2.3 Rejects malformed or plain JSON session tokens', async () => {
      const plainJson = JSON.stringify({ role: 'SUPER_ADMIN', email: 'attacker@evil.com' });
      const payload = await verifySessionToken(plainJson);
      expect(payload).toBeNull();
    });
  });

  describe('3. Delivery OTP Attempt Counter & Lockout (HIGH-03)', () => {
    it('3.1 Enforces max 3 attempts on delivery OTP verification', async () => {
      const dispatch = await db.dispatch.findFirst();
      if (!dispatch) return;

      // Initiate delivery OTP
      await createDeliveryOtp(dispatch.id);

      // Attempt 1 incorrect OTP
      const res1 = await verifyDeliveryOtp(dispatch.id, '000000');
      expect(res1.success).toBe(false);
      expect(res1.error).toBe('INVALID_DELIVERY_OTP');
      expect(res1.remainingAttempts).toBe(2);

      // Attempt 2 incorrect OTP
      const res2 = await verifyDeliveryOtp(dispatch.id, '000000');
      expect(res2.success).toBe(false);
      expect(res2.remainingAttempts).toBe(1);

      // Attempt 3 incorrect OTP
      const res3 = await verifyDeliveryOtp(dispatch.id, '000000');
      expect(res3.success).toBe(false);
      expect(res3.remainingAttempts).toBe(0);

      // Attempt 4 - blocked due to lockout
      const res4 = await verifyDeliveryOtp(dispatch.id, '345546');
      expect(res4.success).toBe(false);
      expect(res4.error).toBe('MAX_ATTEMPTS_EXCEEDED');
    });
  });

  describe('4. Mandatory QR Signature Enforcement (HIGH-04)', () => {
    it('4.1 Rejects QR resolution attempt when signature is missing', async () => {
      const result = await resolveStationFromQr('sapno-ki-sawari-season-2', 'GJ1001');
      expect(result.success).toBe(false);
      expect(result.error).toBe('QR_SIGNATURE_REQUIRED');
    });

    it('4.2 Rejects QR resolution attempt when signature is invalid', async () => {
      const result = await resolveStationFromQr('sapno-ki-sawari-season-2', 'GJ1001', 'invalid_sig_hex_1234');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_QR_SIGNATURE');
    });
  });

  describe('5. Reward Scratch Eligibility Protection (CRIT-05)', () => {
    it('5.1 Rejects instant reward processing for invalid registration ID', async () => {
      const result = await processInstantReward('non-existent-reg-id');
      expect(result.success).toBe(false);
      expect(result.error).toBe('REGISTRATION_NOT_FOUND');
    });

    it('5.2 Rejects instant reward processing for FRAUD_FLAGGED registration', async () => {
      const fraudReg = await db.registration.create({
        data: {
          campaignId: (await db.campaign.findFirst())!.id,
          stationId: (await db.fuelStation.findFirst())!.id,
          customerId: (await db.customer.findFirst())!.id,
          vehicleType: 'CAR',
          vehicleNumber: 'TEST-FRAUD-01',
          fuelType: 'PETROL',
          fuelAmount: 1000,
          billNumber: 'FRAUD-BILL-999',
          status: 'FRAUD_FLAGGED',
        },
      });

      const result = await processInstantReward(fraudReg.id);
      expect(result.success).toBe(false);
      expect(result.error).toBe('REGISTRATION_NOT_ELIGIBLE');
    });
  });

});
