import { MemoryStore } from './memory.store';

describe('MemoryStore', () => {
    let store: MemoryStore;
    const windowMs = 1000;

    beforeEach(() => {
        store = new MemoryStore(windowMs);
    });

    afterEach(() => {
        store.onModuleDestroy();
    });

    describe('increment', () => {
        it('should initialize counter for new key', async () => {
            const result = await store.increment('test-key', windowMs);

            expect(result.count).toBe(1);
            expect(result.resetTime).toBeInstanceOf(Date);
            expect(result.resetTime.getTime()).toBeGreaterThan(Date.now());
        });

        it('should increment existing counter', async () => {
            await store.increment('test-key', windowMs);
            await store.increment('test-key', windowMs);
            const result = await store.increment('test-key', windowMs);

            expect(result.count).toBe(3);
        });

        it('should reset counter after window expires', async () => {
            const shortWindow = 100;
            const shortStore = new MemoryStore(shortWindow);

            await shortStore.increment('test-key', shortWindow);
            expect((await shortStore.increment('test-key', shortWindow)).count).toBe(2);

            await new Promise((resolve) => setTimeout(resolve, 150));

            const result = await shortStore.increment('test-key', shortWindow);
            expect(result.count).toBe(1);

            shortStore.onModuleDestroy();
        });

        it('should handle multiple keys independently', async () => {
            await store.increment('key1', windowMs);
            await store.increment('key1', windowMs);
            await store.increment('key2', windowMs);

            const result1 = await store.increment('key1', windowMs);
            const result2 = await store.increment('key2', windowMs);

            expect(result1.count).toBe(3);
            expect(result2.count).toBe(2);
        });

        it('should maintain correct reset time', async () => {
            const result1 = await store.increment('test-key', windowMs);
            await new Promise((resolve) => setTimeout(resolve, 100));
            const result2 = await store.increment('test-key', windowMs);

            expect(result1.resetTime.getTime()).toBe(result2.resetTime.getTime());
        });
    });

    describe('decrement', () => {
        it('should decrement existing counter', async () => {
            await store.increment('test-key', windowMs);
            await store.increment('test-key', windowMs);
            await store.decrement('test-key');

            const result = await store.increment('test-key', windowMs);
            expect(result.count).toBe(2);
        });

        it('should not decrement below zero', async () => {
            await store.increment('test-key', windowMs);
            await store.decrement('test-key');
            await store.decrement('test-key');
            await store.decrement('test-key');

            const result = await store.increment('test-key', windowMs);
            expect(result.count).toBe(1);
        });

        it('should handle decrement for non-existent key', async () => {
            await expect(store.decrement('non-existent')).resolves.not.toThrow();
        });
    });

    describe('resetKey', () => {
        it('should reset specific key', async () => {
            await store.increment('test-key', windowMs);
            await store.increment('test-key', windowMs);
            await store.resetKey('test-key');

            const result = await store.increment('test-key', windowMs);
            expect(result.count).toBe(1);
        });

        it('should not affect other keys', async () => {
            await store.increment('key1', windowMs);
            await store.increment('key2', windowMs);
            await store.resetKey('key1');

            const result2 = await store.increment('key2', windowMs);
            expect(result2.count).toBe(2);
        });

        it('should handle reset of non-existent key', async () => {
            await expect(store.resetKey('non-existent')).resolves.not.toThrow();
        });
    });

    describe('resetAll', () => {
        it('should reset all keys', async () => {
            await store.increment('key1', windowMs);
            await store.increment('key2', windowMs);
            await store.increment('key3', windowMs);

            await store.resetAll();

            const result1 = await store.increment('key1', windowMs);
            const result2 = await store.increment('key2', windowMs);
            const result3 = await store.increment('key3', windowMs);

            expect(result1.count).toBe(1);
            expect(result2.count).toBe(1);
            expect(result3.count).toBe(1);
        });

        it('should work on empty store', async () => {
            await expect(store.resetAll()).resolves.not.toThrow();
        });
    });

    describe('cleanup', () => {
        it('should remove expired entries', async () => {
            const shortWindow = 50;
            const shortStore = new MemoryStore(shortWindow);

            (shortStore as any).intervalId && clearInterval((shortStore as any).intervalId);

            // Manually trigger cleanup mechanism
            await shortStore.increment('key1', shortWindow);
            await shortStore.increment('key2', shortWindow);

            await new Promise((resolve) => setTimeout(resolve, 100));

            (shortStore as any).cleanup();

            const result = await shortStore.increment('key1', shortWindow);
            expect(result.count).toBe(1);

            shortStore.onModuleDestroy();
        }, 10000);

        it('should cleanup on regular interval', async () => {
            const testWindow = 50;
            const testStore = new MemoryStore(testWindow);

            await testStore.increment('cleanup-test-1', testWindow);
            await testStore.increment('cleanup-test-2', testWindow);

            const before = await testStore.increment('cleanup-test-1', testWindow);
            expect(before.count).toBe(2);

            await new Promise((resolve) => setTimeout(resolve, 100));

            (testStore as any).cleanup();

            const after = await testStore.increment('cleanup-test-1', testWindow);
            expect(after.count).toBe(1);

            testStore.onModuleDestroy();
        }, 10000);
    });

    describe('onModuleDestroy', () => {
        it('should clear cleanup interval', () => {
            const testStore = new MemoryStore(windowMs);
            expect(() => testStore.onModuleDestroy()).not.toThrow();
        });

        it('should handle multiple destroy calls', () => {
            const testStore = new MemoryStore(windowMs);
            testStore.onModuleDestroy();
            expect(() => testStore.onModuleDestroy()).not.toThrow();
        });
    });

    describe('concurrent operations', () => {
        it('should handle concurrent increments correctly', async () => {
            const promises = Array.from({ length: 10 }, () =>
                store.increment('concurrent-key', windowMs),
            );

            const results = await Promise.all(promises);
            const counts = results.map((r) => r.count);

            expect(Math.max(...counts)).toBe(10);
            expect(new Set(counts).size).toBe(10);
        });

        it('should handle concurrent operations on different keys', async () => {
            const operations = [
                store.increment('key1', windowMs),
                store.increment('key2', windowMs),
                store.increment('key3', windowMs),
                store.increment('key1', windowMs),
                store.increment('key2', windowMs),
            ];

            const results = await Promise.all(operations);

            expect(results[0].count).toBe(1);
            expect(results[3].count).toBe(2);
        });
    });
});
