import { Module, Global } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { MeilisearchProvider } from './meilisearch.provider';

@Global()
@Module({
  providers: [MeilisearchProvider, SearchService],
  controllers: [SearchController],
  exports: [SearchService, MeilisearchProvider],
})
export class SearchModule {}