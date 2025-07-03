# Test Structure

This directory contains all tests for the lib-license-js library.

## Directory Structure

```
tests/
├── setup.ts              # Global test configuration and utilities
├── unit/                  # Unit tests for individual components
│   ├── constant-*.test.ts # Constants and configuration tests
│   ├── util-*.test.ts     # Utility function tests
│   ├── model-*.test.ts    # Type and model tests
│   ├── error-*.test.ts    # Error handling tests
│   └── cache-*.test.ts    # Cache manager tests
├── integration/           # Integration tests for complex workflows
│   ├── license-client.test.ts      # Main client functionality
│   ├── validation-client.test.ts   # Validation logic
│   └── middleware.test.ts          # Framework middleware
└── README.md             # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

## Test Categories

### Unit Tests
- **Constants**: Validate configuration constants and enums
- **Utilities**: Test utility functions in isolation
- **Models**: Validate TypeScript interfaces and types
- **Errors**: Test error handling and classification
- **Cache**: Test cache operations and TTL behavior

### Integration Tests
- **License Client**: End-to-end license client functionality
- **Validation Client**: License validation workflows with caching
- **Middleware**: Framework integration (Express, Fastify, Koa)

## Test Utilities

The `setup.ts` file provides:
- Mock factories for common objects (logger, validation results)
- Global mocks for external dependencies
- Jest configuration helpers
- Test environment setup

## Coverage Requirements

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Writing Tests

When adding new tests:
1. Place unit tests in `tests/unit/`
2. Place integration tests in `tests/integration/`
3. Use the helper functions from `setup.ts`
4. Follow the existing naming conventions
5. Ensure proper mocking of external dependencies