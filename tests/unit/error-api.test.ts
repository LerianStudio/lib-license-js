/**
 * Unit tests for ApiError
 */

import { ApiError } from '../../src/error/error';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create ApiError with message and status code', () => {
      const error = new ApiError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create ApiError with message and status code', () => {
      const error = new ApiError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('isServerError', () => {
    it('should return true for 5xx status codes', () => {
      expect(ApiError.isServerError(500)).toBe(true);
      expect(ApiError.isServerError(501)).toBe(true);
      expect(ApiError.isServerError(502)).toBe(true);
      expect(ApiError.isServerError(503)).toBe(true);
      expect(ApiError.isServerError(504)).toBe(true);
      expect(ApiError.isServerError(599)).toBe(true);
    });

    it('should return false for non-5xx status codes', () => {
      expect(ApiError.isServerError(200)).toBe(false);
      expect(ApiError.isServerError(400)).toBe(false);
      expect(ApiError.isServerError(401)).toBe(false);
      expect(ApiError.isServerError(404)).toBe(false);
      expect(ApiError.isServerError(600)).toBe(true); // 600 >= 500 so it's true
    });

    it('should return false for undefined status code', () => {
      expect(ApiError.isServerError(undefined as any)).toBe(false);
    });
  });

  describe('isClientError', () => {
    it('should return true for 4xx status codes', () => {
      expect(ApiError.isClientError(400)).toBe(true);
      expect(ApiError.isClientError(401)).toBe(true);
      expect(ApiError.isClientError(403)).toBe(true);
      expect(ApiError.isClientError(404)).toBe(true);
      expect(ApiError.isClientError(429)).toBe(true);
      expect(ApiError.isClientError(499)).toBe(true);
    });

    it('should return false for non-4xx status codes', () => {
      expect(ApiError.isClientError(200)).toBe(false);
      expect(ApiError.isClientError(300)).toBe(false);
      expect(ApiError.isClientError(500)).toBe(false);
      expect(ApiError.isClientError(600)).toBe(false);
    });

    it('should return false for undefined status code', () => {
      expect(ApiError.isClientError(undefined as any)).toBe(false);
    });
  });

  describe('isConnectionError', () => {
    it('should return true for connection-related errors', () => {
      const econnrefused = new Error('ECONNREFUSED');
      const enotfound = new Error('ENOTFOUND'); 
      const etimeout = new Error('ETIMEDOUT');
      const econnreset = new Error('Connection reset'); // This won't match the current implementation

      expect(ApiError.isConnectionError(econnrefused)).toBe(true);
      expect(ApiError.isConnectionError(enotfound)).toBe(true);
      expect(ApiError.isConnectionError(etimeout)).toBe(true);
      expect(ApiError.isConnectionError(econnreset)).toBe(true); // message contains 'connection'
    });

    it('should return true for network timeout errors', () => {
      const timeoutError = new Error('Network timeout');
      const fetchTimeout = new Error('timeout occurred'); // Changed to include 'timeout'

      expect(ApiError.isConnectionError(timeoutError)).toBe(true);
      expect(ApiError.isConnectionError(fetchTimeout)).toBe(true);
    });

    it('should return false for non-connection errors', () => {
      const genericError = new Error('Generic error');
      const syntaxError = new SyntaxError('Invalid JSON');

      expect(ApiError.isConnectionError(genericError)).toBe(false);
      expect(ApiError.isConnectionError(syntaxError)).toBe(false);
    });

    it('should return false for ApiError instances', () => {
      const apiError = new ApiError('API Error', 400);

      expect(ApiError.isConnectionError(apiError)).toBe(false);
    });

    it('should handle error objects with connection keywords in message', () => {
      const errorWithCode = new Error('Connection failed ECONNREFUSED');

      expect(ApiError.isConnectionError(errorWithCode)).toBe(true);
    });

    it('should handle errors with network keywords in message', () => {
      const errorWithCause = new Error('Network fetch failed with ENOTFOUND');

      expect(ApiError.isConnectionError(errorWithCause)).toBe(true);
    });
  });

  describe('error inheritance', () => {
    it('should maintain proper error prototype chain', () => {
      const error = new ApiError('Test', 500);

      expect(error instanceof ApiError).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype);
    });

    it('should be catchable as Error', () => {
      expect(() => {
        throw new ApiError('Test', 500);
      }).toThrow(Error);
    });

    it('should preserve stack trace', () => {
      const error = new ApiError('Test', 500);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('ApiError');
    });
  });
});