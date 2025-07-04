import { createHash } from 'crypto';
import { ValidationResult } from '../model/license';
import { Logger } from '../types';
import { HTTP_CONSTANTS } from '../constant/http';

export class Utils {
  // License-specific utilities remain here
  static generateFingerprint(
    applicationName: string,
    licenseKey: string,
    organizationId: string,
  ): string {
    const combined = `${applicationName}:${licenseKey}:${organizationId}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  static logLicenseStatus(
    logger: Logger,
    result: ValidationResult,
    applicationName: string,
  ): void {
    if (!result.valid) {
      logger.error(`License validation failed for application: ${applicationName}`);
      return;
    }

    logger.info(`License validation successful for application: ${applicationName}`);

    if (result.isTrial) {
      logger.warn(`Application ${applicationName} is running on a trial license`);
    }

    if (result.activeGracePeriod) {
      logger.warn(
        `Application ${applicationName} is in grace period - license expired but still functional`,
      );
    }

    if (result.expiryDaysLeft !== undefined) {
      if (
        HTTP_CONSTANTS.EXPIRY_WARNING_DAYS.includes(
          result.expiryDaysLeft as 7 | 30,
        )
      ) {
        logger.warn(
          `License for ${applicationName} expires in ${result.expiryDaysLeft} days`,
        );
      } else if (result.expiryDaysLeft > 0) {
        logger.info(
          `License for ${applicationName} expires in ${result.expiryDaysLeft} days`,
        );
      }
    }
  }

  static validateConfig(
    applicationName: string,
    licenseKey: string,
    organizationId: string,
  ): void {
    if (!applicationName || typeof applicationName !== 'string') {
      throw new Error('Application ID must be a non-empty string');
    }
    if (!licenseKey || typeof licenseKey !== 'string') {
      throw new Error('License key must be a non-empty string');
    }
    if (!organizationId || typeof organizationId !== 'string') {
      throw new Error('Organization ID must be a non-empty string');
    }
  }

  static formatErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
