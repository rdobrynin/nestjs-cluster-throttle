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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const common_1 = require("@nestjs/common");
let MemoryStore = class MemoryStore {
    constructor(windowMs) {
        this.windowMs = windowMs;
        this.storage = new Map();
        this.intervalId = setInterval(() => this.cleanup(), 60000);
    }
    async increment(key, windowMs) {
        const now = Date.now();
        const item = this.storage.get(key);
        if (!item || item.resetTime < now) {
            const newItem = {
                count: 1,
                resetTime: now + windowMs,
            };
            this.storage.set(key, newItem);
            return {
                count: 1,
                resetTime: new Date(newItem.resetTime),
            };
        }
        item.count += 1;
        return {
            count: item.count,
            resetTime: new Date(item.resetTime),
        };
    }
    async decrement(key) {
        const item = this.storage.get(key);
        if (item && item.count > 0) {
            item.count -= 1;
        }
    }
    async resetKey(key) {
        this.storage.delete(key);
    }
    async resetAll() {
        this.storage.clear();
    }
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.storage.entries()) {
            if (item.resetTime < now) {
                this.storage.delete(key);
            }
        }
    }
    onModuleDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
};
exports.MemoryStore = MemoryStore;
exports.MemoryStore = MemoryStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Number])
], MemoryStore);
//# sourceMappingURL=memory.store.js.map