/**
 * License domain models
 * Following lib-license-go model/license.go patterns
 */

export interface Config {
  applicationName: string;
  licenseKey: string;
  organizationIds: string;
  fingerprint: string;
}

export interface ValidationResult {
  valid: boolean;
  expiryDaysLeft?: number;
  activeGracePeriod?: boolean;
  isTrial?: boolean;
}

export interface LicenseValidationRequest {
  licenseKey: string;
  fingerprint: string;
}
