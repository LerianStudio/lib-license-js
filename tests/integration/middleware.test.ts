/**
 * Unit tests for LicenseMiddleware
 */

import { 
  LicenseMiddleware, 
  createLicenseMiddleware,
  createExpressMiddleware,
  createFastifyMiddleware,
  createKoaMiddleware 
} from '../../src/middleware/middleware';
import { LicenseClient } from '../../src/client';
import { createMockLogger, createMockValidationResult } from '../setup';

// Mock LicenseClient
jest.mock('../../src/client');
jest.mock('../../src/util/env', () => ({
  Utils: {
    formatErrorMessage: jest.fn((error) => error instanceof Error ? error.message : String(error)),
    validateConfig: jest.fn(),
    generateFingerprint: jest.fn().mockReturnValue('test-fingerprint'),
    logLicenseStatus: jest.fn(),
  }
}));

const MockedLicenseClient = LicenseClient as jest.MockedClass<typeof LicenseClient>;

describe('LicenseMiddleware', () => {
  let mockLogger: any;
  let mockLicenseClient: jest.Mocked<LicenseClient>;
  let middleware: LicenseMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = createMockLogger();

    mockLicenseClient = {
      validate: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      setTerminationHandler: jest.fn(),
      getValidationClient: jest.fn(),
      isRefreshActive: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    middleware = new LicenseMiddleware(mockLicenseClient, mockLogger);
  });

  describe('express middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('should allow request with valid license', async () => {
      const validResult = createMockValidationResult(true);
      mockLicenseClient.validate.mockResolvedValue(validResult);

      const expressMiddleware = middleware.express();
      await expressMiddleware(mockReq, mockRes, mockNext);

      expect(mockLicenseClient.validate).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'License validation passed - proceeding with request'
      );
    });

    it('should block request with invalid license', async () => {
      const invalidResult = createMockValidationResult(false);
      mockLicenseClient.validate.mockResolvedValue(invalidResult);

      const expressMiddleware = middleware.express();
      await expressMiddleware(mockReq, mockRes, mockNext);

      expect(mockLicenseClient.validate).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'License validation failed',
        code: 'INVALID_LICENSE',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License validation failed - blocking request'
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation error');
      mockLicenseClient.validate.mockRejectedValue(error);

      const expressMiddleware = middleware.express();
      await expressMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'License validation error',
        code: 'LICENSE_ERROR',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License middleware error: Validation error'
      );
    });
  });

  describe('fastify middleware', () => {
    let mockRequest: any;
    let mockReply: any;

    beforeEach(() => {
      mockRequest = {};
      mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
    });

    it('should allow request with valid license', async () => {
      const validResult = createMockValidationResult(true);
      mockLicenseClient.validate.mockResolvedValue(validResult);

      const fastifyMiddleware = middleware.fastify() as any;
      await fastifyMiddleware(mockRequest, mockReply);

      expect(mockLicenseClient.validate).toHaveBeenCalled();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'License validation passed - proceeding with request'
      );
    });

    it('should block request with invalid license', async () => {
      const invalidResult = createMockValidationResult(false);
      mockLicenseClient.validate.mockResolvedValue(invalidResult);

      const fastifyMiddleware = middleware.fastify() as any;
      await fastifyMiddleware(mockRequest, mockReply);

      expect(mockLicenseClient.validate).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'License validation failed',
        code: 'INVALID_LICENSE',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License validation failed - blocking request'
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation error');
      mockLicenseClient.validate.mockRejectedValue(error);

      const fastifyMiddleware = middleware.fastify() as any;
      await fastifyMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'License validation error',
        code: 'LICENSE_ERROR',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License middleware error: Validation error'
      );
    });
  });

  describe('koa middleware', () => {
    let mockCtx: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockCtx = {
        status: undefined,
        body: undefined,
      };
      mockNext = jest.fn().mockResolvedValue(undefined);
    });

    it('should allow request with valid license', async () => {
      const validResult = createMockValidationResult(true);
      mockLicenseClient.validate.mockResolvedValue(validResult);

      const koaMiddleware = middleware.koa();
      await koaMiddleware(mockCtx, mockNext);

      expect(mockLicenseClient.validate).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.status).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'License validation passed - proceeding with request'
      );
    });

    it('should block request with invalid license', async () => {
      const invalidResult = createMockValidationResult(false);
      mockLicenseClient.validate.mockResolvedValue(invalidResult);

      const koaMiddleware = middleware.koa();
      await koaMiddleware(mockCtx, mockNext);

      expect(mockLicenseClient.validate).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(403);
      expect(mockCtx.body).toEqual({
        error: 'License validation failed',
        code: 'INVALID_LICENSE',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License validation failed - blocking request'
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation error');
      mockLicenseClient.validate.mockRejectedValue(error);

      const koaMiddleware = middleware.koa();
      await koaMiddleware(mockCtx, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.status).toBe(500);
      expect(mockCtx.body).toEqual({
        error: 'License validation error',
        code: 'LICENSE_ERROR',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'License middleware error: Validation error'
      );
    });
  });
});

describe('Factory Functions', () => {
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
  });

  describe('createLicenseMiddleware', () => {
    it('should create LicenseMiddleware with LicenseClient', () => {
      const result = createLicenseMiddleware('app', 'key', 'org', mockLogger);

      expect(result).toBeInstanceOf(LicenseMiddleware);
      expect(MockedLicenseClient).toHaveBeenCalledWith('app', 'key', 'org', mockLogger);
    });
  });

  describe('createExpressMiddleware', () => {
    it('should create Express middleware function', () => {
      const middleware = createExpressMiddleware('app', 'key', 'org', mockLogger);

      expect(typeof middleware).toBe('function');
      expect(MockedLicenseClient).toHaveBeenCalledWith('app', 'key', 'org', mockLogger);
    });
  });

  describe('createFastifyMiddleware', () => {
    it('should create Fastify middleware function', () => {
      const middleware = createFastifyMiddleware('app', 'key', 'org', mockLogger);

      expect(typeof middleware).toBe('function');
      expect(MockedLicenseClient).toHaveBeenCalledWith('app', 'key', 'org', mockLogger);
    });
  });

  describe('createKoaMiddleware', () => {
    it('should create Koa middleware function', () => {
      const middleware = createKoaMiddleware('app', 'key', 'org', mockLogger);

      expect(typeof middleware).toBe('function');
      expect(MockedLicenseClient).toHaveBeenCalledWith('app', 'key', 'org', mockLogger);
    });
  });
});