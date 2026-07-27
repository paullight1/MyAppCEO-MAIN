import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Body,
  Headers,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments / Verification')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Connect onboarding link' })
  async connectStripe(@CurrentUser() user: any) {
    return this.paymentsService.createConnectAccount(user.id, user.email);
  }

  @Get('connect/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe Connect status' })
  async getConnectStatus(@CurrentUser() user: any) {
    return this.paymentsService.getConnectStatus(user.id);
  }

  @Post('connect/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh Stripe Connect onboarding link' })
  async refreshConnect(@CurrentUser() user: any) {
    return this.paymentsService.refreshConnect(user.id, user.email);
  }

  @Get('listings/:id/payout-readiness')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get listing payout readiness' })
  async getListingPayoutReadiness(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.getListingPayoutReadiness(id, user.id);
  }

  @Post('listings/:id/revenue-evidence')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit listing revenue evidence' })
  async submitRevenueEvidence(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.paymentsService.submitRevenueEvidence(id, user.id, body);
  }

  @Get('listings/:id/revenue-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get listing revenue verification state' })
  async getRevenueVerification(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.getRevenueVerification(id, user.id);
  }

  @Post('verify-revenue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify app revenue via connected Stripe account' })
  async verifyRevenue(@Body() body: { appId: string; stripeAccountId: string }) {
    return this.paymentsService.verifyRevenue(body.appId, body.stripeAccountId);
  }

  @Get('disputes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List Stripe disputes for the current user' })
  async listDisputes(
    @CurrentUser() user: any,
    @Query('appId') appId?: string,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.listDisputes(user.id, { appId, status });
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List Stripe subscriptions for the current user' })
  async listSubscriptions(
    @CurrentUser() user: any,
    @Query('appId') appId?: string,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.listSubscriptions(user.id, { appId, status });
  }

  @Get('subscriptions/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aggregate stored MRR / active subscriptions for the current user' })
  async getSubscriptionSummary(
    @CurrentUser() user: any,
    @Query('appId') appId?: string,
  ) {
    return this.paymentsService.getSubscriptionSummary(user.id, appId);
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') stripeSignature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, stripeSignature);
  }
}
