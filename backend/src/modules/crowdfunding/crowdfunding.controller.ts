import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CrowdfundingService } from './crowdfunding.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  InvestDto,
  ConfirmInvestmentDto,
  CreateShareLinkDto,
  CampaignFilterDto,
  CalculateStakeDto,
} from './dto/campaign.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Crowdfunding')
@Controller('crowdfunding')
export class CrowdfundingController {
  constructor(private readonly crowdfundingService: CrowdfundingService) {}

  @Post('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new crowdfunding campaign' })
  async createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() user: any) {
    return this.crowdfundingService.create(dto, user.id);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all campaigns with filters' })
  async getCampaigns(@Query() filters: CampaignFilterDto) {
    return this.crowdfundingService.findAll(filters);
  }

  @Get('campaigns/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s campaigns' })
  async getMyCampaigns(@CurrentUser() user: any) {
    return this.crowdfundingService.findMine(user.id);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async getCampaign(@Param('id') id: string) {
    return this.crowdfundingService.findOne(id);
  }

  @Get('campaigns/slug/:slug')
  @ApiOperation({ summary: 'Get campaign by slug' })
  async getCampaignBySlug(@Param('slug') slug: string) {
    return this.crowdfundingService.findBySlug(slug);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: any,
  ) {
    return this.crowdfundingService.update(id, dto, user.id);
  }

  @Post('campaigns/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish campaign (make active)' })
  async publishCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crowdfundingService.publish(id, user.id);
  }

  @Post('campaigns/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel campaign' })
  async cancelCampaign(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    return this.crowdfundingService.cancel(id, user.id, reason);
  }

  @Get('campaigns/:id/investors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign investors' })
  async getInvestors(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crowdfundingService.getInvestors(id, user.id);
  }

  @Post('campaigns/:id/invest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invest in a campaign' })
  async invest(
    @Param('id') id: string,
    @Body() dto: InvestDto,
    @CurrentUser() user: any,
  ) {
    return this.crowdfundingService.invest(id, dto, user.id);
  }

  @Post('campaigns/:id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm investment after payment' })
  async confirmInvestment(
    @Param('id') id: string,
    @Body() dto: ConfirmInvestmentDto,
    @CurrentUser() user: any,
  ) {
    return this.crowdfundingService.confirmInvestment(id, dto, user.id);
  }

  @Post('paystack/webhook')
  @ApiExcludeEndpoint()
  async handlePaystackWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.crowdfundingService.handlePaystackWebhook(req.rawBody, signature);
  }

  @Post('campaigns/:id/calculate-stake')
  @ApiOperation({ summary: 'Calculate stake for investment amount' })
  async calculateStake(
    @Param('id') id: string,
    @Body() dto: CalculateStakeDto,
  ) {
    return this.crowdfundingService.calculateStakeForAmount(id, dto);
  }

  @Post('campaigns/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create share link for campaign' })
  async createShareLink(
    @Param('id') id: string,
    @Body() dto: CreateShareLinkDto,
    @CurrentUser() user: any,
  ) {
    return this.crowdfundingService.createShareLink(id, dto, user.id);
  }

  @Get('invest/:token')
  @ApiOperation({ summary: 'Access campaign via share token' })
  async accessByShareToken(@Param('token') token: string) {
    return this.crowdfundingService.findByShareToken(token);
  }

  @Get('my-investments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s investments' })
  async getMyInvestments(@CurrentUser() user: any) {
    return this.crowdfundingService.getUserInvestments(user.id);
  }

  @Post('campaigns/:id/release-escrow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release escrow funds to campaign owner' })
  async releaseEscrow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crowdfundingService.releaseEscrow(id, user.id);
  }

  @Get('campaigns/:id/escrow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get escrow account details' })
  async getEscrowDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crowdfundingService.getEscrowDetails(id, user.id);
  }

  @Post('campaigns/:id/updates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a campaign update' })
  async postUpdate(
    @Param('id') id: string,
    @Body() body: { title: string; content: string },
    @CurrentUser() user: any,
  ) {
    return this.crowdfundingService.postCampaignUpdate(id, body.title, body.content, user.id);
  }

  @Get('campaigns/:id/updates')
  @ApiOperation({ summary: 'Get campaign updates' })
  async getCampaignUpdates(@Param('id') id: string) {
    return this.crowdfundingService.getCampaignUpdates(id);
  }
}
