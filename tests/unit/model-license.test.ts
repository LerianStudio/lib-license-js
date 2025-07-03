/**
 * Unit tests for license model interfaces
 */

import { Config, ValidationResult, LicenseValidationRequest } from '../../src/model/license';

describe('License Model Types', () => {
  describe('Config interface', () => {
    it('should define correct Config structure', () => {
      const config: Config = {
        applicationName: 'test-app',
        licenseKey: 'test-license-key',
        organizationId: 'test-org-id',
        fingerprint: 'test-fingerprint',
      };

      expect(config.applicationName).toBe('test-app');
      expect(config.licenseKey).toBe('test-license-key');
      expect(config.organizationId).toBe('test-org-id');
      expect(config.fingerprint).toBe('test-fingerprint');
    });
  });

  describe('ValidationResult interface', () => {
    it('should define correct ValidationResult structure with all properties', () => {
      const result: ValidationResult = {
        valid: true,
        expiryDaysLeft: 30,
        activeGracePeriod: false,
        isTrial: true,
      };

      expect(result.valid).toBe(true);
      expect(result.expiryDaysLeft).toBe(30);
      expect(result.activeGracePeriod).toBe(false);
      expect(result.isTrial).toBe(true);
    });

    it('should allow optional properties to be undefined', () => {
      const result: ValidationResult = {
        valid: false,
      };

      expect(result.valid).toBe(false);
      expect(result.expiryDaysLeft).toBeUndefined();
      expect(result.activeGracePeriod).toBeUndefined();
      expect(result.isTrial).toBeUndefined();
    });

    it('should handle different validation scenarios', () => {
      // Valid license
      const validLicense: ValidationResult = {
        valid: true,
        expiryDaysLeft: 30,
        activeGracePeriod: false,
        isTrial: false,
      };

      // Trial license
      const trialLicense: ValidationResult = {
        valid: true,
        expiryDaysLeft: 14,
        activeGracePeriod: false,
        isTrial: true,
      };

      // Grace period license
      const gracePeriodLicense: ValidationResult = {
        valid: true,
        expiryDaysLeft: 3,
        activeGracePeriod: true,
        isTrial: false,
      };

      // Invalid license
      const invalidLicense: ValidationResult = {
        valid: false,
        expiryDaysLeft: 0,
        activeGracePeriod: false,
        isTrial: false,
      };

      expect(validLicense.valid).toBe(true);
      expect(trialLicense.isTrial).toBe(true);
      expect(gracePeriodLicense.activeGracePeriod).toBe(true);
      expect(invalidLicense.valid).toBe(false);
    });
  });

  describe('LicenseValidationRequest interface', () => {
    it('should define correct LicenseValidationRequest structure', () => {
      const request: LicenseValidationRequest = {
        licenseKey: 'test-license-key',
        fingerprint: 'test-fingerprint',
      };

      expect(request.licenseKey).toBe('test-license-key');
      expect(request.fingerprint).toBe('test-fingerprint');
    });
  });

  describe('Type checking', () => {
    it('should enforce type safety for Config', () => {
      // This test ensures TypeScript type checking works
      const config: Config = {
        applicationName: 'app',
        licenseKey: 'key',
        organizationId: 'org',
        fingerprint: 'fp',
      };

      // All properties should be strings
      expect(typeof config.applicationName).toBe('string');
      expect(typeof config.licenseKey).toBe('string');
      expect(typeof config.organizationId).toBe('string');
      expect(typeof config.fingerprint).toBe('string');
    });

    it('should enforce type safety for ValidationResult', () => {
      const result: ValidationResult = {
        valid: true,
        expiryDaysLeft: 30,
        activeGracePeriod: false,
        isTrial: true,
      };

      // Type checking
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.expiryDaysLeft).toBe('number');
      expect(typeof result.activeGracePeriod).toBe('boolean');
      expect(typeof result.isTrial).toBe('boolean');
    });

    it('should enforce type safety for LicenseValidationRequest', () => {
      const request: LicenseValidationRequest = {
        licenseKey: 'key',
        fingerprint: 'fp',
      };

      expect(typeof request.licenseKey).toBe('string');
      expect(typeof request.fingerprint).toBe('string');
    });
  });
});