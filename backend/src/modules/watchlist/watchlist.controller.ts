import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateWatchlistItemDto,
  UpdateWatchlistItemDto,
  WatchlistFilterDto,
} from './dto/watchlist.dto';
import { WatchlistService } from './watchlist.service';

@ApiTags('Marketplace / Watchlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user watchlist' })
  findMine(@CurrentUser() user: any, @Query() filters: WatchlistFilterDto) {
    return this.watchlistService.findMine(user.id, filters.status);
  }

  @Post()
  @ApiOperation({ summary: 'Save a listing to the current user watchlist' })
  create(@CurrentUser() user: any, @Body() dto: CreateWatchlistItemDto) {
    return this.watchlistService.create(user.id, dto);
  }

  @Patch(':listingId')
  @ApiOperation({ summary: 'Update a watchlist item for the current user' })
  update(
    @CurrentUser() user: any,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateWatchlistItemDto,
  ) {
    return this.watchlistService.update(user.id, listingId, dto);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Remove a listing from the current user watchlist' })
  async remove(@CurrentUser() user: any, @Param('listingId') listingId: string) {
    await this.watchlistService.remove(user.id, listingId);
    return { listingId };
  }
}
