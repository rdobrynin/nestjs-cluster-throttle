"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStore = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisStore = class RedisStore {
    constructor(options) {
        this.options = options;
        this.scriptSha = null;
        this.LUA_SCRIPT = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local max = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    local clearBefore = now - window
    redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
    
    local requestCount = redis.call('ZCARD', key)
    
    if requestCount < max then
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
        return {0, requestCount + 1}
    end
    
    return {1, requestCount}
  `;
        this.client = new ioredis_1.default({
            host: options.redisOptions?.host || 'localhost',
            port: options.redisOptions?.port || 6379,
            password: options.redisOptions?.password,
            db: options.redisOptions?.db || 0,
            keyPrefix: options.redisOptions?.keyPrefix || 'rate-limit:',
            enableReadyCheck: options.redisOptions?.enableReadyCheck !== false,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
        this.loadScript();
        this.client.on('error', (error) => {
            console.error('Redis connection error:', error);
        });
        this.client.on('ready', () => {
            console.log('Redis connection established');
        });
    }
    async loadScript() {
        try {
            this.scriptSha = await this.client.script('LOAD', this.LUA_SCRIPT);
        }
        catch (error) {
            console.error('Failed to load Lua script:', error);
            this.scriptSha = null;
        }
    }
    async increment(key, windowMs) {
        const now = Date.now();
        const max = this.options.max;
        let result;
        try {
            if (this.scriptSha) {
                result = await this.client.evalsha(this.scriptSha, 1, key, windowMs.toString(), max.toString(), now.toString());
            }
            else {
                result = await this.client.eval(this.LUA_SCRIPT, 1, key, windowMs.toString(), max.toString(), now.toString());
            }
        }
        catch (error) {
            if (error.message && error.message.includes('NOSCRIPT')) {
                await this.loadScript();
                return this.increment(key, windowMs);
            }
            throw error;
        }
        const [blocked, count] = result;
        const ttl = await this.client.ttl(key);
        const resetTime = new Date(now + (ttl > 0 ? ttl * 1000 : windowMs));
        return {
            count: parseInt(count.toString(), 10),
            resetTime,
        };
    }
    async decrement(key) {
        const now = Date.now();
        await this.client.zremrangebyscore(key, now, now);
    }
    async resetKey(key) {
        await this.client.del(key);
    }
    async resetAll() {
        const pattern = `${this.options.redisOptions?.keyPrefix || 'rate-limit:'}*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            const keysWithoutPrefix = keys.map(k => k.replace(this.options.redisOptions?.keyPrefix || 'rate-limit:', ''));
            await this.client.del(...keysWithoutPrefix);
        }
    }
    async disconnect() {
        await this.client.quit();
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
};
exports.RedisStore = RedisStore;
exports.RedisStore = RedisStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], RedisStore);
//# sourceMappingURL=redis.store.js.map