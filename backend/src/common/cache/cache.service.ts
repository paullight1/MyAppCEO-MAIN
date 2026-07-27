import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix: string;
  private readonly redis: Redis | null;
  private loggedUnavailable = false;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.keyPrefix = this.configService.get<string>(
      'CACHE_KEY_PREFIX',
      'mvplab',
    );

    if (!redisUrl) {
      this.redis = null;
      this.logger.warn('REDIS_URL is not configured; cache is disabled.');
      return;
    }

    this.redis = new Redis(redisUrl, {
      connectTimeout: Number(
        this.configService.get<string>('REDIS_CONNECT_TIMEOUT_MS') ?? 1000,
      ),
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => (attempt > 1 ? null : 100),
    });

    this.redis.on('error', (error) => this.reportUnavailable(error));
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  /** True when a Redis backend is configured and in use (vs. no-op cache). */
  isEnabled(): boolean {
    return this.redis !== null;
  }

  createKey(namespace: string, parts: Record<string, unknown> = {}) {
    const serializedParts = Object.keys(parts)
      .sort()
      .filter(
        (key) =>
          parts[key] !== undefined && parts[key] !== null && parts[key] !== '',
      )
      .map((key) => `${key}=${encodeURIComponent(String(parts[key]))}`)
      .join('&');

    return serializedParts ? `${namespace}:${serializedParts}` : namespace;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(this.toRedisKey(key));
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.reportUnavailable(error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const redisKey = this.toRedisKey(key);
      const serialized = JSON.stringify(value);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.set(redisKey, serialized, 'EX', ttlSeconds);
      } else {
        await this.redis.set(redisKey, serialized);
      }
    } catch (error) {
      this.reportUnavailable(error);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.redis || keys.length === 0) return;

    try {
      await this.redis.del(...keys.map((key) => this.toRedisKey(key)));
    } catch (error) {
      this.reportUnavailable(error);
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      let cursor = '0';
      const redisPattern = this.toRedisKey(pattern);

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          redisPattern,
          'COUNT',
          100,
        );

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      this.reportUnavailable(error);
    }
  }

  async wrap<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await producer();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  private toRedisKey(key: string) {
    return `${this.keyPrefix}:${key}`;
  }

  private reportUnavailable(error: unknown) {
    if (this.loggedUnavailable) return;

    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Redis cache unavailable; falling back to source data. ${message}`,
    );
    this.loggedUnavailable = true;
  }
}
