import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CounterOfferDto,
  CreateOfferDto,
  RespondToCounterOfferDto,
  UpdateOfferStatusDto,
} from './dto/offer.dto';
import { OffersService } from './offers.service';

@ApiTags('Marketplace / Offers')
@Controller('offers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new offer for a listing' })
  async create(@Body() dto: CreateOfferDto, @CurrentUser() user: any) {
    return this.offersService.create(dto, user.id);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get all offers I have made' })
  async findMySentOffers(@CurrentUser() user: any) {
    return this.offersService.findMySentOffers(user.id);
  }

  @Get('received')
  @ApiOperation({ summary: 'Get all offers received for my listings' })
  async findMyReceivedOffers(@CurrentUser() user: any) {
    return this.offersService.findMyReceivedOffers(user.id);
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get all offers for a specific listing (Seller only)' })
  async findByListing(@Param('listingId') listingId: string, @CurrentUser() user: any) {
    return this.offersService.findByListing(listingId, user.id);
  }

  @Post(':id/counter')
  @ApiOperation({ summary: 'Counter an offer as the seller' })
  async counter(@Param('id') id: string, @Body() dto: CounterOfferDto, @CurrentUser() user: any) {
    return this.offersService.counter(id, dto, user.id);
  }

  @Post(':id/counter/respond')
  @ApiOperation({ summary: 'Accept or reject a seller counter-offer as the buyer' })
  async respondToCounter(
    @Param('id') id: string,
    @Body() dto: RespondToCounterOfferDto,
    @CurrentUser() user: any,
  ) {
    return this.offersService.respondToCounter(id, dto, user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Accept, reject, or withdraw an offer' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOfferStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.offersService.updateStatus(id, dto, user.id);
  }
}
