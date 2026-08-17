import { describe, it, expect } from 'vitest';
import { generate6DigitOtp, hashOtp } from '../../src/lib/otp';

describe('OTP Verification Security', () => {
  it('should generate 6-digit numeric OTP', () => {
    const otp = generate6DigitOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('should hash OTP with SHA-256 preventing plaintext storage', () => {
    const otp = '123456';
    const hash = hashOtp(otp);
    expect(hash).toBeTypeOf('string');
    expect(hash).not.toBe(otp);
    expect(hash.length).toBe(64);
  });
});
