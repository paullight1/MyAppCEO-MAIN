import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  const config = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'CACHE_KEY_PREFIX') return defaultValue ?? 'mvplab';
      return undefined;
    }),
  } as unknown as ConfigService;

  it('builds stable keys from unordered parameters', () => {
    const service = new CacheService(config);

    expect(service.createKey('listings', { page: 1, category: 'ai' })).toBe(
      service.createKey('listings', { category: 'ai', page: 1 }),
    );
  });

  it('falls back to the producer when Redis is disabled', async () => {
    const service = new CacheService(config);
    const producer = jest.fn().mockResolvedValue({ value: 42 });

    await expect(service.wrap('test', 60, producer)).resolves.toEqual({
      value: 42,
    });
    expect(producer).toHaveBeenCalledTimes(1);
  });
});
