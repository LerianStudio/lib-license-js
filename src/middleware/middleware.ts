import { LicenseClient } from '../client';
import { Logger, MiddlewareFunction } from '../types';
import { Utils } from '../util/env';

export class LicenseMiddleware {
  private licenseClient: LicenseClient;
  private logger: Logger;

  constructor(licenseClient: LicenseClient, logger: Logger) {
    this.licenseClient = licenseClient;
    this.logger = logger;
  }

  express(): MiddlewareFunction {
    return async (req: any, res: any, next: any) => {
      try {
        const result = await this.licenseClient.validate();

        if (!result.valid) {
          this.logger.error('License validation failed - blocking request');
          return res.status(403).json({
            error: 'License validation failed',
            code: 'INVALID_LICENSE',
          });
        }

        this.logger.debug(
          'License validation passed - proceeding with request',
        );
        next();
      } catch (error) {
        const errorMessage = Utils.formatErrorMessage(error);
        this.logger.error(`License middleware error: ${errorMessage}`);

        return res.status(500).json({
          error: 'License validation error',
          code: 'LICENSE_ERROR',
        });
      }
    };
  }

  fastify(): MiddlewareFunction {
    return async (request: any, reply: any) => {
      try {
        const result = await this.licenseClient.validate();

        if (!result.valid) {
          this.logger.error('License validation failed - blocking request');
          return reply.status(403).send({
            error: 'License validation failed',
            code: 'INVALID_LICENSE',
          });
        }

        this.logger.debug(
          'License validation passed - proceeding with request',
        );
      } catch (error) {
        const errorMessage = Utils.formatErrorMessage(error);
        this.logger.error(`License middleware error: ${errorMessage}`);

        return reply.status(500).send({
          error: 'License validation error',
          code: 'LICENSE_ERROR',
        });
      }
    };
  }

  koa() {
    return async (ctx: any, next: any) => {
      try {
        const result = await this.licenseClient.validate();

        if (!result.valid) {
          this.logger.error('License validation failed - blocking request');
          ctx.status = 403;
          ctx.body = {
            error: 'License validation failed',
            code: 'INVALID_LICENSE',
          };
          return;
        }

        this.logger.debug(
          'License validation passed - proceeding with request',
        );
        await next();
      } catch (error) {
        const errorMessage = Utils.formatErrorMessage(error);
        this.logger.error(`License middleware error: ${errorMessage}`);

        ctx.status = 500;
        ctx.body = {
          error: 'License validation error',
          code: 'LICENSE_ERROR',
        };
      }
    };
  }
}

export function createLicenseMiddleware(
  appId: string,
  licenseKey: string,
  orgId: string,
  logger: Logger,
): LicenseMiddleware {
  const licenseClient = new LicenseClient(appId, licenseKey, orgId, logger);

  return new LicenseMiddleware(licenseClient, logger);
}

export function createExpressMiddleware(
  appId: string,
  licenseKey: string,
  orgId: string,
  logger: Logger,
): MiddlewareFunction {
  const middleware = createLicenseMiddleware(appId, licenseKey, orgId, logger);
  return middleware.express();
}

export function createFastifyMiddleware(
  appId: string,
  licenseKey: string,
  orgId: string,
  logger: Logger,
): MiddlewareFunction {
  const middleware = createLicenseMiddleware(appId, licenseKey, orgId, logger);
  return middleware.fastify();
}

export function createKoaMiddleware(
  appId: string,
  licenseKey: string,
  orgId: string,
  logger: Logger,
) {
  const middleware = createLicenseMiddleware(appId, licenseKey, orgId, logger);
  return middleware.koa();
}
