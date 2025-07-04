/**
 * Unit tests for LicenseClient
 */

import { LicenseClient } from '../../src/client';
import { createMockLogger, createMockValidationResult, mockExit } from '../setup';

// Mock dependencies
jest.mock('../../src/validation/client');
jest.mock('../../src/internal/refresh/background');
jest.mock('../../src/util/env');

import { ValidationClient } from '../../src/validation/client';
import { BackgroundRefreshManager } from '../../src/internal/refresh/background';
import { Utils } from '../../src/util/env';

const MockedValidationClient = ValidationClient as jest.MockedClass<typeof ValidationClient>;
const MockedBackgroundRefreshManager = BackgroundRefreshManager as jest.MockedClass<typeof BackgroundRefreshManager>;
const MockedUtils = Utils as jest.Mocked<typeof Utils>;

describe('LicenseClient', () => {
  let licenseClient: LicenseClient;
  let mockLogger: any;
  let mockValidationClient: jest.Mocked<ValidationClient>;
  let mockRefreshManager: jest.Mocked<BackgroundRefreshManager>;

  const defaultConfig = {
    applicationName: 'test-app',
    licenseKey: 'test-license-key',
    organizationId: 'test-org-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();

    mockLogger = createMockLogger();

    // Mock Utils methods
    MockedUtils.formatErrorMessage = jest.fn().mockImplementation((error) => 
      error instanceof Error ? error.message : String(error)
    );

    // Mock validation client
    mockValidationClient = {
      validate: jest.fn(),
      clearCache: jest.fn(),
      getConfig: jest.fn(),
    } as any;
    MockedValidationClient.mockImplementation(() => mockValidationClient);

    // Mock refresh manager
    mockRefreshManager = {
      start: jest.fn(),
      stop: jest.fn(),
      isActive: jest.fn(),
    } as any;
    MockedBackgroundRefreshManager.mockImplementation(() => mockRefreshManager);

    licenseClient = new LicenseClient(
      defaultConfig.applicationName,
      defaultConfig.licenseKey,
      defaultConfig.organizationId,
      mockLogger
    );
  });

  describe('constructor', () => {
    it('should create LicenseClient with default configuration', () => {
      expect(MockedValidationClient).toHaveBeenCalledWith(
        defaultConfig.applicationName,
        defaultConfig.licenseKey,
        defaultConfig.organizationId,
        mockLogger,
        {}
      );
      expect(MockedBackgroundRefreshManager).toHaveBeenCalledWith(
        mockValidationClient,
        mockLogger,
        undefined
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `License client created for application: ${defaultConfig.applicationName}`
      );
    });

    it('should create LicenseClient with custom options', () => {
      const customOptions = {
        refreshInterval: 60000,
        timeout: 10000,
        baseUrl: 'https://custom.server',
      };

      // Clear previous calls
      MockedValidationClient.mockClear();
      MockedBackgroundRefreshManager.mockClear();

      new LicenseClient(
        defaultConfig.applicationName,
        defaultConfig.licenseKey,
        defaultConfig.organizationId,
        mockLogger,
        customOptions
      );

      expect(MockedValidationClient).toHaveBeenCalledWith(
        defaultConfig.applicationName,
        defaultConfig.licenseKey,
        defaultConfig.organizationId,
        mockLogger,
        customOptions
      );
      expect(MockedBackgroundRefreshManager).toHaveBeenCalledWith(
        expect.any(Object), // The mock returns a mock object, not a ValidationClient instance
        mockLogger,
        60000
      );
    });

    it('should not be initialized by default', () => {
      expect((licenseClient as any).isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid license', async () => {
      const validResult = createMockValidationResult(true);
      mockValidationClient.validate.mockResolvedValue(validResult);

      await licenseClient.initialize();

      expect(mockValidationClient.validate).toHaveBeenCalled();
      expect(mockRefreshManager.start).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing license client...');
      expect(mockLogger.info).toHaveBeenCalledWith('License client initialized successfully');
      expect((licenseClient as any).isInitialized).toBe(true);
    });

    it('should handle invalid license during initialization', async () => {
      const invalidResult = createMockValidationResult(false);
      mockValidationClient.validate.mockResolvedValue(invalidResult);

      // Mock the termination handler to not actually exit
      const mockTerminationHandler = jest.fn();
      licenseClient.setTerminationHandler(mockTerminationHandler);

      await licenseClient.initialize();

      expect(mockTerminationHandler).toHaveBeenCalledWith(
        'Initial license validation failed for application'
      );
      expect(mockRefreshManager.start).not.toHaveBeenCalled();
      expect((licenseClient as any).isInitialized).toBe(false);
    });

    it('should handle validation errors during initialization', async () => {
      const error = new Error('Validation failed');
      mockValidationClient.validate.mockRejectedValue(error);

      const mockTerminationHandler = jest.fn();
      licenseClient.setTerminationHandler(mockTerminationHandler);

      await licenseClient.initialize();

      expect(mockTerminationHandler).toHaveBeenCalledWith(
        'Failed to initialize license client: Validation failed'
      );
      expect(mockRefreshManager.start).not.toHaveBeenCalled();
      expect((licenseClient as any).isInitialized).toBe(false);
    });

    it('should warn if already initialized', async () => {
      // Initialize once
      const validResult = createMockValidationResult(true);
      mockValidationClient.validate.mockResolvedValue(validResult);
      await licenseClient.initialize();

      // Try to initialize again
      mockValidationClient.validate.mockClear();
      await licenseClient.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith('License client is already initialized');
      expect(mockValidationClient.validate).not.toHaveBeenCalled();
    });

    it('should use default termination handler', async () => {
      const invalidResult = createMockValidationResult(false);
      mockValidationClient.validate.mockResolvedValue(invalidResult);

      // Use setTimeout to avoid actual process.exit in test
      jest.useFakeTimers();

      await licenseClient.initialize();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application termination requested: Initial license validation failed for application'
      );

      // Fast-forward time to trigger the second log message and process.exit
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).toThrow('process.exit() was called');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Terminating application due to license failure'
      );

      jest.useRealTimers();
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      // Initialize the client
      const validResult = createMockValidationResult(true);
      mockValidationClient.validate.mockResolvedValue(validResult);
      await licenseClient.initialize();
      mockValidationClient.validate.mockClear();
    });

    it('should validate successfully', async () => {
      const validResult = createMockValidationResult(true);
      mockValidationClient.validate.mockResolvedValue(validResult);

      const result = await licenseClient.validate();

      expect(result).toBe(validResult);
      expect(mockValidationClient.validate).toHaveBeenCalled();
    });

    it('should handle invalid license', async () => {
      const invalidResult = createMockValidationResult(false);
      mockValidationClient.validate.mockResolvedValue(invalidResult);

      const mockTerminationHandler = jest.fn();
      licenseClient.setTerminationHandler(mockTerminationHandler);

      const result = await licenseClient.validate();

      expect(result).toBe(invalidResult);
      expect(mockTerminationHandler).toHaveBeenCalledWith('License validation failed');
    });

    it('should handle validation errors', async () => {
      const error = new Error('Network error');
      mockValidationClient.validate.mockRejectedValue(error);

      const mockTerminationHandler = jest.fn();
      licenseClient.setTerminationHandler(mockTerminationHandler);

      await expect(licenseClient.validate()).rejects.toThrow('Network error');
      expect(mockTerminationHandler).toHaveBeenCalledWith(
        'License validation error: Network error'
      );
    });

    it('should throw error if not initialized', async () => {
      const uninitializedClient = new LicenseClient(
        defaultConfig.applicationName,
        defaultConfig.licenseKey,
        defaultConfig.organizationId,
        mockLogger
      );

      await expect(uninitializedClient.validate()).rejects.toThrow(
        'License client not initialized. Call initialize() first.'
      );
    });
  });

  describe('setTerminationHandler', () => {
    it('should set custom termination handler', () => {
      const customHandler = jest.fn();
      
      licenseClient.setTerminationHandler(customHandler);

      expect(mockLogger.debug).toHaveBeenCalledWith('Custom termination handler set');
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', () => {
      licenseClient.shutdown();

      expect(mockRefreshManager.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down license client...');
      expect(mockLogger.info).toHaveBeenCalledWith('License client shutdown completed');
      expect((licenseClient as any).isInitialized).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return validation client', () => {
      const client = licenseClient.getValidationClient();
      expect(client).toBe(mockValidationClient);
    });

    it('should return refresh active status', () => {
      mockRefreshManager.isActive.mockReturnValue(true);
      
      const isActive = licenseClient.isRefreshActive();
      
      expect(isActive).toBe(true);
      expect(mockRefreshManager.isActive).toHaveBeenCalled();
    });

    it('should clear cache', () => {
      licenseClient.clearCache();
      
      expect(mockValidationClient.clearCache).toHaveBeenCalled();
    });
  });

  describe('createDefaultTerminationHandler', () => {
    it('should create handler that logs and exits', () => {
      jest.useFakeTimers();

      const handler = (licenseClient as any).createDefaultTerminationHandler();
      
      handler('Test reason');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application termination requested: Test reason'
      );

      // Fast-forward time to trigger the timeout
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).toThrow('process.exit() was called');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Terminating application due to license failure'
      );

      jest.useRealTimers();
    });
  });
});