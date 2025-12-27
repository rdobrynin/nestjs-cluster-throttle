import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface ExampleData {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);
  private readonly prefix = 'example:';

  constructor(private readonly redisService: RedisService) {}

  async create(data: Omit<ExampleData, 'id' | 'timestamp'>): Promise<ExampleData> {
    const id = this.generateId();
    const timestamp = new Date();

    const exampleData: ExampleData = {
      id,
      timestamp,
      ...data,
    };

    await this.redisService.set(
      `${this.prefix}${id}`,
      exampleData,
      3600,
    );

    await this.addToIndex(id);

    this.logger.log(`Created example with id: ${id}`);
    return exampleData;
  }

  async findOne(id: string): Promise<ExampleData | null> {
    const data = await this.redisService.get<ExampleData>(`${this.prefix}${id}`);

    if (data) {
      this.logger.debug(`Found example with id: ${id}`);
    } else {
      this.logger.debug(`Example not found with id: ${id}`);
    }

    return data;
  }

  async findAll(): Promise<ExampleData[]> {
    const pattern = `${this.prefix}*`;
    const keys = await this.redisService.keys(pattern);

    const dataPromises = keys.map(key => this.redisService.get<ExampleData>(key));
    const results = await Promise.all(dataPromises);

    return results.filter((item): item is ExampleData => item !== null);
  }

  async update(id: string, data: Partial<Omit<ExampleData, 'id' | 'timestamp'>>): Promise<ExampleData | null> {
    const existing = await this.findOne(id);

    if (!existing) {
      return null;
    }

    const updatedData: ExampleData = {
      ...existing,
      ...data,
      timestamp: new Date(),
    };

    await this.redisService.set(
      `${this.prefix}${id}`,
      updatedData,
      3600,
    );

    this.logger.log(`Updated example with id: ${id}`);
    return updatedData;
  }

  async delete(id: string): Promise<boolean> {
    const key = `${this.prefix}${id}`;
    const exists = await this.findOne(id);

    if (!exists) {
      return false;
    }

    await this.redisService.del(key);
    await this.removeFromIndex(id);

    this.logger.log(`Deleted example with id: ${id}`);
    return true;
  }

  async searchByName(name: string): Promise<ExampleData[]> {
    const allData = await this.findAll();
    return allData.filter(item =>
      item.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  async getStats(): Promise<{
    total: number;
    averageValue: number;
    lastUpdated: Date | null;
  }> {
    const allData = await this.findAll();

    if (allData.length === 0) {
      return {
        total: 0,
        averageValue: 0,
        lastUpdated: null,
      };
    }

    const totalValue = allData.reduce((sum, item) => sum + item.value, 0);
    const latestTimestamp = allData.reduce(
      (latest, item) => (item.timestamp > latest ? item.timestamp : latest),
      new Date(0),
    );

    return {
      total: allData.length,
      averageValue: totalValue / allData.length,
      lastUpdated: latestTimestamp,
    };
  }

  private generateId(): string {
    return `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async addToIndex(id: string): Promise<void> {
    const indexKey = `${this.prefix}index`;
    const existingIndex = await this.redisService.get<string[]>(indexKey) || [];
    existingIndex.push(id);
    await this.redisService.set(indexKey, existingIndex, 3600);
  }

  private async removeFromIndex(id: string): Promise<void> {
    const indexKey = `${this.prefix}index`;
    const existingIndex = await this.redisService.get<string[]>(indexKey) || [];
    const updatedIndex = existingIndex.filter(item => item !== id);
    await this.redisService.set(indexKey, updatedIndex, 3600);
  }
}
