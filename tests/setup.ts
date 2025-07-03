/**
 * Test setup file for lib-license-js
 * Sets up global mocks and test utilities
 */

// Mock node-cache
jest.mock('node-cache');

// Mock console methods to avoid noise in tests
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: { aborted: false },
  abort: jest.fn(),
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit() was called');
});

afterEach(() => {
  jest.clearAllMocks();
});

// Export test utilities
export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

export const createMockResponse = (data: any, status = 200, ok = true) => ({
  ok,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Map(),
});

export const createMockValidationResult = (valid = true) => ({
  valid,
  expiryDaysLeft: valid ? 30 : 0,
  activeGracePeriod: false,
  isTrial: false,
});

export { mockExit };