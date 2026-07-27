import { Controller, Get, Post, Patch, Body, Param, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: any) {
    return await this.campaignService.create(dto, user.id);
  }

  @Get('app/:appId')
  async findByApp(@Param('appId') appId: string) {
    return await this.campaignService.findByApp(appId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.campaignService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    return await this.campaignService.updateStatus(id, dto);
  }
}
