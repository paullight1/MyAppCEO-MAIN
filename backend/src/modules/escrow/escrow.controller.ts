import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EscrowService } from './escrow.service';

@ApiTags('Escrow')
@Controller('escrow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get()
  @ApiOperation({ summary: 'List authenticated user escrow deals' })
  async findMine(@CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.findMine(user.id) };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get authenticated user escrow stats' })
  async getStats(@CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.getStats(user.id) };
  }

  @Get(':dealId')
  @ApiOperation({ summary: 'Get escrow deal detail' })
  async findOne(@Param('dealId') dealId: string, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.findOne(dealId, user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Create escrow for an accepted offer' })
  async create(@Body('offerId') offerId: string, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.create(offerId, user.id) };
  }

  @Get(':dealId/funding')
  @ApiOperation({ summary: 'Get escrow funding state' })
  async getFunding(@Param('dealId') dealId: string, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.getFunding(dealId, user.id) };
  }

  @Patch(':dealId/funding')
  @ApiOperation({ summary: 'Update escrow funding state' })
  async updateFunding(@Param('dealId') dealId: string, @Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.updateFunding(dealId, user.id, body) };
  }

  @Post(':dealId/payment-intent')
  @ApiOperation({ summary: 'Create escrow payment intent' })
  async createPaymentIntent(@Param('dealId') dealId: string, @Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.createPaymentIntent(dealId, user.id, body) };
  }

  @Get(':dealId/transfer-items')
  @ApiOperation({ summary: 'List escrow transfer checklist items' })
  async getTransferItems(@Param('dealId') dealId: string, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.getTransferItems(dealId, user.id) };
  }

  @Post(':dealId/transfer-items')
  @ApiOperation({ summary: 'Configure escrow transfer checklist items' })
  async configureTransferItems(@Param('dealId') dealId: string, @Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.configureTransferItems(dealId, user.id, body) };
  }

  @Patch(':dealId/transfer-items/:itemId')
  @ApiOperation({ summary: 'Update escrow transfer checklist item' })
  async updateTransferItem(
    @Param('dealId') dealId: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return { success: true, data: await this.escrowService.updateTransferItem(dealId, itemId, user.id, body) };
  }

  @Patch(':dealId/transfer-items/:itemId/confirm')
  @ApiOperation({ summary: 'Confirm escrow transfer checklist item' })
  async confirmTransferItem(
    @Param('dealId') dealId: string,
    @Param('itemId') itemId: string,
    @Body('role') role: string,
    @CurrentUser() user: any,
  ) {
    return { success: true, data: await this.escrowService.confirmTransferItem(dealId, itemId, role, user.id) };
  }

  @Get(':dealId/milestones')
  @ApiOperation({ summary: 'List escrow milestones' })
  async getMilestones(@Param('dealId') dealId: string, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.getMilestones(dealId, user.id) };
  }

  @Patch(':dealId/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update escrow milestone status' })
  async updateMilestone(
    @Param('dealId') dealId: string,
    @Param('milestoneId') milestoneId: string,
    @Body('status') status: string,
  ) {
    return { success: true, data: await this.escrowService.updateMilestone(dealId, milestoneId, status) };
  }

  @Post(':dealId/release')
  @ApiOperation({ summary: 'Release escrow funds' })
  async releaseFunds(@Param('dealId') dealId: string) {
    return { success: true, data: await this.escrowService.releaseFunds(dealId) };
  }

  @Post(':dealId/refund')
  @ApiOperation({ summary: 'Refund escrow funds' })
  async refundDeal(@Param('dealId') dealId: string, @Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.refundDeal(dealId, user.id, body) };
  }

  @Get(':dealId/provider-state')
  @ApiOperation({ summary: 'Get escrow payment provider state' })
  async getProviderState(@Param('dealId') dealId: string, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.getProviderState(dealId, user.id) };
  }

  @Post(':dealId/dispute')
  @ApiOperation({ summary: 'Dispute escrow deal' })
  async disputeDeal(@Param('dealId') dealId: string, @Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.escrowService.disputeDeal(dealId, user.id, body) };
  }
}
