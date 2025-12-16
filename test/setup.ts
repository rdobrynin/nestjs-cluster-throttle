// Global test setup
import 'reflect-metadata';

// Setup global test timeout (15 seconds)
jest.setTimeout(15000);

// Mock console methods to reduce noise in tests (optional - uncomment to enable)
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});
