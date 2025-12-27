import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Header,
  UseInterceptors,
} from '@nestjs/common';
import { HealthService, HealthCheckResult } from './health.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthCheckResult> {

    return await this.redisService.getOrSet(
      'health:full',
      () => this.healthService.performHealthCheck(),
      30,
    );
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  async getLiveness(): Promise<{ status: 'alive' | 'dead'; timestamp: Date }> {
    return await this.healthService.getLiveness();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(): Promise<{
    ready: boolean;
    services: {
      redis: boolean;
      api: boolean;
    };
    timestamp: Date;
  }> {
    return await this.healthService.getReadiness();
  }

  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  async getDetailedHealth(): Promise<{
    health: any;
    checks: any[];
  }> {
    return await this.healthService.getDetailedHealth();
  }

  @Get('redis')
  @HttpCode(HttpStatus.OK)
  async checkRedis(): Promise<{
    connected: boolean;
    latency?: number;
    timestamp: Date;
    testData?: {
      set: boolean;
      get: boolean;
      delete: boolean;
    };
  }> {
    const startTime = Date.now();

    try {
      const pingResult = await this.redisService.ping();
      const latency = Date.now() - startTime;

      const testKey = 'health:test';
      const testValue = { test: 'data', timestamp: new Date() };

      await this.redisService.set(testKey, testValue, 10);
      const setSuccess = true;

      const retrieved = await this.redisService.get<any>(testKey);
      const getSuccess = retrieved && retrieved.test === 'data';

      await this.redisService.del(testKey);
      const delSuccess = true;

      return {
        connected: pingResult === 'PONG',
        latency,
        timestamp: new Date(),
        testData: {
          set: setSuccess,
          get: getSuccess,
          delete: delSuccess,
        },
      };
    } catch (error) {
      return {
        connected: false,
        timestamp: new Date(),
        latency: Date.now() - startTime,
      };
    }
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    const health = await this.healthService.performHealthCheck();
    const memory = health.status.memory;
    const redis = health.status.redis;

    const metrics = [
      '# HELP app_health_status Overall application health status (1=healthy, 0=unhealthy)',
      '# TYPE app_health_status gauge',
      `app_health_status ${health.success ? 1 : 0}`,

      '# HELP app_uptime_seconds Application uptime in seconds',
      '# TYPE app_uptime_seconds gauge',
      `app_uptime_seconds ${health.status.uptime / 1000}`,

      '# HELP app_memory_rss_mb Resident Set Size memory in MB',
      '# TYPE app_memory_rss_mb gauge',
      `app_memory_rss_mb ${memory.rss}`,

      '# HELP app_memory_heap_used_mb Heap used memory in MB',
      '# TYPE app_memory_heap_used_mb gauge',
      `app_memory_heap_used_mb ${memory.heapUsed}`,

      '# HELP redis_connected Redis connection status (1=connected, 0=disconnected)',
      '# TYPE redis_connected gauge',
      `redis_connected ${redis.status === 'connected' ? 1 : 0}`,

      '# HELP redis_latency_ms Redis ping latency in milliseconds',
      '# TYPE redis_latency_ms gauge',
      `redis_latency_ms ${redis.latency || 0}`,

      '# HELP app_services_status Individual service status (1=up, 0=down)',
      '# TYPE app_services_status gauge',
    ];

    Object.entries(health.status.services).forEach(([service, status]) => {
      metrics.push(`app_services_status{service="${service}"} ${status === 'up' ? 1 : 0}`);
    });

    return metrics.join('\n');
  }

  @Get('version')
  @HttpCode(HttpStatus.OK)
  getVersion(): {
    app: string;
    version: string;
    node: string;
    nestjs: string;
    timestamp: Date;
  } {
    return {
      app: 'NestJS Redis App',
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      nestjs: '11.0.0',
      timestamp: new Date(),
    };
  }

  @Get('cache-stats')
  @HttpCode(HttpStatus.OK)
  async getCacheStats(): Promise<{
    cacheEnabled: boolean;
    redisStats: any;
    timestamp: Date;
  }> {
    try {
      const stats = await this.redisService.getStats();
      return {
        cacheEnabled: true,
        redisStats: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        cacheEnabled: false,
        redisStats: null,
        timestamp: new Date(),
      };
    }
  }
}
