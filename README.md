# Plugin License SDK

A lightweight TypeScript SDK + middleware to validate plugin licenses against the Lerian backend.

## Features

* In-memory cache with TTL support for fast lookups
* Periodic background refresh (weekly)
* Express, Fastify, and Koa middleware → drop-in guard for any route
* Fetches license validity & enabled plugins from Gateway (AWS API Gateway)
* Comprehensive error handling with fallback strategies
* TypeScript support with full type definitions
* Retry logic with exponential backoff
* Graceful degradation for network issues

## 🚀 How to Use

### 1. Installation

```bash
npm install @lerian/lib-license-js
```

### 2. Set the needed environment variables

In your environment configuration or `.env` file, set the following environment variables:

```dotenv
APPLICATION_NAME=your-application-name
LICENSE_KEY=your-plugin-license-key
MIDAZ_ORGANIZATION_ID=your-organization-id
```

### 3. Express.js Usage

```typescript
import express from 'express';
import { createExpressMiddleware } from '@lerian/lib-license-js';

const app = express();

// Create logger (you can use any logger that implements the Logger interface)
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

// Apply license middleware
const licenseMiddleware = createExpressMiddleware(
  process.env.APPLICATION_NAME!,
  process.env.LICENSE_KEY!,
  process.env.MIDAZ_ORGANIZATION_ID!,
  logger
);

app.use(licenseMiddleware);

// Your application routes
app.get('/api/data', (req, res) => {
  res.json({ message: 'Protected endpoint accessed successfully' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 4. Fastify Usage

```typescript
import Fastify from 'fastify';
import { createFastifyMiddleware } from '@lerian/lib-license-js';

const fastify = Fastify({ logger: true });

const licenseMiddleware = createFastifyMiddleware(
  process.env.APPLICATION_NAME!,
  process.env.LICENSE_KEY!,
  process.env.MIDAZ_ORGANIZATION_ID!,
  fastify.log
);

// Apply middleware to all routes
fastify.addHook('preHandler', licenseMiddleware);

// Your application routes
fastify.get('/api/data', async (request, reply) => {
  return { message: 'Protected endpoint accessed successfully' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
```

### 5. Koa Usage

```typescript
import Koa from 'koa';
import { createKoaMiddleware } from '@lerian/lib-license-js';

const app = new Koa();

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

const licenseMiddleware = createKoaMiddleware(
  process.env.APPLICATION_NAME!,
  process.env.LICENSE_KEY!,
  process.env.MIDAZ_ORGANIZATION_ID!,
  logger
);

app.use(licenseMiddleware);

// Your application routes
app.use(async (ctx) => {
  ctx.body = { message: 'Protected endpoint accessed successfully' };
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 6. Advanced Usage with LicenseClient

```typescript
import { LicenseClient } from '@lerian/lib-license-js';

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

const client = new LicenseClient(
  'my-app',
  'license-key-here',
  'org-id-here',
  logger,
  {
    baseUrl: 'https://license.dev.midaz.io',
    timeout: 5000,
    refreshInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
    cacheTtl: 24 * 60 * 60, // 24 hours
    retryCount: 3,
    retryDelay: 5000,
  }
);

// Initialize the client
await client.initialize();

// Manual validation
try {
  const result = await client.validate();
  console.log('License valid:', result.valid);
  console.log('Days until expiry:', result.expiryDaysLeft);
  console.log('Is trial:', result.isTrial);
  console.log('Grace period active:', result.activeGracePeriod);
} catch (error) {
  console.error('Validation failed:', error);
}

// Graceful shutdown
process.on('SIGINT', () => {
  client.shutdown();
  process.exit(0);
});
```

### 7. Custom Termination Handler

```typescript
import { LicenseClient } from '@lerian/lib-license-js';

const client = new LicenseClient('app', 'key', 'org', logger);

// Set custom termination behavior
client.setTerminationHandler(async (reason: string) => {
  console.error(`License validation failed: ${reason}`);
  
  // Perform cleanup operations
  await cleanup();
  
  // Custom exit strategy
  process.exit(1);
});

await client.initialize();
```

## 🧪 Testing

The library includes comprehensive test coverage. Run tests with:

```bash
npm test
```

For coverage reports:

```bash
npm run test:cov
```

## 🏗️ Architecture

The library is built with a modular architecture:

- **LicenseClient**: Main entry point for license operations
- **ValidationClient**: Core validation logic with caching
- **ApiClient**: HTTP communication with retry logic
- **CacheManager**: In-memory caching with TTL support
- **RefreshManager**: Background refresh scheduling
- **Middleware**: Framework-specific middleware adapters

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | `https://license.dev.midaz.io` | License server base URL |
| `timeout` | number | `5000` | HTTP request timeout (ms) |
| `refreshInterval` | number | `604800000` | Background refresh interval (ms) |
| `cacheTtl` | number | `86400` | Cache TTL (seconds) |
| `retryCount` | number | `3` | Maximum retry attempts |
| `retryDelay` | number | `5000` | Initial retry delay (ms) |

## 🚨 Error Handling

The library implements sophisticated error handling:

- **Server Errors (5xx)**: Use cached result or fallback to temporary valid license
- **Client Errors (4xx)**: Return invalid license (may trigger application termination)
- **Connection Errors**: Use cached result or fallback to temporary valid license
- **Timeouts**: Treated as connection errors with fallback behavior

## 📊 License States

The library handles various license states:

- **Valid License**: Normal operation with expiry warnings
- **Trial License**: Special logging and expiry handling
- **Grace Period**: Extended operation with critical warnings
- **Expired/Invalid**: Controlled application termination

## 🔒 Security Features

- **Fingerprint Generation**: SHA256-based unique identification
- **Request Signing**: Organization ID as API key header
- **Secure Caching**: Time-limited cache entries
- **Rate Limiting**: Built-in retry logic with exponential backoff

## 📝 Logging

The library provides comprehensive logging at various levels:

- **Info**: License validation success, expiry notifications
- **Warn**: Trial license usage, grace period activation, expiry warnings
- **Error**: Validation failures, server errors, termination events
- **Debug**: Cache operations, API requests, internal state changes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

For questions or support, contact us at: [contato@lerian.studio](mailto:contato@lerian.studio).

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.