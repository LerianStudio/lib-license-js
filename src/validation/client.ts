import { Config, ValidationResult } from '../model/license';
import { ClientConfig } from '../internal/config/config';
import { Logger } from '../types';
// Removed broken lib-commons-js import
import { LicenseCacheManager } from '../internal/cache/cache';
import { ApiClient } from '../internal/api/client';
import { Utils } from '../util/env';
import { ApiError } from '../error/error';
import { HTTP_CONSTANTS } from '../constant/http';
import { LICENSE_CONSTANTS } from '../constant/license';

export class ValidationClient {
  private config: Config;
  private cacheManager: LicenseCacheManager;
  private apiClient: ApiClient;
  private logger: Logger;
  private cacheKey: string;

  constructor(
    appId: string,
    licenseKey: string,
    orgId: string,
    logger: Logger,
    options: Partial<ClientConfig> = {},
  ) {
    Utils.validateConfig(appId, licenseKey, orgId);

    this.config = {
      applicationName: appId,
      licenseKey,
      organizationId: orgId,
      fingerprint: Utils.generateFingerprint(appId, licenseKey, orgId),
    };

    this.logger = logger;
    this.cacheKey = `license:${this.config.fingerprint}`;

    this.cacheManager = new LicenseCacheManager(
      options.cacheTtl || LICENSE_CONSTANTS.CACHE_TTL,
    );

    this.apiClient = new ApiClient(
      logger,
      options.baseUrl || HTTP_CONSTANTS.BASE_URL,
      options.retryCount || HTTP_CONSTANTS.RETRY_COUNT,
      options.retryDelay || HTTP_CONSTANTS.RETRY_DELAY,
      options.timeout || HTTP_CONSTANTS.TIMEOUT,
    );

    this.logger.info(
      `License validation client initialized for application: ${appId}`,
    );
  }

  async validate(): Promise<ValidationResult> {
    const cachedResult = this.getCachedResult();
    if (cachedResult) {
      this.logger.debug(
        `Using cached license validation result for: ${this.config.applicationName}`,
      );
      Utils.logLicenseStatus(
        this.logger,
        cachedResult,
        this.config.applicationName,
      );
      return cachedResult;
    }

    try {
      const result = await this.apiClient.validateLicense(this.config);

      if (result.valid) {
        this.cacheResult(result);
      }

      Utils.logLicenseStatus(this.logger, result, this.config.applicationName);

      return result;
    } catch (error) {
      return this.handleValidationError(error as Error);
    }
  }

  private getCachedResult(): ValidationResult | null {
    try {
      const cached = this.cacheManager.get(this.cacheKey);
      if (cached && this.isValidCacheEntry(cached)) {
        return cached as ValidationResult;
      }
    } catch (error) {
      this.logger.warn(
        `Cache retrieval failed: ${Utils.formatErrorMessage(error)}`,
      );
    }
    return null;
  }

  private cacheResult(result: ValidationResult): void {
    try {
      this.cacheManager.set(this.cacheKey, result, HTTP_CONSTANTS.CACHE_TTL);
      this.logger.debug(
        `Cached license validation result for: ${this.config.applicationName}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache license result: ${Utils.formatErrorMessage(error)}`,
      );
    }
  }

  private isValidCacheEntry(entry: any): boolean {
    return (
      entry && typeof entry === 'object' && typeof entry.valid === 'boolean'
    );
  }

  private handleValidationError(error: Error): ValidationResult {
    if (error instanceof ApiError) {
      if (ApiError.isServerError(error.statusCode)) {
        return this.handleServerError(error);
      } else if (ApiError.isClientError(error.statusCode)) {
        return this.handleClientError(error);
      }
    }

    if (ApiError.isConnectionError(error)) {
      return this.handleConnectionError(error);
    }

    this.logger.error(
      `Unexpected validation error: ${Utils.formatErrorMessage(error)}`,
    );
    throw error;
  }

  private handleServerError(error: ApiError): ValidationResult {
    this.logger.warn(
      `Server error during validation (${error.statusCode}): ${error.message}`,
    );

    const cachedResult = this.getCachedResult();
    if (cachedResult) {
      this.logger.info('Using cached result due to server error');
      return cachedResult;
    }

    this.logger.warn('No cached result available, using fallback validation');
    return {
      valid: true,
      expiryDaysLeft: 7,
      activeGracePeriod: false,
      isTrial: false,
    };
  }

  private handleClientError(error: ApiError): ValidationResult {
    this.logger.error(
      `Client error during validation (${error.statusCode}): ${error.message}`,
    );

    const invalidResult: ValidationResult = {
      valid: false,
      expiryDaysLeft: 0,
      activeGracePeriod: false,
      isTrial: false,
    };

    return invalidResult;
  }

  private handleConnectionError(error: Error): ValidationResult {
    this.logger.warn(`Connection error during validation: ${error.message}`);

    const cachedResult = this.getCachedResult();
    if (cachedResult) {
      this.logger.info('Using cached result due to connection error');
      return cachedResult;
    }

    this.logger.warn('No cached result available, using fallback validation');
    return {
      valid: true,
      expiryDaysLeft: 7,
      activeGracePeriod: false,
      isTrial: false,
    };
  }

  clearCache(): void {
    try {
      this.cacheManager.del(this.cacheKey);
      this.logger.debug(
        `Cleared cache for application: ${this.config.applicationName}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to clear cache: ${Utils.formatErrorMessage(error)}`,
      );
    }
  }

  getConfig(): Readonly<Config> {
    return { ...this.config };
  }
}
