import { RedisStore } from './redis.store';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisStore', () => {
    let store: RedisStore;
    let mockRedis: jest.Mocked<Redis>;
    const windowMs = 1000;
    const max = 100;
    const options = {
        max,
        windowMs,
        redisOptions: {
            host: 'localhost',
            port: 6379,
            keyPrefix: 'rate-limit:',
        },
    };

    beforeEach(() => {
        mockRedis = {
            script: jest.fn().mockResolvedValue('mock-sha'),
            evalsha: jest.fn(),
            eval: jest.fn(),
            ttl: jest.fn(),
            zremrangebyscore: jest.fn(),
            del: jest.fn(),
            keys: jest.fn(),
            quit: jest.fn(),
            on: jest.fn(),
        } as any;

        (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

        store = new RedisStore(options);
    });

    afterEach(async () => {
        await store.disconnect();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize Redis client with default options', () => {
            expect(Redis).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'localhost',
                    port: 6379,
                    keyPrefix: 'rate-limit:',
                    db: 0,
                    enableReadyCheck: true,
                }),
            );
        });

        it('should initialize Redis client with custom options', () => {
            const customOptions = {
                max: 50,
                windowMs: 2000,
                redisOptions: {
                    host: 'custom-host',
                    port: 6380,
                    password: 'secret',
                    db: 2,
                    keyPrefix: 'custom:',
                },
            };

            new RedisStore(customOptions);

            expect(Redis).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'custom-host',
                    port: 6380,
                    password: 'secret',
                    db: 2,
                    keyPrefix: 'custom:',
                }),
            );
        });

        it('should load Lua script on initialization', () => {
            expect(mockRedis.script).toHaveBeenCalledWith('LOAD', expect.any(String));
        });

        it('should setup event handlers', () => {
            expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
        });
    });

    describe('increment', () => {
        it('should increment counter using evalsha when script is loaded', async () => {
            mockRedis.evalsha.mockResolvedValue([0, 5]);
            mockRedis.ttl.mockResolvedValue(900);

            const result = await store.increment('test-key', windowMs);

            expect(mockRedis.evalsha).toHaveBeenCalledWith(
                'mock-sha',
                1,
                'test-key',
                windowMs.toString(),
                max.toString(),
                expect.any(String),
            );
            expect(result.count).toBe(5);
            expect(result.resetTime).toBeInstanceOf(Date);
        });

        it('should reload script on NOSCRIPT error', async () => {
            mockRedis.evalsha
                .mockRejectedValueOnce(new Error('NOSCRIPT No matching script'))
                .mockResolvedValueOnce([0, 2]);
            mockRedis.script.mockResolvedValue('new-sha');
            mockRedis.ttl.mockResolvedValue(700);

            const result = await store.increment('test-key', windowMs);

            expect(mockRedis.script).toHaveBeenCalledTimes(2); // Initial load + reload
            expect(result.count).toBe(2);
        });

        it('should handle blocked request', async () => {
            mockRedis.evalsha.mockResolvedValue([1, 100]);
            mockRedis.ttl.mockResolvedValue(600);

            const result = await store.increment('test-key', windowMs);

            expect(result.count).toBe(100);
        });

        it('should calculate correct reset time', async () => {
            const now = Date.now();
            const ttl = 500; // seconds
            mockRedis.evalsha.mockResolvedValue([0, 1]);
            mockRedis.ttl.mockResolvedValue(ttl);

            const result = await store.increment('test-key', windowMs);

            const expectedResetTime = now + ttl * 1000;
            expect(result.resetTime.getTime()).toBeGreaterThanOrEqual(expectedResetTime - 100);
            expect(result.resetTime.getTime()).toBeLessThanOrEqual(expectedResetTime + 100);
        });

        it('should handle negative TTL', async () => {
            mockRedis.evalsha.mockResolvedValue([0, 1]);
            mockRedis.ttl.mockResolvedValue(-1); // Key has no expiry

            const result = await store.increment('test-key', windowMs);

            expect(result.resetTime.getTime()).toBeGreaterThan(Date.now());
        });

        it('should throw error on Redis failure', async () => {
            mockRedis.evalsha.mockRejectedValue(new Error('Redis connection failed'));

            await expect(store.increment('test-key', windowMs)).rejects.toThrow(
                'Redis connection failed',
            );
        });
    });

    describe('decrement', () => {
        it('should remove specific timestamp from sorted set', async () => {
            await store.decrement('test-key');

            expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
                'test-key',
                expect.any(Number),
                expect.any(Number),
            );
        });

        it('should handle decrement errors gracefully', async () => {
            mockRedis.zremrangebyscore.mockRejectedValue(new Error('Redis error'));

            await expect(store.decrement('test-key')).rejects.toThrow('Redis error');
        });
    });

    describe('resetKey', () => {
        it('should delete specific key', async () => {
            await store.resetKey('test-key');

            expect(mockRedis.del).toHaveBeenCalledWith('test-key');
        });

        it('should handle non-existent key', async () => {
            mockRedis.del.mockResolvedValue(0);

            await expect(store.resetKey('non-existent')).resolves.not.toThrow();
        });
    });

    describe('resetAll', () => {
        it('should delete all keys with prefix', async () => {
            mockRedis.keys.mockResolvedValue([
                'rate-limit:key1',
                'rate-limit:key2',
                'rate-limit:key3',
            ]);

            await store.resetAll();

            expect(mockRedis.keys).toHaveBeenCalledWith('rate-limit:*');
            expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
        });

        it('should handle empty key list', async () => {
            mockRedis.keys.mockResolvedValue([]);

            await store.resetAll();

            expect(mockRedis.keys).toHaveBeenCalledWith('rate-limit:*');
            expect(mockRedis.del).not.toHaveBeenCalled();
        });

        it('should use custom prefix if provided', async () => {
            const customStore = new RedisStore({
                ...options,
                redisOptions: {
                    ...options.redisOptions,
                    keyPrefix: 'custom-prefix:',
                },
            });

            mockRedis.keys.mockResolvedValue(['custom-prefix:key1']);

            await customStore.resetAll();

            expect(mockRedis.keys).toHaveBeenCalledWith('custom-prefix:*');
        });
    });

    describe('disconnect', () => {
        it('should quit Redis connection', async () => {
            await store.disconnect();

            expect(mockRedis.quit).toHaveBeenCalled();
        });
    });

    describe('onModuleDestroy', () => {
        it('should disconnect on module destroy', async () => {
            await store.onModuleDestroy();

            expect(mockRedis.quit).toHaveBeenCalled();
        });
    });

    describe('Lua script', () => {
        it('should implement sliding window algorithm', async () => {
            const scriptCalls: any[] = [];
            mockRedis.evalsha.mockImplementation((...args) => {
                scriptCalls.push(args);
                return Promise.resolve([0, 1]);
            });
            mockRedis.ttl.mockResolvedValue(900);

            await store.increment('test-key', windowMs);

            expect(scriptCalls[0]).toEqual([
                'mock-sha',
                1,
                'test-key',
                windowMs.toString(),
                max.toString(),
                expect.any(String),
            ]);
        });
    });

    describe('error handling', () => {
        it('should log Redis connection errors', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const errorCallback = (mockRedis.on as jest.Mock).mock.calls.find(
                (call) => call[0] === 'error',
            )?.[1];

            errorCallback(new Error('Connection failed'));

            expect(consoleSpy).toHaveBeenCalledWith('Redis connection error:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        it('should log ready event', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const readyCallback = (mockRedis.on as jest.Mock).mock.calls.find(
                (call) => call[0] === 'ready',
            )?.[1];

            readyCallback();

            expect(consoleSpy).toHaveBeenCalledWith('Redis connection established');

            consoleSpy.mockRestore();
        });
    });
});
