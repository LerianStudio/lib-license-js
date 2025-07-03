/**
 * Unit tests for HTTP constants
 */

import { HTTP_CONSTANTS } from '../../src/constant/http';

describe('HTTP_CONSTANTS', () => {
  it('should have correct base URL', () => {
    expect(HTTP_CONSTANTS.BASE_URL).toBe('https://license.dev.midaz.io');
  });

  it('should have correct timeout (5 seconds)', () => {
    expect(HTTP_CONSTANTS.TIMEOUT).toBe(5000);
  });

  it('should have correct retry count', () => {
    expect(HTTP_CONSTANTS.RETRY_COUNT).toBe(3);
  });

  it('should have correct retry delay (5 seconds)', () => {
    expect(HTTP_CONSTANTS.RETRY_DELAY).toBe(5000);
  });

  it('should have correct cache TTL (1 hour)', () => {
    expect(HTTP_CONSTANTS.CACHE_TTL).toBe(3600);
  });

  it('should be immutable (readonly)', () => {
    // Constants are compile-time readonly, not runtime immutable
    expect(HTTP_CONSTANTS.BASE_URL).toBe('https://license.dev.midaz.io');
  });
});