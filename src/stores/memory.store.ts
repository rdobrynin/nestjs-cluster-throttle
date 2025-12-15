import { Injectable } from '@nestjs/common';
import { RateLimitStore } from './store.interface';

interface MemoryStoreItem {
    count: number;
    resetTime: number;
}

@Injectable()
export class MemoryStore implements RateLimitStore {
    private storage: Map<string, MemoryStoreItem> = new Map();
    private intervalId: NodeJS.Timeout;

    constructor(private windowMs: number) {
        // Очистка устаревших записей каждую минуту
        this.intervalId = setInterval(() => this.cleanup(), 60000);
    }

    async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: Date }> {
        const now = Date.now();
        const item = this.storage.get(key);

        if (!item || item.resetTime < now) {
            // Новая запись или истекшее окно
            const newItem: MemoryStoreItem = {
                count: 1,
                resetTime: now + windowMs,
            };
            this.storage.set(key, newItem);

            return {
                count: 1,
                resetTime: new Date(newItem.resetTime),
            };
        }

        // Увеличиваем счетчик
        item.count += 1;

        return {
            count: item.count,
            resetTime: new Date(item.resetTime),
        };
    }

    async decrement(key: string): Promise<void> {
        const item = this.storage.get(key);
        if (item && item.count > 0) {
            item.count -= 1;
        }
    }

    async resetKey(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async resetAll(): Promise<void> {
        this.storage.clear();
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.storage.entries()) {
            if (item.resetTime < now) {
                this.storage.delete(key);
            }
        }
    }

    onModuleDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
