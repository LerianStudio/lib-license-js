/**
 * Unit tests for ValidationClient
 */

import { ValidationClient } from '../../src/validation/client';
import { createMockLogger, createMockValidationResult } from '../setup';
import { ApiError } from '../../src/error/error';

// Mock dependencies
jest.mock('../../src/internal/cache/cache');
jest.mock('../../src/internal/api/client');
jest.mock('../../src/util/env');

import { LicenseCacheManager } from '../../src/internal/cache/cache';
import { ApiClient } from '../../src/internal/api/client';
import { Utils } from '../../src/util/env';

const MockedLicenseCacheManager = LicenseCacheManager as jest.MockedClass<typeof LicenseCacheManager>;
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockedUtils = Utils as jest.Mocked<typeof Utils>;

describe('ValidationClient', () => {
  let validationClient: ValidationClient;
  let mockLogger: any;
  let mockCacheManager: jest.Mocked<LicenseCacheManager>;
  let mockApiClient: jest.Mocked<ApiClient>;

  const defaultConfig = {
    appId: 'test-app',
    licenseKey: 'test-license-key',
    orgId: 'test-org-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = createMockLogger();

    // Mock Utils methods
    MockedUtils.validateConfig = jest.fn();
    MockedUtils.generateFingerprint = jest.fn().mockReturnValue('test-fingerprint');
    MockedUtils.formatErrorMessage = jest.fn().mockImplementation((error) => 
      error instanceof Error ? error.message : String(error)
    );
    MockedUtils.logLicenseStatus = jest.fn();

    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
    } as any;
    MockedLicenseCacheManager.mockImplementation(() => mockCacheManager);

    // Mock API client
    mockApiClient = {
      validateLicense: jest.fn(),
    } as any;
    MockedApiClient.mockImplementation(() => mockApiClient);

    validationClient = new ValidationClient(
      defaultConfig.appId,
      defaultConfig.licenseKey,
      defaultConfig.orgId,
      mockLogger
    );
  });

  describe('constructor', () => {
    it('should create ValidationClient with valid configuration', () => {
      expect(MockedUtils.validateConfig).toHaveBeenCalledWith(
        defaultConfig.appId,
        defaultConfig.licenseKey,
        defaultConfig.orgId
      );
      expect(MockedUtils.generateFingerprint).toHaveBeenCalledWith(
        defaultConfig.appId,
        defaultConfig.licenseKey,
        defaultConfig.orgId
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `License validation client initialized for application: ${defaultConfig.appId}`
      );
    });

    it('should create cache manager with default TTL', () => {
      expect(MockedLicenseCacheManager).toHaveBeenCalledWith(86400); // 24 hours default from LICENSE_CONSTANTS
    });

    it('should create API client with default options', () => {
      expect(MockedApiClient).toHaveBeenCalledWith(
        mockLogger,
        'https://license.dev.midaz.io', // default base URL
        3, // default retry count
        5000, // default retry delay
        5000 // default timeout
      );
    });

    it('should use custom options when provided', () => {
      const customOptions = {
        baseUrl: 'https://custom.license.server',
        timeout: 10000,
        cacheTtl: 3600,
        retryCount: 5,
        retryDelay: 2000,
      };

      new ValidationClient(
        defaultConfig.appId,
        defaultConfig.licenseKey,
        defaultConfig.orgId,
        mockLogger,
        customOptions
      );

      expect(MockedLicenseCacheManager).toHaveBeenCalledWith(3600);
      expect(MockedApiClient).toHaveBeenCalledWith(
        mockLogger,
        'https://custom.license.server',
        5,
        2000,
        10000
      );
    });
  });

  describe('validate', () => {
    it('should return cached result when available', async () => {
      const cachedResult = createMockValidationResult(true);
      mockCacheManager.get.mockReturnValue(cachedResult);

      const result = await validationClient.validate();

      expect(result).toBe(cachedResult);
      expect(mockCacheManager.get).toHaveBeenCalledWith('license:test-fingerprint');
      expect(mockApiClient.validateLicense).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Using cached license validation result for: test-app'
      );
      expect(MockedUtils.logLicenseStatus).toHaveBeenCalledWith(
        mockLogger,
        cachedResult,
        'test-app'
      );
    });

    it('should fetch new result when cache is empty', async () => {
      const apiResult = createMockValidationResult(true);
      mockCacheManager.get.mockReturnValue(null);
      mockApiClient.validateLicense.mockResolvedValue(apiResult);

      const result = await validationClient.validate();

      expect(result).toBe(apiResult);
      expect(mockApiClient.validateLicense).toHaveBeenCalledWith({
        applicationName: 'test-app',
        licenseKey: 'test-license-key',
        organizationId: 'test-org-id',
        fingerprint: 'test-fingerprint',
      });
    });

    it('should cache valid result', async () => {
      const apiResult = createMockValidationResult(true);
      mockCacheManager.get.mockReturnValue(null);
      mockApiClient.validateLicense.mockResolvedValue(apiResult);

      await validationClient.validate();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'license:test-fingerprint',
        apiResult,
        3600
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cached license validation result for: test-app'
      );
    });

    it('should not cache invalid result', async () => {
      const apiResult = createMockValidationResult(false);
      mockCacheManager.get.mockReturnValue(null);
      mockApiClient.validateLicense.mockResolvedValue(apiResult);

      await validationClient.validate();

      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle cache retrieval errors gracefully', async () => {
      const apiResult = createMockValidationResult(true);
      mockCacheManager.get.mockImplementation(() => {
        throw new Error('Cache error');
      });
      mockApiClient.validateLicense.mockResolvedValue(apiResult);

      const result = await validationClient.validate();

      expect(result).toBe(apiResult);
      expect(mockLogger.warn).toHaveBeenCalledWith('Cache retrieval failed: Cache error');
    });

    it('should handle cache set errors gracefully', async () => {
      const apiResult = createMockValidationResult(true);
      mockCacheManager.get.mockReturnValue(null);
      mockCacheManager.set.mockImplementation(() => {
        throw new Error('Cache set error');
      });
      mockApiClient.validateLicense.mockResolvedValue(apiResult);

      const result = await validationClient.validate();

      expect(result).toBe(apiResult);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to cache license result: Cache set error');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockCacheManager.get.mockReturnValue(null);
    });

    it('should handle server errors (5xx) with cached fallback', async () => {
      const cachedResult = createMockValidationResult(true);
      const serverError = new ApiError('Server Error', 500);
      
      mockCacheManager.get
        .mockReturnValueOnce(null) // First call for validation
        .mockReturnValueOnce(cachedResult); // Second call for fallback
      
      mockApiClient.validateLicense.mockRejectedValue(serverError);

      const result = await validationClient.validate();

      expect(result).toBe(cachedResult);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Server error during validation (500): Server Error'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Using cached result due to server error');
    });

    it('should handle server errors (5xx) without cached fallback', async () => {
      const serverError = new ApiError('Server Error', 503);
      mockCacheManager.get.mockReturnValue(null);
      mockApiClient.validateLicense.mockRejectedValue(serverError);

      const result = await validationClient.validate();

      expect(result).toEqual({
        valid: true,
        expiryDaysLeft: 7,
        activeGracePeriod: false,
        isTrial: false,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No cached result available, using fallback validation'
      );
    });

    it('should handle client errors (4xx)', async () => {
      const clientError = new ApiError('Unauthorized', 401);
      mockApiClient.validateLicense.mockRejectedValue(clientError);

      const result = await validationClient.validate();

      expect(result).toEqual({
        valid: false,
        expiryDaysLeft: 0,
        activeGracePeriod: false,
        isTrial: false,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Client error during validation (401): Unauthorized'
      );
    });

    it('should handle connection errors with cached fallback', async () => {
      const cachedResult = createMockValidationResult(true);
      const connectionError = new Error('ECONNREFUSED');
      
      mockCacheManager.get
        .mockReturnValueOnce(null) // First call for validation
        .mockReturnValueOnce(cachedResult); // Second call for fallback

      // Mock ApiError.isConnectionError to return true
      jest.spyOn(ApiError, 'isConnectionError').mockReturnValue(true);
      
      mockApiClient.validateLicense.mockRejectedValue(connectionError);

      const result = await validationClient.validate();

      expect(result).toBe(cachedResult);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Connection error during validation: ECONNREFUSED'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Using cached result due to connection error');
    });

    it('should handle connection errors without cached fallback', async () => {
      const connectionError = new Error('ECONNREFUSED');
      mockCacheManager.get.mockReturnValue(null);
      
      jest.spyOn(ApiError, 'isConnectionError').mockReturnValue(true);
      mockApiClient.validateLicense.mockRejectedValue(connectionError);

      const result = await validationClient.validate();

      expect(result).toEqual({
        valid: true,
        expiryDaysLeft: 7,
        activeGracePeriod: false,
        isTrial: false,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No cached result available, using fallback validation'
      );
    });

    it('should rethrow unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      jest.spyOn(ApiError, 'isConnectionError').mockReturnValue(false);
      mockApiClient.validateLicense.mockRejectedValue(unexpectedError);

      await expect(validationClient.validate()).rejects.toThrow('Unexpected error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected validation error: Unexpected error'
      );
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', () => {
      validationClient.clearCache();

      expect(mockCacheManager.del).toHaveBeenCalledWith('license:test-fingerprint');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cleared cache for application: test-app'
      );
    });

    it('should handle cache clear errors gracefully', () => {
      mockCacheManager.del.mockImplementation(() => {
        throw new Error('Cache clear error');
      });

      validationClient.clearCache();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to clear cache: Cache clear error'
      );
    });
  });

  describe('getConfig', () => {
    it('should return readonly copy of config', () => {
      const config = validationClient.getConfig();

      expect(config).toEqual({
        applicationName: 'test-app',
        licenseKey: 'test-license-key',
        organizationId: 'test-org-id',
        fingerprint: 'test-fingerprint',
      });

      // Should be a copy, not the original
      expect(config).not.toBe((validationClient as any).config);
    });
  });

  describe('isValidCacheEntry', () => {
    it('should validate correct cache entry', () => {
      const entry = { valid: true, expiryDaysLeft: 30 };
      const isValid = (validationClient as any).isValidCacheEntry(entry);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid cache entries', () => {
      expect((validationClient as any).isValidCacheEntry(null)).toBeFalsy();
      expect((validationClient as any).isValidCacheEntry(undefined)).toBeFalsy();
      expect((validationClient as any).isValidCacheEntry('string')).toBeFalsy();
      expect((validationClient as any).isValidCacheEntry(123)).toBeFalsy();
      expect((validationClient as any).isValidCacheEntry({})).toBeFalsy();
      expect((validationClient as any).isValidCacheEntry({ valid: 'not-boolean' })).toBeFalsy();
    });

    it('should accept entry with valid boolean property', () => {
      expect((validationClient as any).isValidCacheEntry({ valid: true })).toBe(true);
      expect((validationClient as any).isValidCacheEntry({ valid: false })).toBe(true);
    });
  });
});