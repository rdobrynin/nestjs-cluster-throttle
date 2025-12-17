import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import { RateLimitModule, RateLimit, SkipRateLimit } from '../src';
const request = require('supertest');

@Controller('test')
class TestController {
    // @ts-ignore
    @Get('limited')
    @RateLimit({
        windowMs: 1000,
        max: 3,
        message: 'Too many requests',
    })
    limitedEndpoint() {
        return { message: 'Success' };
    }

    // @ts-ignore
    @Get('skip')
    @SkipRateLimit()
    skippedEndpoint() {
        return { message: 'Not rate limited' };
    }

    // @ts-ignore
    @Get('global')
    globalEndpoint() {
        return { message: 'Uses global limits' };
    }

    // @ts-ignore
    @Get('custom-message')
    @RateLimit({
        windowMs: 1000,
        max: 2,
        message: 'Custom error message',
        statusCode: 503,
    })
    customMessageEndpoint() {
        return { message: 'Success' };
    }
}

describe('RateLimitModule (e2e)', () => {
    let app: INestApplication;

    describe('Memory Store', () => {
        beforeEach(async () => {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRoot({
                        windowMs: 5000,
                        max: 10,
                    }),
                ],
                controllers: [TestController],
            }).compile();

            app = moduleFixture.createNestApplication();
            await app.init();
        });

        afterEach(async () => {
            await app.close();
        });

        it('should allow requests within limit', async () => {
            const response = await request(app.getHttpServer()).get('/test/limited');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Success' });
            expect(response.headers['x-ratelimit-limit']).toBe('3');
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();
        });

        it('should block requests exceeding limit', async () => {
            await request(app.getHttpServer()).get('/test/limited');
            await request(app.getHttpServer()).get('/test/limited');
            await request(app.getHttpServer()).get('/test/limited');

            const response = await request(app.getHttpServer()).get('/test/limited');

            expect(response.status).toBe(429);
            expect(response.body.message).toBe('Too many requests');
            expect(response.headers['x-ratelimit-remaining']).toBe('0');
        });

        it('should reset limit after window expires', async () => {
            await request(app.getHttpServer()).get('/test/limited');
            await request(app.getHttpServer()).get('/test/limited');
            await request(app.getHttpServer()).get('/test/limited');

            await new Promise((resolve) => setTimeout(resolve, 1100));

            const response = await request(app.getHttpServer()).get('/test/limited');
            expect(response.status).toBe(200);
        });

        it('should skip rate limiting with SkipRateLimit decorator', async () => {
            for (let i = 0; i < 20; i++) {
                const response = await request(app.getHttpServer()).get('/test/skip');
                expect(response.status).toBe(200);
                expect(response.headers['x-ratelimit-limit']).toBeUndefined();
            }
        });

        it('should use global limits for routes without decorator', async () => {
            const response = await request(app.getHttpServer()).get('/test/global');

            expect(response.status).toBe(200);
            expect(response.headers['x-ratelimit-limit']).toBe('10');
        });

        it('should return custom error message and status code', async () => {
            await request(app.getHttpServer()).get('/test/custom-message');
            await request(app.getHttpServer()).get('/test/custom-message');

            const response = await request(app.getHttpServer()).get('/test/custom-message');

            expect(response.status).toBe(503);
            expect(response.body.message).toBe('Custom error message');
        });

        it('should decrement remaining count correctly', async () => {
            const res1 = await request(app.getHttpServer()).get('/test/limited');
            const res2 = await request(app.getHttpServer()).get('/test/limited');
            const res3 = await request(app.getHttpServer()).get('/test/limited');

            expect(res1.headers['x-ratelimit-remaining']).toBe('2');
            expect(res2.headers['x-ratelimit-remaining']).toBe('1');
            expect(res3.headers['x-ratelimit-remaining']).toBe('0');
        });

        //@todo fix config

        // it('should handle concurrent requests', async () => {
        //     const promises = Array.from({ length: 5 }, () =>
        //         request(app.getHttpServer()).get('/test/limited'),
        //     );
        //
        //     const responses = await Promise.all(promises);
        //
        //     const successCount = responses.filter((r) => r.status === 200).length;
        //     const blockedCount = responses.filter((r) => r.status === 429).length;
        //
        //     expect(successCount).toBe(3);
        //     expect(blockedCount).toBe(2);
        // });

        it('should track different routes independently', async () => {
            await request(app.getHttpServer()).get('/test/limited');
            await request(app.getHttpServer()).get('/test/limited');
            await request(app.getHttpServer()).get('/test/limited');

            const response = await request(app.getHttpServer()).get('/test/global');
            expect(response.status).toBe(200);
        });

        it('should include reset timestamp in headers', async () => {
            const response = await request(app.getHttpServer()).get('/test/limited');

            const resetTimestamp = parseInt(response.headers['x-ratelimit-reset'], 10);
            const now = Math.floor(Date.now() / 1000);

            expect(resetTimestamp).toBeGreaterThan(now);
            expect(resetTimestamp).toBeLessThan(now + 10); // Within 10 seconds
        });
    });

    describe('Async Configuration', () => {
        beforeEach(async () => {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRootAsync({
                        useFactory: async () => {
                            await new Promise((resolve) => setTimeout(resolve, 10));
                            return {
                                windowMs: 5000,
                                max: 5,
                            };
                        },
                    }),
                ],
                controllers: [TestController],
            }).compile();

            app = moduleFixture.createNestApplication();
            await app.init();
        });

        afterEach(async () => {
            await app.close();
        });

        it('should work with async configuration', async () => {
            const response = await request(app.getHttpServer()).get('/test/global');

            expect(response.status).toBe(200);
            expect(response.headers['x-ratelimit-limit']).toBe('5');
        });

        it('should apply limits from async configuration', async () => {
            for (let i = 0; i < 5; i++) {
                await request(app.getHttpServer()).get('/test/global');
            }

            const response = await request(app.getHttpServer()).get('/test/global');
            expect(response.status).toBe(429);
        });
    });
    //@todo fix config
    // describe('Different IP Addresses', () => {
    //     beforeEach(async () => {
    //         const moduleFixture: TestingModule = await Test.createTestingModule({
    //             imports: [
    //                 RateLimitModule.forRoot({
    //                     windowMs: 5000,
    //                     max: 2,
    //                 }),
    //             ],
    //             controllers: [TestController],
    //         }).compile();
    //
    //         app = moduleFixture.createNestApplication();
    //         await app.init();
    //     });
    //
    //     afterEach(async () => {
    //         await app.close();
    //     });
    //
    //     // it('should track limits separately for different IPs', async () => {
    //     //     await request(app.getHttpServer())
    //     //         .get('/test/global')
    //     //         .set('X-Forwarded-For', '1.1.1.1');
    //     //     await request(app.getHttpServer())
    //     //         .get('/test/global')
    //     //         .set('X-Forwarded-For', '1.1.1.1');
    //     //
    //     //     // Second IP should still work
    //     //     const response = await request(app.getHttpServer())
    //     //         .get('/test/global')
    //     //         .set('X-Forwarded-For', '2.2.2.2');
    //     //
    //     //     expect(response.status).toBe(200);
    //     // });
    // });

    describe('Edge Cases', () => {
        beforeEach(async () => {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRoot({
                        windowMs: 5000,
                        max: 1,
                    }),
                ],
                controllers: [TestController],
            }).compile();

            app = moduleFixture.createNestApplication();
            await app.init();
        });

        afterEach(async () => {
            await app.close();
        });

        it('should handle limit of 1 correctly', async () => {
            const res1 = await request(app.getHttpServer()).get('/test/global');
            const res2 = await request(app.getHttpServer()).get('/test/global');

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(429);
        });

        it('should show 0 remaining after reaching limit', async () => {
            await request(app.getHttpServer()).get('/test/global');
            const response = await request(app.getHttpServer()).get('/test/global');

            expect(response.headers['x-ratelimit-remaining']).toBe('0');
        });
    });
});
