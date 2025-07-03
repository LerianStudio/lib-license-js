import { Logger } from '../../types';
import { ValidationClient } from '../../validation/client';
import { Utils } from '../../util/env';
import { HTTP_CONSTANTS } from '../../constant/http';

export class BackgroundRefreshManager {
  private client: ValidationClient;
  private logger: Logger;
  private intervalId: NodeJS.Timeout | null = null;
  private refreshInterval: number;
  private isRunning: boolean = false;

  constructor(
    client: ValidationClient,
    logger: Logger,
    refreshInterval: number = HTTP_CONSTANTS.REFRESH_INTERVAL,
  ) {
    this.client = client;
    this.logger = logger;
    this.refreshInterval = refreshInterval;
  }

  start(): void {
    if (this.isRunning) {
      this.logger.warn('Background refresh is already running');
      return;
    }

    this.logger.info(
      `Starting background license refresh with interval: ${this.refreshInterval}ms`,
    );
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      await this.performRefresh();
    }, this.refreshInterval);

    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping background license refresh');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async performRefresh(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.debug('Performing background license refresh');
      await this.client.validate();
      this.logger.debug('Background license refresh completed successfully');
    } catch (error) {
      this.logger.error(
        `Background license refresh failed: ${Utils.formatErrorMessage(error)}`,
      );

      if (error instanceof Error && this.shouldTerminate(error)) {
        this.logger.error(
          'Critical license error during background refresh - terminating application',
        );
        this.stop();
        process.exit(1);
      }
    }
  }

  private shouldTerminate(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    return (
      errorMessage.includes('invalid license') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')
    );
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
