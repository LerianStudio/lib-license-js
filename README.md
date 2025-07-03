# Plugin License SDK

A lightweight TypeScript SDK + middleware to validate plugin licenses against the Lerian backend.

## Features

* Node-cache in-memory cache for fast look-ups
* Periodic background refresh (weekly)
* Express, Fastify, and Koa middleware → drop-in guard for any route
* Fetches license validity & enabled plugins from Gateway (AWS API Gateway)

## 🚀 How to Use

### 1. Set the needed environment variables:

In your environment configuration or `.env` file, set the following environment variables:

```dotenv
APPLICATION_NAME=your-application-name
LICENSE_KEY=your-plugin-license-key
MIDAZ_ORGANIZATION_ID=your-organization-id
```

### 2. Create a new instance of the middleware:

In your application configuration, set up the license client:

```typescript
import { createExpressMiddleware, LicenseClient } from '@lerian/lib-license-js';

interface Config {
    applicationName: string;
    licenseKey: string;
    organizationIds: string;
}

function initServers(): Service {
    const cfg: Config = {
        applicationName: process.env.APPLICATION_NAME!,
        licenseKey: process.env.LICENSE_KEY!,
        organizationIds: process.env.MIDAZ_ORGANIZATION_ID!,
    };
    
    const logger = {
        info: (msg: string) => console.log(`[INFO] ${msg}`),
        warn: (msg: string) => console.warn(`[WARN] ${msg}`),
        error: (msg: string) => console.error(`[ERROR] ${msg}`),
        debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
    };
    
    const licenseClient = new LicenseClient(
        cfg.applicationName,
        cfg.licenseKey,
        cfg.organizationIds,
        logger,
    );

    const httpApp = createRoutes(logger, licenseClient);

    const serverAPI = new Server(cfg, httpApp, logger);

    return {
        serverAPI,
        logger,
    };
}
```

### 3. Use the middleware in your Express application:

```typescript
import express from 'express';
import { createExpressMiddleware } from '@lerian/lib-license-js';

function createRoutes(logger: any, licenseClient: LicenseClient): express.Application {
    const app = express();
    
    app.use(createExpressMiddleware(
        process.env.APPLICATION_NAME!,
        process.env.LICENSE_KEY!,
        process.env.MIDAZ_ORGANIZATION_ID!,
        logger
    ));
    
    // Application routes
    app.get('/v1/applications', applicationHandler.getApplications);
    
    return app;
}
```

#### Add graceful shutdown support in your server using the `lib-commons` package function `startServerWithGracefulShutdown`

```typescript
import { startServerWithGracefulShutdown } from '@lerianstudio/lib-commons-js';

class Server {
    async run(launcher: any): Promise<void> {
        this.logger.info('Starting server with graceful shutdown support');

        await startServerWithGracefulShutdown(
            this.app,
            this.licenseClient,
            this.telemetry,
            this.getServerAddress(),
            this.logger,
        );
    }
}
```

## 📧 Contact

For questions or support, contact us at: [contato@lerian.studio](mailto:contato@lerian.studio).