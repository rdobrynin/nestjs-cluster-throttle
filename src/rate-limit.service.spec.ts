import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RateLimitStore } from './stores/store.interface';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';

describe('RateLimitService', () => {
    let service: RateLimitService;
    let mockStore: jest.Mocked<RateLimitStore>;

    const createMockStore = (): jest.Mocked<RateLimitStore> => ({
        increment: jest.fn(),
        decrement: jest.fn(),
        resetKey: jest.fn(),
        resetAll: jest.fn(),
    });

    beforeEach(async () => {
        mockStore = createMockStore();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RateLimitService,
                {
                    provide: 'RATE_LIMIT_STORE',
                    useValue: mockStore,
                },
                {
                    provide: 'RATE_LIMIT_OPTIONS',
                    useValue: {
                        windowMs: 60000,
                        max: 10,
                    },
                },
            ],
        }).compile();

        service = module.get<RateLimitService>(RateLimitService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkRateLimit', () => {
        const mockRequest = {
            ip: '192.168.1.1',
            method: 'GET',
            url: '/api/test',
        };

        it('should allow request within limit', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 5,
                resetTime,
            });

            const result = await service.checkRateLimit(mockRequest);

            expect(result.allowed).toBe(true);
            expect(result.limit).toBe(10);
            expect(result.remaining).toBe(5);
            expect(result.resetTime).toBe(resetTime);
            expect(mockStore.increment).toHaveBeenCalled();
        });

        it('should block request exceeding limit', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 11,
                resetTime,
            });

            const result = await service.checkRateLimit(mockRequest);

            expect(result.allowed).toBe(false);
            expect(result.limit).toBe(10);
            expect(result.remaining).toBe(0);
        });

        it('should handle request exactly at limit', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 10,
                resetTime,
            });

            const result = await service.checkRateLimit(mockRequest);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(0);
        });

        it('should merge options with defaults', async () => {
            const resetTime = new Date(Date.now() + 30000);
            mockStore.increment.mockResolvedValue({
                count: 3,
                resetTime,
            });

            const customOptions: Partial<RateLimitOptions> = {
                max: 5,
                windowMs: 30000,
            };

            const result = await service.checkRateLimit(mockRequest, customOptions);

            expect(result.limit).toBe(5);
            expect(mockStore.increment).toHaveBeenCalledWith(expect.any(String), 30000);
        });

        it('should use custom key generator', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const customOptions: Partial<RateLimitOptions> = {
                keyGenerator: (req) => `custom:${req.user?.id || 'anonymous'}`,
            };

            const requestWithUser = {
                ...mockRequest,
                user: { id: 'user-123' },
            };

            await service.checkRateLimit(requestWithUser, customOptions);

            expect(mockStore.increment).toHaveBeenCalledWith('custom:user-123', expect.any(Number));
        });

        it('should skip rate limiting when skip function returns true', async () => {
            const customOptions: Partial<RateLimitOptions> = {
                skip: (req) => req.user?.role === 'admin',
            };

            const adminRequest = {
                ...mockRequest,
                user: { role: 'admin' },
            };

            const result = await service.checkRateLimit(adminRequest, customOptions);

            expect(result.allowed).toBe(true);
            expect(mockStore.increment).not.toHaveBeenCalled();
        });

        it('should not skip when skip function returns false', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const customOptions: Partial<RateLimitOptions> = {
                skip: (req) => req.user?.role === 'admin',
            };

            const regularRequest = {
                ...mockRequest,
                user: { role: 'user' },
            };

            await service.checkRateLimit(regularRequest, customOptions);

            expect(mockStore.increment).toHaveBeenCalled();
        });

        it('should return key in result', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const result = await service.checkRateLimit(mockRequest);

            expect(result.key).toBeDefined();
            expect(result.key).toContain('192.168.1.1');
            expect(result.key).toContain('GET');
        });
    });

    describe('generateKey', () => {
        it('should generate key with IP, method, and path', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                ip: '10.0.0.1',
                method: 'POST',
                url: '/api/users',
            };

            await service.checkRateLimit(request);

            expect(mockStore.increment).toHaveBeenCalledWith(
                '10.0.0.1:POST:/api/users',
                expect.any(Number),
            );
        });

        it('should handle request with route path', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                ip: '10.0.0.1',
                method: 'GET',
                route: { path: '/api/users/:id' },
                url: '/api/users/123',
            };

            await service.checkRateLimit(request);

            expect(mockStore.increment).toHaveBeenCalledWith(
                '10.0.0.1:GET:/api/users/:id',
                expect.any(Number),
            );
        });

        it('should handle missing IP with connection.remoteAddress', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                connection: { remoteAddress: '10.0.0.2' },
                method: 'GET',
                url: '/test',
            };

            await service.checkRateLimit(request);

            expect(mockStore.increment).toHaveBeenCalledWith(
                '10.0.0.2:GET:/test',
                expect.any(Number),
            );
        });

        it('should handle missing IP with socket.remoteAddress', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                socket: { remoteAddress: '10.0.0.3' },
                method: 'POST',
                url: '/test',
            };

            await service.checkRateLimit(request);

            expect(mockStore.increment).toHaveBeenCalledWith(
                '10.0.0.3:POST:/test',
                expect.any(Number),
            );
        });

        it('should use "unknown" when IP cannot be determined', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                method: 'GET',
                url: '/test',
            };

            await service.checkRateLimit(request);

            expect(mockStore.increment).toHaveBeenCalledWith(
                'unknown:GET:/test',
                expect.any(Number),
            );
        });

        it('should handle info.remoteAddress for Hapi framework', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                info: { remoteAddress: '10.0.0.4' },
                method: 'GET',
                url: '/test',
            };

            await service.checkRateLimit(request);

            expect(mockStore.increment).toHaveBeenCalledWith(
                '10.0.0.4:GET:/test',
                expect.any(Number),
            );
        });
    });

    describe('resetKey', () => {
        it('should reset specific key', async () => {
            await service.resetKey('test-key');

            expect(mockStore.resetKey).toHaveBeenCalledWith('test-key');
        });

        it('should handle reset errors', async () => {
            mockStore.resetKey.mockRejectedValue(new Error('Reset failed'));

            await expect(service.resetKey('test-key')).rejects.toThrow('Reset failed');
        });
    });

    describe('resetAll', () => {
        it('should reset all keys', async () => {
            await service.resetAll();

            expect(mockStore.resetAll).toHaveBeenCalled();
        });

        it('should handle reset all errors', async () => {
            mockStore.resetAll.mockRejectedValue(new Error('Reset all failed'));

            await expect(service.resetAll()).rejects.toThrow('Reset all failed');
        });
    });

    describe('default options', () => {
        it('should use default options when not provided', async () => {
            const resetTime = new Date(Date.now() + 900000);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            const request = {
                ip: '127.0.0.1',
                method: 'GET',
                url: '/test',
            };

            const result = await service.checkRateLimit(request);

            expect(result.limit).toBe(10); // From module options
            expect(mockStore.increment).toHaveBeenCalledWith(expect.any(String), 60000);
        });
    });

    describe('concurrent requests', () => {
        it('should handle multiple concurrent requests', async () => {
            const resetTime = new Date(Date.now() + 60000);
            let count = 0;
            mockStore.increment.mockImplementation(async () => {
                count++;
                return { count, resetTime };
            });

            const request = {
                ip: '192.168.1.1',
                method: 'GET',
                url: '/test',
            };

            const promises = Array.from({ length: 5 }, () => service.checkRateLimit(request));

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(mockStore.increment).toHaveBeenCalledTimes(5);
        });
    });

    describe('edge cases', () => {
        it('should handle zero remaining correctly', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 10,
                resetTime,
            });

            const result = await service.checkRateLimit(
                { ip: '1.1.1.1', method: 'GET', url: '/test' },
                { max: 10 },
            );

            expect(result.remaining).toBe(0);
            expect(result.allowed).toBe(true);
        });

        it('should not have negative remaining', async () => {
            const resetTime = new Date(Date.now() + 60000);
            mockStore.increment.mockResolvedValue({
                count: 15,
                resetTime,
            });

            const result = await service.checkRateLimit(
                { ip: '1.1.1.1', method: 'GET', url: '/test' },
                { max: 10 },
            );

            expect(result.remaining).toBe(0);
            expect(result.remaining).toBeGreaterThanOrEqual(0);
        });

        it('should handle very large windowMs', async () => {
            const largeWindow = 86400000; // 24 hours
            const resetTime = new Date(Date.now() + largeWindow);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            await service.checkRateLimit(
                { ip: '1.1.1.1', method: 'GET', url: '/test' },
                { windowMs: largeWindow },
            );

            expect(mockStore.increment).toHaveBeenCalledWith(expect.any(String), largeWindow);
        });

        it('should handle small windowMs', async () => {
            const smallWindow = 1000; // 1 second
            const resetTime = new Date(Date.now() + smallWindow);
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetTime,
            });

            await service.checkRateLimit(
                { ip: '1.1.1.1', method: 'GET', url: '/test' },
                { windowMs: smallWindow },
            );

            expect(mockStore.increment).toHaveBeenCalledWith(expect.any(String), smallWindow);
        });
    });
});
