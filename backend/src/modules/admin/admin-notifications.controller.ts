import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { AdminRole } from './guards/roles.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminNotificationsService } from './services/admin-notifications.service';
import {
  AdminNotificationsQueryDto,
  AdminNotificationUsersQueryDto,
  MarkAdminNotificationDto,
  SendAdminNotificationDto,
} from './dto/admin-notifications.dto';

@ApiTags('Admin / Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminNotificationsController {
  constructor(private adminNotificationsService: AdminNotificationsService) {}

  @Get('users')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'List users available for admin notifications' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async listUsers(@Query() query: AdminNotificationUsersQueryDto) {
    const users = await this.adminNotificationsService.listUsers(
      query.limit,
      query.search,
    );

    return { success: true, data: users };
  }

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'List recent admin-managed notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async listNotifications(@Query() query: AdminNotificationsQueryDto) {
    const result = await this.adminNotificationsService.listNotifications(
      query.page,
      query.limit,
    );

    return {
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send audited admin notifications' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendNotification(
    @Body() dto: SendAdminNotificationDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const result = await this.adminNotificationsService.sendNotification(
      dto,
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id/read')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @ApiOperation({ summary: 'Mark a notification read or unread as an admin' })
  @ApiParam({ name: 'id', type: String })
  @UsePipes(new ValidationPipe({ transform: true }))
  async markNotification(
    @Param('id') id: string,
    @Body() dto: MarkAdminNotificationDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const result = await this.adminNotificationsService.markNotification(
      id,
      dto.read,
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    return { success: true, data: result };
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT_AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification as an admin' })
  @ApiParam({ name: 'id', type: String })
  async deleteNotification(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    const result = await this.adminNotificationsService.deleteNotification(
      id,
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    return { success: true, data: result };
  }
}
