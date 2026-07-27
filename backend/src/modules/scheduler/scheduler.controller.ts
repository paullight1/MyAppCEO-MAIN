import { Controller, Get, Post, Body, UseGuards, Param, Patch, Delete, Request } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Scheduler')
@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Schedule a new post' })
  createScheduledPost(
    @Request() req: any,
    @Body() body: {
      appId: string;
      content: string;
      mediaUrls?: string[];
      platforms: string[];
      scheduledAt: string;
      timezone?: string;
      isRecurring?: boolean;
      recurrenceRule?: string;
    },
  ) {
    return this.schedulerService.createScheduledPost({
      ...body,
      userId: req.user.id,
      scheduledAt: new Date(body.scheduledAt),
    });
  }

  @Get('posts/:appId')
  @ApiOperation({ summary: 'Get all scheduled posts for an app' })
  getScheduledPosts(@Param('appId') appId: string) {
    return this.schedulerService.getScheduledPosts(appId);
  }

  @Get('calendar/:appId')
  @ApiOperation({ summary: 'Get calendar data for a date range' })
  getCalendarData(
    @Param('appId') appId: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    return this.schedulerService.getCalendarData(
      appId,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  @Get('posts/detail/:id')
  @ApiOperation({ summary: 'Get a specific scheduled post' })
  getScheduledPost(@Param('id') id: string) {
    return this.schedulerService.getScheduledPost(id);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update a scheduled post' })
  updateScheduledPost(
    @Param('id') id: string,
    @Body() body: {
      content?: string;
      mediaUrls?: string[];
      platforms?: string[];
      scheduledAt?: string;
      timezone?: string;
    },
  ) {
    return this.schedulerService.updateScheduledPost(id, {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Cancel a scheduled post' })
  cancelScheduledPost(@Param('id') id: string) {
    return this.schedulerService.cancelScheduledPost(id);
  }

  @Post('posts/:id/publish-now')
  @ApiOperation({ summary: 'Publish a scheduled post immediately' })
  publishNow(@Param('id') id: string) {
    return this.schedulerService.publishNow(id);
  }
}