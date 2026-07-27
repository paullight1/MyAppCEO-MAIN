import { Controller, Post, Body, Get, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { AdminRole, RolesGuard } from '../admin/guards/roles.guard';

@ApiTags('Push Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('register-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register device FCM token for push notifications' })
  async registerToken(
    @Body() body: { fcm_token: string; device_type?: string; device_name?: string; app_version?: string },
    @Req() req: any,
  ) {
    if (!body.fcm_token) {
      throw new BadRequestException('fcm_token is required');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.notificationsService.registerDeviceToken(
      userId,
      body.fcm_token,
      body.device_type,
      body.device_name,
      body.app_version,
    );
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send push notification to user(s) - Admin only' })
  async sendPushNotification(
    @Body() body: {
      title: string;
      body: string;
      user_id?: string;
      target_type?: 'single' | 'user' | 'all' | 'segment';
      segment?: string;
      data?: Record<string, unknown>;
    },
  ) {
    if (!body.title || !body.body) {
      throw new BadRequestException('title and body are required');
    }

    if (!body.user_id && !body.target_type) {
      throw new BadRequestException('Must specify user_id or target_type');
    }

    return this.notificationsService.sendPushNotification({
      title: body.title,
      body: body.body,
      user_id: body.user_id,
      target_type: body.target_type,
      segment: body.segment,
      data: body.data,
    });
  }

  @Post('broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Broadcast push notification to all users - Admin only' })
  async broadcast(
    @Body() body: { title: string; body: string; data?: Record<string, unknown> },
  ) {
    if (!body.title || !body.body) {
      throw new BadRequestException('title and body are required');
    }

    return this.notificationsService.broadcastPushNotification(body.title, body.body, body.data);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notification history' })
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.notificationsService.getUserNotifications(
      userId,
      limit || 50,
      offset || 0,
    );
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return { count: await this.notificationsService.getUnreadCount(userId) };
  }
}
