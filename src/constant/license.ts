/**
 * License-related constants
 * Following lib-license-go constant/license.go patterns
 */

export const LICENSE_CONSTANTS = {
  REFRESH_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  CACHE_TTL: 24 * 60 * 60, // 24 hours in seconds
  EXPIRY_WARNING_DAYS: [30, 7],
} as const;

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;
