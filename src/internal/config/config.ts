/**
 * Internal configuration structures
 * Following lib-license-go internal/config/config.go patterns
 */

export interface ClientConfig {
  appId: string;
  licenseKey: string;
  orgId: string;
  baseUrl?: string;
  timeout?: number;
  refreshInterval?: number;
  cacheTtl?: number;
  retryCount?: number;
  retryDelay?: number;
}
