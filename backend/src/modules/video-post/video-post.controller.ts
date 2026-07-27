import { Controller, Get, Post, Body, UseGuards, Param, Delete, Request } from '@nestjs/common';
import { VideoPostService } from './video-post.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Video Post')
@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoPostController {
  constructor(private readonly videoPostService: VideoPostService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a video for auto-posting to connected accounts' })
  uploadVideo(
    @Request() req: any,
    @Body() body: {
      appId: string;
      fileUrl: string;
      thumbnailUrl?: string;
      duration?: number;
      caption?: string;
      platforms: string[];
    },
  ) {
    return this.videoPostService.createVideoPost({
      ...body,
      userId: req.user.id,
    });
  }

  @Get('list/:appId')
  @ApiOperation({ summary: 'Get all video posts for an app' })
  getVideoPosts(@Param('appId') appId: string) {
    return this.videoPostService.getVideoPosts(appId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific video post' })
  getVideoPost(@Param('id') id: string) {
    return this.videoPostService.getVideoPost(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a video post' })
  deleteVideoPost(@Param('id') id: string) {
    return this.videoPostService.deleteVideoPost(id);
  }
}