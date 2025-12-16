import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimit, RATE_LIMIT_METADATA } from './rate-limit.decorator';
import { SkipRateLimit, SKIP_RATE_LIMIT_METADATA } from './skip-rate-limit.decorator';

describe('Decorators', () => {
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
    });

    describe('@RateLimit', () => {
        it('should set rate limit metadata', () => {
            class TestController {
                @RateLimit({ windowMs: 60000, max: 100 })
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const metadata = reflector.get(RATE_LIMIT_METADATA, controller.testMethod);

            expect(metadata).toEqual({
                windowMs: 60000,
                max: 100,
            });
        });

        it('should set rate limit metadata with all options', () => {
            const options = {
                windowMs: 30000,
                max: 50,
                message: 'Custom message',
                statusCode: 503,
                skipSuccessfulRequests: true,
            };

            class TestController {
                @RateLimit(options)
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const metadata = reflector.get(RATE_LIMIT_METADATA, controller.testMethod);

            expect(metadata).toEqual(options);
        });

        it('should work with custom key generator', () => {
            const keyGenerator = (req: any) => req.user?.id;

            class TestController {
                @RateLimit({
                    windowMs: 60000,
                    max: 100,
                    keyGenerator,
                })
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const metadata = reflector.get(RATE_LIMIT_METADATA, controller.testMethod);

            expect(metadata.keyGenerator).toBe(keyGenerator);
        });

        it('should work with skip function', () => {
            const skip = (req: any) => req.user?.role === 'admin';

            class TestController {
                @RateLimit({
                    windowMs: 60000,
                    max: 100,
                    skip,
                })
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const metadata = reflector.get(RATE_LIMIT_METADATA, controller.testMethod);

            expect(metadata.skip).toBe(skip);
        });

        it('should work on controller class', () => {
            @RateLimit({ windowMs: 60000, max: 100 })
            class TestController {
                testMethod() {
                    return 'test';
                }
            }

            const metadata = reflector.get(RATE_LIMIT_METADATA, TestController);

            expect(metadata).toEqual({
                windowMs: 60000,
                max: 100,
            });
        });

        it('should work with multiple methods', () => {
            class TestController {
                @RateLimit({ windowMs: 30000, max: 50 })
                method1() {
                    return 'test1';
                }

                @RateLimit({ windowMs: 60000, max: 100 })
                method2() {
                    return 'test2';
                }
            }

            const controller = new TestController();
            const metadata1 = reflector.get(RATE_LIMIT_METADATA, controller.method1);
            const metadata2 = reflector.get(RATE_LIMIT_METADATA, controller.method2);

            expect(metadata1).toEqual({ windowMs: 30000, max: 50 });
            expect(metadata2).toEqual({ windowMs: 60000, max: 100 });
        });
    });

    describe('@SkipRateLimit', () => {
        it('should set skip rate limit metadata', () => {
            class TestController {
                @SkipRateLimit()
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const metadata = reflector.get(SKIP_RATE_LIMIT_METADATA, controller.testMethod);

            expect(metadata).toBe(true);
        });

        it('should work on controller class', () => {
            @SkipRateLimit()
            class TestController {
                testMethod() {
                    return 'test';
                }
            }

            const metadata = reflector.get(SKIP_RATE_LIMIT_METADATA, TestController);

            expect(metadata).toBe(true);
        });

        it('should work with multiple methods', () => {
            class TestController {
                @SkipRateLimit()
                skipped() {
                    return 'skipped';
                }

                notSkipped() {
                    return 'not skipped';
                }
            }

            const controller = new TestController();
            const metadata1 = reflector.get(SKIP_RATE_LIMIT_METADATA, controller.skipped);
            const metadata2 = reflector.get(SKIP_RATE_LIMIT_METADATA, controller.notSkipped);

            expect(metadata1).toBe(true);
            expect(metadata2).toBeUndefined();
        });

        it('should override RateLimit decorator', () => {
            class TestController {
                @RateLimit({ windowMs: 60000, max: 100 })
                @SkipRateLimit()
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const skipMetadata = reflector.get(SKIP_RATE_LIMIT_METADATA, controller.testMethod);
            const rateLimitMetadata = reflector.get(RATE_LIMIT_METADATA, controller.testMethod);

            expect(skipMetadata).toBe(true);
            expect(rateLimitMetadata).toBeDefined(); // Still exists but should be skipped
        });
    });

    describe('Decorator combinations', () => {
        it('should handle both decorators on same method', () => {
            class TestController {
                @RateLimit({ windowMs: 60000, max: 100 })
                @SkipRateLimit()
                testMethod() {
                    return 'test';
                }
            }

            const controller = new TestController();
            const skipMetadata = reflector.get(SKIP_RATE_LIMIT_METADATA, controller.testMethod);

            // SkipRateLimit should take precedence
            expect(skipMetadata).toBe(true);
        });

        it('should allow different rate limits on different methods', () => {
            class TestController {
                @RateLimit({ windowMs: 60000, max: 10 })
                slowMethod() {
                    return 'slow';
                }

                @RateLimit({ windowMs: 60000, max: 1000 })
                fastMethod() {
                    return 'fast';
                }

                @SkipRateLimit()
                skipMethod() {
                    return 'skip';
                }
            }

            const controller = new TestController();

            expect(reflector.get(RATE_LIMIT_METADATA, controller.slowMethod).max).toBe(10);
            expect(reflector.get(RATE_LIMIT_METADATA, controller.fastMethod).max).toBe(1000);
            expect(reflector.get(SKIP_RATE_LIMIT_METADATA, controller.skipMethod)).toBe(true);
        });

        it('should allow controller-level and method-level decorators', () => {
            @RateLimit({ windowMs: 60000, max: 100 })
            class TestController {
                defaultMethod() {
                    return 'default';
                }

                @RateLimit({ windowMs: 30000, max: 50 })
                overrideMethod() {
                    return 'override';
                }

                @SkipRateLimit()
                skipMethod() {
                    return 'skip';
                }
            }

            const controller = new TestController();
            const classMetadata = reflector.get(RATE_LIMIT_METADATA, TestController);
            const overrideMetadata = reflector.get(RATE_LIMIT_METADATA, controller.overrideMethod);
            const skipMetadata = reflector.get(SKIP_RATE_LIMIT_METADATA, controller.skipMethod);

            expect(classMetadata.max).toBe(100);
            expect(overrideMetadata.max).toBe(50);
            expect(skipMetadata).toBe(true);
        });
    });
});
