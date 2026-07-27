import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

export const MEILISEARCH = 'MEILISEARCH';

export const MeilisearchProvider: Provider = {
  provide: MEILISEARCH,
  useFactory: (configService: ConfigService) => {
    const host = configService.get<string>('MEILISEARCH_HOST', 'http://localhost:7700');
    const apiKey = configService.get<string>('MEILISEARCH_API_KEY', 'masterKey');
    
    return new MeiliSearch({
      host,
      apiKey,
    });
  },
  inject: [ConfigService],
};