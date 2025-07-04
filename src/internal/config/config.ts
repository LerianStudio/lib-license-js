/**
 * Internal configuration structures
 * Following lib-license-go internal/config/config.go patterns
 */

export interface ClientConfig {
  applicationName: string;
  licenseKey: string;
  organizationId: string;
  baseUrl?: string;
  timeout?: number;
  refreshInterval?: number;
  cacheTtl?: number;
  retryCount?: number;
  retryDelay?: number;
}
