import { Controller, Get, Query, UseGuards, Post, Param } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Search listings with Meilisearch' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'listingType', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async searchListings(
    @Query('q') query: string = '',
    @Query('category') category?: string,
    @Query('listingType') listingType?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.searchService.searchListings(query, {
      category,
      listingType,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Post('listings/reindex/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reindex a specific listing' })
  async reindexListing(@Param('id') id: string) {
    await this.searchService.reindexListingById(id);
    return { success: true, message: 'Listing reindexed' };
  }
}