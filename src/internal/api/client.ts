import { Logger } from '../../types';
import { Config, ValidationResult } from '../../model/license';
import { ApiError } from '../../error/error';
import { HTTP_CONSTANTS } from '../../constant/http';

interface LicenseValidationRequest {
  licenseKey: string;
  fingerprint: string;
}

// Simple HTTP client implementation
class SimpleHttpClient {
  private timeout: number;

  constructor(timeout: number) {
    this.timeout = timeout;
  }

  async post(
    url: string,
    payload: any,
    headers: Record<string, string>,
  ): Promise<any> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
      );
    }

    return response.json();
  }
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateExponentialBackoff(
  attempt: number,
  baseDelay: number,
): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

export class ApiClient {
  private httpClient: SimpleHttpClient;
  private baseUrl: string;
  private logger: Logger;
  private retryCount: number;
  private retryDelay: number;

  constructor(
    logger: Logger,
    baseUrl: string = HTTP_CONSTANTS.BASE_URL,
    retryCount: number = HTTP_CONSTANTS.RETRY_COUNT,
    retryDelay: number = HTTP_CONSTANTS.RETRY_DELAY,
    timeout: number = HTTP_CONSTANTS.TIMEOUT,
  ) {
    this.httpClient = new SimpleHttpClient(timeout);
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
  }

  async validateLicense(config: Config): Promise<ValidationResult> {
    const url = `${this.baseUrl}/licenses/validate`;
    const payload: LicenseValidationRequest = {
      licenseKey: config.licenseKey,
      fingerprint: config.fingerprint,
    };

    const headers = {
      'x-api-key': config.organizationId,
    };

    return this.executeWithRetry(async () => {
      this.logger.debug(
        `Validating license for application: ${config.applicationName}`,
      );

      const response = await this.httpClient.post(url, payload, headers);

      this.logger.debug(
        `License validation response received for: ${config.applicationName}`,
      );

      return this.parseValidationResponse(response);
    });
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof ApiError) {
          if (!error.isRetryable || attempt === this.retryCount) {
            throw error;
          }
        } else if (
          !ApiError.isConnectionError(error as Error) ||
          attempt === this.retryCount
        ) {
          throw error;
        }

        const delay = calculateExponentialBackoff(attempt, this.retryDelay);
        this.logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`,
        );

        await sleep(delay);
      }
    }

    throw lastError || new Error('Maximum retry attempts exceeded');
  }

  private parseValidationResponse(response: any): ValidationResult {
    if (!response || typeof response !== 'object') {
      throw new ApiError('Invalid response format from license server', 500);
    }

    const result: ValidationResult = {
      valid: Boolean(response.valid),
      expiryDaysLeft: response.expiryDaysLeft,
      activeGracePeriod: Boolean(response.activeGracePeriod),
      isTrial: Boolean(response.isTrial),
    };

    this.validateResponseFields(result);

    return result;
  }

  private validateResponseFields(result: ValidationResult): void {
    if (typeof result.valid !== 'boolean') {
      throw new ApiError(
        'Invalid validation result: valid field must be boolean',
        500,
      );
    }

    if (
      result.expiryDaysLeft !== undefined &&
      typeof result.expiryDaysLeft !== 'number'
    ) {
      throw new ApiError(
        'Invalid validation result: expiryDaysLeft must be number',
        500,
      );
    }

    if (typeof result.activeGracePeriod !== 'boolean') {
      throw new ApiError(
        'Invalid validation result: activeGracePeriod must be boolean',
        500,
      );
    }

    if (typeof result.isTrial !== 'boolean') {
      throw new ApiError(
        'Invalid validation result: isTrial must be boolean',
        500,
      );
    }
  }
}
