/**
 * Unit tests for environment utilities
 */

import { Utils } from '../../src/util/env';

describe('Utils', () => {
  describe('validateConfig', () => {
    it('should pass with valid configuration', () => {
      expect(() => {
        Utils.validateConfig('test-app', 'valid-license-key', 'org-123');
      }).not.toThrow();
    });

    it('should throw error for empty applicationName', () => {
      expect(() => {
        Utils.validateConfig('', 'valid-license-key', 'org-123');
      }).toThrow('Application ID must be a non-empty string');
    });

    it('should throw error for empty licenseKey', () => {
      expect(() => {
        Utils.validateConfig('test-app', '', 'org-123');
      }).toThrow('License key must be a non-empty string');
    });

    it('should throw error for empty organizationId', () => {
      expect(() => {
        Utils.validateConfig('test-app', 'valid-license-key', '');
      }).toThrow('Organization ID must be a non-empty string');
    });

    it('should allow whitespace-only values (current implementation)', () => {
      // Note: Current implementation doesn't trim strings, so whitespace-only strings pass
      expect(() => {
        Utils.validateConfig('  ', 'valid-license-key', 'org-123');
      }).not.toThrow();

      expect(() => {
        Utils.validateConfig('test-app', '   ', 'org-123');
      }).not.toThrow();

      expect(() => {
        Utils.validateConfig('test-app', 'valid-license-key', '  ');
      }).not.toThrow();
    });
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint for same inputs', () => {
      const fp1 = Utils.generateFingerprint('app', 'license', 'org');
      const fp2 = Utils.generateFingerprint('app', 'license', 'org');
      
      expect(fp1).toBe(fp2);
      expect(typeof fp1).toBe('string');
      expect(fp1.length).toBeGreaterThan(0);
    });

    it('should generate different fingerprints for different inputs', () => {
      const fp1 = Utils.generateFingerprint('app1', 'license', 'org');
      const fp2 = Utils.generateFingerprint('app2', 'license', 'org');
      const fp3 = Utils.generateFingerprint('app1', 'license2', 'org');
      const fp4 = Utils.generateFingerprint('app1', 'license', 'org2');

      expect(fp1).not.toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp1).not.toBe(fp4);
    });

    it('should generate fingerprint with reasonable length', () => {
      const fingerprint = Utils.generateFingerprint('test', 'test', 'test');
      expect(fingerprint.length).toBeGreaterThan(10);
      expect(fingerprint.length).toBeLessThan(100);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format Error object', () => {
      const error = new Error('Test error message');
      const formatted = Utils.formatErrorMessage(error);
      
      expect(formatted).toBe('Test error message');
    });

    it('should format string error', () => {
      const formatted = Utils.formatErrorMessage('String error');
      
      expect(formatted).toBe('String error');
    });

    it('should format object with message property', () => {
      const error = { message: 'Object error message' };
      const formatted = Utils.formatErrorMessage(error);
      
      expect(formatted).toBe('[object Object]');
    });

    it('should stringify objects without message property', () => {
      const error = { code: 500, details: 'Something went wrong' };
      const formatted = Utils.formatErrorMessage(error);
      
      expect(formatted).toBe('[object Object]');
    });

    it('should handle null and undefined', () => {
      expect(Utils.formatErrorMessage(null)).toBe('null');
      expect(Utils.formatErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle primitive values', () => {
      expect(Utils.formatErrorMessage(123)).toBe('123');
      expect(Utils.formatErrorMessage(true)).toBe('true');
    });
  });

  describe('logLicenseStatus', () => {
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };
    });

    it('should log valid license', () => {
      const result = {
        valid: true,
        expiryDaysLeft: 30,
        activeGracePeriod: false,
        isTrial: false,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'License validation successful for application: test-app'
      );
    });

    it('should log trial license', () => {
      const result = {
        valid: true,
        expiryDaysLeft: 15,
        activeGracePeriod: false,
        isTrial: true,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Application test-app is running on a trial license'
      );
    });

    it('should log grace period license', () => {
      const result = {
        valid: true,
        expiryDaysLeft: 5,
        activeGracePeriod: true,
        isTrial: false,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Application test-app is in grace period - license expired but still functional'
      );
    });

    it('should log expiry warning for 30 days', () => {
      const result = {
        valid: true,
        expiryDaysLeft: 30,
        activeGracePeriod: false,
        isTrial: false,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'License for test-app expires in 30 days'
      );
    });

    it('should log expiry warning for 7 days', () => {
      const result = {
        valid: true,
        expiryDaysLeft: 7,
        activeGracePeriod: false,
        isTrial: false,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'License for test-app expires in 7 days'
      );
    });

    it('should log invalid license', () => {
      const result = {
        valid: false,
        expiryDaysLeft: 0,
        activeGracePeriod: false,
        isTrial: false,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'License validation failed for application: test-app'
      );
    });

    it('should handle missing expiry days', () => {
      const result = {
        valid: true,
        activeGracePeriod: false,
        isTrial: false,
      };

      Utils.logLicenseStatus(mockLogger, result, 'test-app');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'License validation successful for application: test-app'
      );
    });
  });
});