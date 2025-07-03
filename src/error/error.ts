const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_LICENSE: 'INVALID_LICENSE',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || ERROR_CODES.VALIDATION_FAILED;
    this.isRetryable = this.determineRetryability(statusCode);
  }

  private determineRetryability(statusCode: number): boolean {
    return statusCode >= 500 || statusCode === 408 || statusCode === 429;
  }

  static isServerError(statusCode: number): boolean {
    return statusCode >= 500;
  }

  static isClientError(statusCode: number): boolean {
    return statusCode >= 400 && statusCode < 500;
  }

  static isConnectionError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('etimedout')
    );
  }
}
