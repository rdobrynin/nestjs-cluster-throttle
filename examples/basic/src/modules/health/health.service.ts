import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  redis: {
    status: 'connected' | 'disconnected' | 'error';
    latency?: number;
    version?: string;
    usedMemory?: string;
  };
  database?: {
    status: 'connected' | 'disconnected';
  };
  services: {
    [key: string]: 'up' | 'down' | 'unknown';
  };
}

export interface HealthCheckResult {
  success: boolean;
  status: HealthStatus;
  message: string;
}

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);
  private readonly startupTime = Date.now();
  private redisConnected = false;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.checkRedisConnection();
  }

  async checkRedisConnection(): Promise<boolean> {
    try {
      const pingResult = await this.redisService.ping();
      this.redisConnected = pingResult === 'PONG';

      if (this.redisConnected) {
        this.logger.log('Redis connection established');
      }

      return this.redisConnected;
    } catch (error) {
      this.logger.error('Redis connection failed:', error.message);
      this.redisConnected = false;
      return false;
    }
  }

  async getRedisInfo(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    latency?: number;
    version?: string;
    usedMemory?: string;
  }> {
    if (!this.redisConnected) {
      return { status: 'disconnected' };
    }

    try {
      const startTime = Date.now();
      await this.redisService.ping();
      const latency = Date.now() - startTime;

      return {
        status: 'connected',
        latency,
        version: 'unknown',
        usedMemory: 'unknown',
      };
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error.message);
      return { status: 'error' };
    }
  }

  getMemoryUsage() {
    const memoryUsage = process.memoryUsage();

    return {
      rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100, // MB
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024 * 100) / 100, // MB
    };
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const redisInfo = await this.getRedisInfo();
    const memoryUsage = this.getMemoryUsage();

    const servicesStatus = {
      redis: redisInfo.status === 'connected' ? 'up' : 'down',
      api: 'up',
    };

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (redisInfo.status !== 'connected') {
      overallStatus = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startupTime,
      memory: memoryUsage,
      redis: redisInfo,
      // @ts-ignore
      services: servicesStatus,
    };

    const message = overallStatus === 'healthy'
      ? 'All systems operational'
      : `Service issues detected: ${Object.entries(servicesStatus)
        .filter(([, status]) => status === 'down')
        .map(([service]) => service)
        .join(', ')}`;

    return {
      success: overallStatus === 'healthy',
      status: healthStatus,
      message,
    };
  }

  async getLiveness(): Promise<{ status: 'alive' | 'dead'; timestamp: Date }> {
    const redisConnected = await this.checkRedisConnection();

    return {
      status: redisConnected ? 'alive' : 'dead',
      timestamp: new Date(),
    };
  }

  async getReadiness(): Promise<{
    ready: boolean;
    services: {
      redis: boolean;
      api: boolean;
    };
    timestamp: Date;
  }> {
    const redisConnected = await this.checkRedisConnection();

    return {
      ready: redisConnected,
      services: {
        redis: redisConnected,
        api: true,
      },
      timestamp: new Date(),
    };
  }

  async getDetailedHealth(): Promise<{
    health: HealthStatus;
    checks: Array<{
      service: string;
      status: 'pass' | 'fail' | 'warn';
      responseTime: number;
      timestamp: Date;
    }>;
  }> {
    const checks = [];

    const redisStart = Date.now();
    const redisConnected = await this.checkRedisConnection();
    const redisTime = Date.now() - redisStart;

    // @ts-ignore
    checks.push({
      service: 'redis',
      status: redisConnected ? 'pass' : 'fail',
      responseTime: redisTime,
      timestamp: new Date(),
    });

    const memoryStart = Date.now();
    const memoryUsage = this.getMemoryUsage();
    const memoryTime = Date.now() - memoryStart;

    const memoryStatus = memoryUsage.heapUsed < 500 ? 'pass' : 'warn';

    // @ts-ignore
    checks.push({
      service: 'memory',
      status: memoryStatus,
      responseTime: memoryTime,
      timestamp: new Date(),
    });

    const healthStatus = await this.performHealthCheck();

    return {
      health: healthStatus.status,
      checks,
    };
  }

  async cacheHealthStatus(ttl = 30): Promise<void> {
    const healthCheck = await this.performHealthCheck();
    await this.redisService.set(
      'health:status',
      {
        ...healthCheck,
        cachedAt: new Date(),
      },
      ttl,
    );
  }

  async getCachedHealthStatus(): Promise<HealthCheckResult | null> {
    return await this.redisService.get<HealthCheckResult>('health:status');
  }
}
