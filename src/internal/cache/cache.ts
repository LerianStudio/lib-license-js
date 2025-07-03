/**
 * Cache management for license validation
 * Following lib-license-go internal/cache/cache.go patterns
 */

import { LICENSE_CONSTANTS } from '../../constant/license';

// Simple in-memory cache implementation
class SimpleCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private defaultTtl: number;

  constructor(defaultTtl: number) {
    this.defaultTtl = defaultTtl;
  }

  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    const ttl = ttlSeconds || this.defaultTtl;
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiry });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  close(): void {
    this.cache.clear();
  }
}

export class LicenseCacheManager {
  private cacheManager: SimpleCache;

  constructor(defaultTtl: number = LICENSE_CONSTANTS.CACHE_TTL) {
    this.cacheManager = new SimpleCache(defaultTtl);
  }

  get(key: string): any | undefined {
    return this.cacheManager.get(key);
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    this.cacheManager.set(key, value, ttlSeconds);
  }

  del(key: string): void {
    this.cacheManager.del(key);
  }

  has(key: string): boolean {
    return this.cacheManager.has(key);
  }

  clear(): void {
    this.cacheManager.clear();
  }

  close(): void {
    this.cacheManager.close();
  }
}
