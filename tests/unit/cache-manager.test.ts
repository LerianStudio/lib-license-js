/**
 * Unit tests for LicenseCacheManager
 */

import { LicenseCacheManager } from '../../src/internal/cache/cache';

// We'll test the actual implementation since it's a custom cache
describe('LicenseCacheManager', () => {
  let cacheManager: LicenseCacheManager;

  beforeEach(() => {
    cacheManager = new LicenseCacheManager(3600); // 1 hour TTL
  });

  describe('constructor', () => {
    it('should create cache manager with custom TTL', () => {
      const customCacheManager = new LicenseCacheManager(1800);
      expect(customCacheManager).toBeInstanceOf(LicenseCacheManager);
    });

    it('should use default TTL when not provided', () => {
      const defaultCacheManager = new LicenseCacheManager();
      expect(defaultCacheManager).toBeInstanceOf(LicenseCacheManager);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      const testValue = { valid: true, expiryDaysLeft: 30 };
      
      cacheManager.set('test-key', testValue);
      const result = cacheManager.get('test-key');

      expect(result).toEqual(testValue);
    });

    it('should return undefined for non-existent key', () => {
      const result = cacheManager.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should store value with custom TTL', () => {
      const testValue = { valid: true, expiryDaysLeft: 30 };
      
      cacheManager.set('test-key', testValue, 1800);
      const result = cacheManager.get('test-key');

      expect(result).toEqual(testValue);
    });

    it('should handle expiration', (done) => {
      const testValue = { valid: true, expiryDaysLeft: 30 };
      
      // Set with very short TTL (1 second)
      cacheManager.set('test-key', testValue, 1);
      
      // Should be available immediately
      expect(cacheManager.get('test-key')).toEqual(testValue);
      
      // Should be expired after TTL
      setTimeout(() => {
        expect(cacheManager.get('test-key')).toBeUndefined();
        done();
      }, 1100);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cacheManager.set('test-key', 'value');
      expect(cacheManager.has('test-key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cacheManager.has('non-existent')).toBe(false);
    });

    it('should return false for expired key', (done) => {
      cacheManager.set('test-key', 'value', 1); // 1 second TTL
      
      setTimeout(() => {
        expect(cacheManager.has('test-key')).toBe(false);
        done();
      }, 1100);
    });
  });

  describe('del', () => {
    it('should delete existing key', () => {
      cacheManager.set('test-key', 'value');
      expect(cacheManager.has('test-key')).toBe(true);
      
      cacheManager.del('test-key');
      expect(cacheManager.has('test-key')).toBe(false);
    });

    it('should handle deleting non-existent key gracefully', () => {
      expect(() => cacheManager.del('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      expect(cacheManager.has('key1')).toBe(true);
      expect(cacheManager.has('key2')).toBe(true);
      expect(cacheManager.has('key3')).toBe(true);

      cacheManager.clear();

      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(false);
      expect(cacheManager.has('key3')).toBe(false);
    });
  });

  describe('close', () => {
    it('should close the cache and clear entries', () => {
      cacheManager.set('test-key', 'value');
      expect(cacheManager.has('test-key')).toBe(true);

      cacheManager.close();

      expect(cacheManager.has('test-key')).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple values with different TTLs', (done) => {
      cacheManager.set('short', 'value1', 1); // 1 second
      cacheManager.set('long', 'value2', 10); // 10 seconds

      // Both should be available initially
      expect(cacheManager.get('short')).toBe('value1');
      expect(cacheManager.get('long')).toBe('value2');

      // After 1.1 seconds, only long should remain
      setTimeout(() => {
        expect(cacheManager.get('short')).toBeUndefined();
        expect(cacheManager.get('long')).toBe('value2');
        done();
      }, 1100);
    });

    it('should handle object and primitive values', () => {
      const objectValue = { valid: true, count: 42 };
      const stringValue = 'test string';
      const numberValue = 123;
      const booleanValue = true;

      cacheManager.set('object', objectValue);
      cacheManager.set('string', stringValue);
      cacheManager.set('number', numberValue);
      cacheManager.set('boolean', booleanValue);

      expect(cacheManager.get('object')).toEqual(objectValue);
      expect(cacheManager.get('string')).toBe(stringValue);
      expect(cacheManager.get('number')).toBe(numberValue);
      expect(cacheManager.get('boolean')).toBe(booleanValue);
    });

    it('should handle overwriting existing keys', () => {
      cacheManager.set('key', 'value1');
      expect(cacheManager.get('key')).toBe('value1');

      cacheManager.set('key', 'value2');
      expect(cacheManager.get('key')).toBe('value2');
    });
  });
});