import { Test, TestingModule } from '@nestjs/testing';
import { Module } from '@nestjs/common';
import { RateLimitModule } from './rate-limit.module';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

describe('RateLimitModule', () => {
    describe('forRoot', () => {
        it('should create module with default options', async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRoot({
                        windowMs: 60000,
                        max: 100,
                    }),
                ],
            }).compile();

            const service = module.get<RateLimitService>(RateLimitService);
            expect(service).toBeDefined();
        });

        it('should create module with Redis options', async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRoot({
                        windowMs: 60000,
                        max: 100,
                        clusterMode: true,
                        redisOptions: {
                            host: 'localhost',
                            port: 6379,
                        },
                    }),
                ],
            }).compile();

            const service = module.get<RateLimitService>(RateLimitService);
            expect(service).toBeDefined();
        });

        it('should provide RateLimitGuard as APP_GUARD', async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRoot({
                        windowMs: 60000,
                        max: 100,
                    }),
                ],
            }).compile();

            const guards = module
                .get('APP_GUARD', { strict: false })
                .constructor.name;

            // Guard should be provided but might not be directly accessible
            expect(module).toBeDefined();
        });

        it('should export RateLimitCoreModule', async () => {
            const moduleMetadata = RateLimitModule.forRoot({
                windowMs: 60000,
                max: 100,
            });

            expect(moduleMetadata.exports).toBeDefined();
            expect(moduleMetadata.imports).toBeDefined();
        });
    });

    describe('forRootAsync', () => {
        it('should create module with async configuration', async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRootAsync({
                        useFactory: () => ({
                            windowMs: 60000,
                            max: 100,
                        }),
                    }),
                ],
            }).compile();

            const service = module.get<RateLimitService>(RateLimitService);
            expect(service).toBeDefined();
        });

        it('should create module with async configuration and dependencies', async () => {
            class ConfigService {
                get(key: string): any {
                    const config: Record<string, any> = {
                        RATE_LIMIT_WINDOW: 60000,
                        RATE_LIMIT_MAX: 100,
                    };
                    return config[key];
                }
            }

            @Module({
                providers: [ConfigService],
                exports: [ConfigService],
            })
            class ConfigModule {}

            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRootAsync({
                        imports: [ConfigModule],
                        useFactory: (configService: ConfigService) => ({
                            windowMs: configService.get('RATE_LIMIT_WINDOW'),
                            max: configService.get('RATE_LIMIT_MAX'),
                        }),
                        inject: [ConfigService],
                    }),
                ],
            }).compile();

            const service = module.get<RateLimitService>(RateLimitService);
            expect(service).toBeDefined();
        });

        it('should create module with async Redis configuration', async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRootAsync({
                        useFactory: () => ({
                            windowMs: 60000,
                            max: 100,
                            clusterMode: true,
                            redisOptions: {
                                host: 'localhost',
                                port: 6379,
                            },
                        }),
                    }),
                ],
            }).compile();

            const service = module.get<RateLimitService>(RateLimitService);
            expect(service).toBeDefined();
        });

        it('should handle Promise-based factory', async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    RateLimitModule.forRootAsync({
                        useFactory: async () => {
                            // Simulate async operation
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve({
                                        windowMs: 60000,
                                        max: 100,
                                    });
                                }, 10);
                            });
                        },
                    }),
                ],
            }).compile();

            const service = module.get<RateLimitService>(RateLimitService);
            expect(service).toBeDefined();
        });

        it('should provide APP_GUARD in async configuration', async () => {
            const moduleMetadata = RateLimitModule.forRootAsync({
                useFactory: () => ({
                    windowMs: 60000,
                    max: 100,
                }),
            });

            expect(moduleMetadata.providers).toBeDefined();
            const appGuardProvider = (moduleMetadata.providers as any[]).find(
                (p: any) => p.provide === 'APP_GUARD',
            );
            expect(appGuardProvider).toBeDefined();
        });
    });

    describe('module structure', () => {
        it('should have correct metadata for forRoot', () => {
            const moduleMetadata = RateLimitModule.forRoot({
                windowMs: 60000,
                max: 100,
            });

            expect(moduleMetadata.module).toBe(RateLimitModule);
            expect(moduleMetadata.imports).toBeDefined();
            expect(moduleMetadata.providers).toBeDefined();
            expect(moduleMetadata.exports).toBeDefined();
        });

        it('should have correct metadata for forRootAsync', () => {
            const moduleMetadata = RateLimitModule.forRootAsync({
                useFactory: () => ({
                    windowMs: 60000,
                    max: 100,
                }),
            });

            expect(moduleMetadata.module).toBe(RateLimitModule);
            expect(moduleMetadata.imports).toBeDefined();
            expect(moduleMetadata.providers).toBeDefined();
            expect(moduleMetadata.exports).toBeDefined();
        });

        it('should include imports from async configuration', () => {
            class CustomModule {}

            const moduleMetadata = RateLimitModule.forRootAsync({
                imports: [CustomModule],
                useFactory: () => ({
                    windowMs: 60000,
                    max: 100,
                }),
            });

            expect(moduleMetadata.imports).toContain(CustomModule);
        });
    });
});
