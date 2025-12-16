/**
 * Test helper utilities
 */

/**
 * Wait for a specified amount of time
 * @param ms - Milliseconds to wait
 */
export const wait = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Wait until a condition is true or timeout
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms
 * @param interval - Check interval in ms
 */
export const waitFor = async (
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100,
): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await wait(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Create a mock request object
 */
export const createMockRequest = (overrides: any = {}) => ({
    ip: '127.0.0.1',
    method: 'GET',
    url: '/test',
    connection: undefined,
    socket: undefined,
    info: undefined,
    user: undefined,
    ...overrides,
});

/**
 * Create a mock response object
 */
export const createMockResponse = () => ({
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
});

/**
 * Create a mock execution context
 */
export const createMockExecutionContext = (
    request: any = createMockRequest(),
    response: any = createMockResponse(),
) => {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
    } as any;
};

/**
 * Make multiple requests sequentially
 */
export const makeSequentialRequests = async (
    count: number,
    requestFn: () => Promise<any>,
): Promise<any[]> => {
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(await requestFn());
    }
    return results;
};

/**
 * Make multiple requests concurrently
 */
export const makeConcurrentRequests = async (
    count: number,
    requestFn: () => Promise<any>,
): Promise<any[]> => {
    const promises = Array.from({ length: count }, () => requestFn());
    return Promise.all(promises);
};

/**
 * Assert that a promise throws an error with specific message
 */
export const assertThrowsAsync = async (
    fn: () => Promise<any>,
    errorMessage?: string,
): Promise<void> => {
    let error: Error | undefined;
    try {
        await fn();
    } catch (e) {
        error = e as Error;
    }

    if (!error) {
        throw new Error('Expected function to throw an error, but it did not');
    }

    if (errorMessage && !error.message.includes(errorMessage)) {
        throw new Error(
            `Expected error message to include "${errorMessage}", but got "${error.message}"`,
        );
    }
};

/**
 * Get current timestamp in seconds (for rate limit reset headers)
 */
export const getCurrentTimestamp = (): number => {
    return Math.floor(Date.now() / 1000);
};

/**
 * Create a date in the future
 */
export const createFutureDate = (milliseconds: number): Date => {
    return new Date(Date.now() + milliseconds);
};

/**
 * Create a date in the past
 */
export const createPastDate = (milliseconds: number): Date => {
    return new Date(Date.now() - milliseconds);
};

/**
 * Mock rate limit result
 */
export const createMockRateLimitResult = (overrides: any = {}) => ({
    allowed: true,
    limit: 100,
    remaining: 95,
    resetTime: createFutureDate(60000),
    key: 'test-key',
    ...overrides,
});

/**
 * Advance time by specified milliseconds (for fake timers)
 */
export const advanceTime = async (ms: number): Promise<void> => {
    jest.advanceTimersByTime(ms);
    // Allow promises to resolve
    await Promise.resolve();
};

/**
 * Run function with fake timers
 */
export const withFakeTimers = async (fn: () => Promise<void>): Promise<void> => {
    jest.useFakeTimers();
    try {
        await fn();
    } finally {
        jest.useRealTimers();
    }
};

/**
 * Create a spy that counts calls
 */
export const createCallCounter = () => {
    let count = 0;
    const spy = jest.fn(() => {
        count++;
    });
    return { spy, getCount: () => count, reset: () => (count = 0) };
};

/**
 * Assert headers are set correctly
 */
export const assertRateLimitHeaders = (
    response: any,
    expected: {
        limit?: number;
        remaining?: number;
        reset?: number;
    },
) => {
    if (expected.limit !== undefined) {
        expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expected.limit);
    }
    if (expected.remaining !== undefined) {
        expect(response.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Remaining',
            expected.remaining,
        );
    }
    if (expected.reset !== undefined) {
        expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expected.reset);
    }
};
