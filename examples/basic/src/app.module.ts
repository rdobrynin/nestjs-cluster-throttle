import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from "./modules/redis/redis.module";
import { RedisService } from "./modules/redis/redis.service";
import { ExampleModule } from "./modules/example/example.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [RedisModule, ExampleModule, HealthModule],
  controllers: [AppController],
  providers: [AppService,RedisService],
})
export class AppModule {}
