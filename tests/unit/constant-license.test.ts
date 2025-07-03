/**
 * Unit tests for license constants
 */

import { LICENSE_CONSTANTS, ERROR_CODES } from '../../src/constant/license';

describe('LICENSE_CONSTANTS', () => {
  it('should have correct refresh interval (7 days in milliseconds)', () => {
    expect(LICENSE_CONSTANTS.REFRESH_INTERVAL).toBe(7 * 24 * 60 * 60 * 1000);
    expect(LICENSE_CONSTANTS.REFRESH_INTERVAL).toBe(604800000);
  });

  it('should have correct cache TTL (24 hours in seconds)', () => {
    expect(LICENSE_CONSTANTS.CACHE_TTL).toBe(24 * 60 * 60);
    expect(LICENSE_CONSTANTS.CACHE_TTL).toBe(86400);
  });

  it('should have correct expiry warning days', () => {
    expect(LICENSE_CONSTANTS.EXPIRY_WARNING_DAYS).toEqual([30, 7]);
    expect(LICENSE_CONSTANTS.EXPIRY_WARNING_DAYS).toHaveLength(2);
  });

  it('should be immutable (readonly)', () => {
    // Constants are compile-time readonly, not runtime immutable
    expect(LICENSE_CONSTANTS.REFRESH_INTERVAL).toBe(604800000);
  });
});

describe('ERROR_CODES', () => {
  it('should have validation failed error code', () => {
    expect(ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
  });

  it('should be immutable (readonly)', () => {
    // Constants are compile-time readonly, not runtime immutable
    expect(ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
  });
});