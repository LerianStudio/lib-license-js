/**
 * HTTP-related constants
 * Following lib-license-go constant/http.go patterns
 */

export const HTTP_CONSTANTS = {
  BASE_URL: 'https://license.dev.midaz.io',
  TIMEOUT: 5000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 5000,
  CACHE_TTL: 3600,
  REFRESH_INTERVAL: 1800,
  EXPIRY_WARNING_DAYS: [7, 30] as const,
} as const;
