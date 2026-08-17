import { describe, it, expect } from 'vitest';
import { generateStationHmac, verifyStationHmac } from '../../src/lib/qr';

describe('Cryptographic HMAC QR Code Security', () => {
  it('should generate valid HMAC signature for station code and campaign slug', () => {
    const sig = generateStationHmac('GJ1001', 'sapno-ki-sawari-season-2');
    expect(sig).toBeTypeOf('string');
    expect(sig.length).toBe(64); // SHA-256 hex length
  });

  it('should verify matching HMAC signature successfully', () => {
    const sig = generateStationHmac('GJ1001', 'sapno-ki-sawari-season-2');
    const isValid = verifyStationHmac('GJ1001', 'sapno-ki-sawari-season-2', sig);
    expect(isValid).toBe(true);
  });

  it('should reject tampered station code or signature', () => {
    const sig = generateStationHmac('GJ1001', 'sapno-ki-sawari-season-2');
    const isValid = verifyStationHmac('GJ1002', 'sapno-ki-sawari-season-2', sig);
    expect(isValid).toBe(false);
  });
});
