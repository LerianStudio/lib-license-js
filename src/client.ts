import { ValidationClient } from './validation/client';
import { BackgroundRefreshManager } from './internal/refresh/background';
import { ValidationResult } from './model/license';
import { ClientConfig } from './internal/config/config';
import { Logger, TerminationHandler } from './types';
import { Utils } from './util/env';

export class LicenseClient {
  private validationClient: ValidationClient;
  private refreshManager: BackgroundRefreshManager;
  private logger: Logger;
  private terminationHandler: TerminationHandler;
  private isInitialized: boolean = false;

  constructor(
    applicationName: string,
    licenseKey: string,
    organizationId: string,
    logger: Logger,
    options: Partial<ClientConfig> = {},
  ) {
    this.logger = logger;
    this.validationClient = new ValidationClient(
      applicationName,
      licenseKey,
      organizationId,
      logger,
      options,
    );
    this.refreshManager = new BackgroundRefreshManager(
      this.validationClient,
      logger,
      options.refreshInterval,
    );

    this.terminationHandler = this.createDefaultTerminationHandler();
    this.logger.info(`License client created for application: ${applicationName}`);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('License client is already initialized');
      return;
    }

    try {
      this.logger.info('Initializing license client...');

      const result = await this.validationClient.validate();

      if (!result.valid) {
        const errorMessage = `Initial license validation failed for application`;
        this.logger.error(errorMessage);
        await this.terminationHandler(errorMessage);
        return;
      }

      this.refreshManager.start();
      this.isInitialized = true;

      this.logger.info('License client initialized successfully');
    } catch (error) {
      const errorMessage = `Failed to initialize license client: ${Utils.formatErrorMessage(error)}`;
      this.logger.error(errorMessage);
      await this.terminationHandler(errorMessage);
    }
  }

  async validate(): Promise<ValidationResult> {
    if (!this.isInitialized) {
      throw new Error(
        'License client not initialized. Call initialize() first.',
      );
    }

    try {
      const result = await this.validationClient.validate();

      if (!result.valid) {
        const errorMessage = 'License validation failed';
        this.logger.error(errorMessage);
        await this.terminationHandler(errorMessage);
      }

      return result;
    } catch (error) {
      const errorMessage = `License validation error: ${Utils.formatErrorMessage(error)}`;
      this.logger.error(errorMessage);
      await this.terminationHandler(errorMessage);
      throw error;
    }
  }

  setTerminationHandler(handler: TerminationHandler): void {
    this.terminationHandler = handler;
    this.logger.debug('Custom termination handler set');
  }

  shutdown(): void {
    this.logger.info('Shutting down license client...');

    this.refreshManager.stop();
    this.isInitialized = false;

    this.logger.info('License client shutdown completed');
  }

  private createDefaultTerminationHandler(): TerminationHandler {
    return (reason: string) => {
      this.logger.error(`Application termination requested: ${reason}`);

      setTimeout(() => {
        this.logger.error('Terminating application due to license failure');
        process.exit(1);
      }, 1000);
    };
  }

  getValidationClient(): ValidationClient {
    return this.validationClient;
  }

  isRefreshActive(): boolean {
    return this.refreshManager.isActive();
  }

  clearCache(): void {
    this.validationClient.clearCache();
  }
}
