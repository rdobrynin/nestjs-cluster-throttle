export interface RateLimitOptions {
    windowMs: number;
    max: number;
    message?: string;
    statusCode?: number;
    skipSuccessfulRequests?: boolean;
    keyGenerator?: (request: any) => string;
    skip?: (request: any) => boolean;
    handler?: (request: any, response: any) => void;
    clusterMode?: boolean;
    redisOptions?: {
        host?: string;
        port?: number;
        password?: string;
        db?: number;
        keyPrefix?: string;
        enableReadyCheck?: boolean;
    };
    strategy?: 'fixed-window' | 'token-bucket' | 'sliding-window';
    burstCapacity?: number;
    fillRate?: number;
}
