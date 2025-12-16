import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from '../rate-limit.service';
import {
    createMockRequest,
    createMockResponse,
    createMockExecutionContext,
    createMockRateLimitResult,
    assertRateLimitHeaders,
} from '../../test/helpers';

describe('RateLimitGuard', () => {
    let guard: RateLimitGuard;
    let reflector: Reflector;
    let rateLimitService: jest.Mocked<RateLimitService>;

    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();

    const mockRateLimitService = {
        checkRateLimit: jest.fn(),
    } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RateLimitGuard,
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                    },
                },
                {
                    provide: RateLimitService,
                    useValue: mockRateLimitService,
                },
            ],
        }).compile();

        guard = module.get<RateLimitGuard>(RateLimitGuard);
        reflector = module.get<Reflector>(Reflector);
        rateLimitService = module.get(RateLimitService);

        // Reset mocks
        mockResponse.setHeader.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canActivate', () => {
        it('should allow request when within rate limit', async () => {
            const context = createMockExecutionContext(mockRequest, mockResponse);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            rateLimitService.checkRateLimit.mockResolvedValue(
                createMockRateLimitResult({
                    allowed: true,
                    limit: 100,
                    remaining: 95,
                }),
            );

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            assertRateLimitHeaders(mockResponse, {
                limit: 100,
                remaining: 95,
            });
        });

        it('should block request when rate limit exceeded', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: false,
                limit: 100,
                remaining: 0,
                resetTime: new Date(Date.now() + 60000),
                key: 'test-key',
            });

            await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
            await expect(guard.canActivate(context)).rejects.toThrow('Too Many Requests');

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
        });

        it('should skip rate limiting when SkipRateLimit decorator is used', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(true) // SKIP_RATE_LIMIT_METADATA
                .mockReturnValueOnce(undefined); // RATE_LIMIT_METADATA

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
        });

        it('should use custom options from RateLimit decorator', async () => {
            const context = createMockExecutionContext();
            const customOptions = {
                windowMs: 30000,
                max: 50,
                message: 'Custom message',
                statusCode: 503,
            };

            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(undefined) // SKIP_RATE_LIMIT_METADATA
                .mockReturnValueOnce(customOptions); // RATE_LIMIT_METADATA

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: true,
                limit: 50,
                remaining: 45,
                resetTime: new Date(Date.now() + 30000),
                key: 'test-key',
            });

            await guard.canActivate(context);

            expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
                mockRequest,
                customOptions,
            );
        });

        it('should throw custom error message when provided', async () => {
            const context = createMockExecutionContext();
            const customOptions = {
                windowMs: 60000,
                max: 100,
                message: 'Custom rate limit message',
            };

            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(customOptions);

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: false,
                limit: 100,
                remaining: 0,
                resetTime: new Date(Date.now() + 60000),
                key: 'test-key',
            });

            try {
                await guard.canActivate(context);
                fail('Should have thrown an exception');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpException);
                expect((error as HttpException).message).toBe('Custom rate limit message');
            }
        });

        it('should throw custom status code when provided', async () => {
            const context = createMockExecutionContext();
            const customOptions = {
                windowMs: 60000,
                max: 100,
                statusCode: 503,
            };

            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(customOptions);

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: false,
                limit: 100,
                remaining: 0,
                resetTime: new Date(Date.now() + 60000),
                key: 'test-key',
            });

            try {
                await guard.canActivate(context);
                fail('Should have thrown an exception');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpException);
                expect((error as HttpException).getStatus()).toBe(503);
            }
        });

        it('should use default status code 429 when not provided', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(undefined);

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: false,
                limit: 100,
                remaining: 0,
                resetTime: new Date(Date.now() + 60000),
                key: 'test-key',
            });

            try {
                await guard.canActivate(context);
                fail('Should have thrown an exception');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpException);
                expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
            }
        });

        it('should set correct X-RateLimit-Reset header', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            const resetTime = new Date(Date.now() + 60000);
            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: true,
                limit: 100,
                remaining: 95,
                resetTime,
                key: 'test-key',
            });

            await guard.canActivate(context);

            const expectedResetTimestamp = Math.ceil(resetTime.getTime() / 1000);
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Reset',
                expectedResetTimestamp,
            );
        });

        it('should handle storage errors with fail-open strategy', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            rateLimitService.checkRateLimit.mockRejectedValue(new Error('Storage error'));

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should rethrow HttpException errors', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(undefined);

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: false,
                limit: 100,
                remaining: 0,
                resetTime: new Date(Date.now() + 60000),
                key: 'test-key',
            });

            await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
        });

        it('should handle metadata from both handler and class', async () => {
            const context = createMockExecutionContext();
            const handlerOptions = { max: 50 };

            jest.spyOn(reflector, 'getAllAndOverride')
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(handlerOptions);

            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: true,
                limit: 50,
                remaining: 45,
                resetTime: new Date(Date.now() + 60000),
                key: 'test-key',
            });

            await guard.canActivate(context);

            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([expect.any(Function), expect.any(Function)]),
            );
        });
    });

    describe('error scenarios', () => {
        it('should handle missing request gracefully', async () => {
            const context = {
                switchToHttp: () => ({
                    getRequest: () => null,
                    getResponse: () => mockResponse,
                }),
                getHandler: jest.fn(),
                getClass: jest.fn(),
            } as any;

            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            await expect(guard.canActivate(context)).rejects.toThrow();
        });

        it('should handle missing response gracefully', async () => {
            const context = {
                switchToHttp: () => ({
                    getRequest: () => mockRequest,
                    getResponse: () => null,
                }),
                getHandler: jest.fn(),
                getClass: jest.fn(),
            } as any;

            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            await expect(guard.canActivate(context)).rejects.toThrow();
        });
    });

    describe('headers', () => {
        it('should set all rate limit headers on successful request', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            const resetTime = new Date(Date.now() + 60000);
            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: true,
                limit: 100,
                remaining: 95,
                resetTime,
                key: 'test-key',
            });

            await guard.canActivate(context);

            expect(mockResponse.setHeader).toHaveBeenCalledTimes(3);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 95);
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Reset',
                expect.any(Number),
            );
        });

        it('should set all rate limit headers when limit exceeded', async () => {
            const context = createMockExecutionContext();
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

            const resetTime = new Date(Date.now() + 60000);
            rateLimitService.checkRateLimit.mockResolvedValue({
                allowed: false,
                limit: 100,
                remaining: 0,
                resetTime,
                key: 'test-key',
            });

            try {
                await guard.canActivate(context);
            } catch (error) {
                // Expected to throw
            }

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Reset',
                expect.any(Number),
            );
        });
    });
})
