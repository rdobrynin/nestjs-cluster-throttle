import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RedisService } from "./modules/redis/redis.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('info')
  getAppInfo(): {
    name: string;
    version: string;
    status: string;
    services: string[];
    timestamp: Date;
  } {
    return {
      name: 'NestJS Redis Application',
      version: '1.0.0',
      status: 'running',
      services: ['Redis', 'Example API', 'Health Checks'],
      timestamp: new Date(),
    };
  }

  @Get('status')
  async getStatus(): Promise<{
    app: string;
    redis: string;
    timestamp: Date;
    endpoints: {
      api: string;
      examples: string;
      health: string;
    };
  }> {
    const redisStatus = await this.redisService.ping()
      .then(res => res === 'PONG' ? 'connected' : 'disconnected')
      .catch(() => 'disconnected');

    return {
      app: 'running',
      redis: redisStatus,
      timestamp: new Date(),
      endpoints: {
        api: '/api',
        examples: '/example',
        health: '/health',
      },
    };
  }
}
