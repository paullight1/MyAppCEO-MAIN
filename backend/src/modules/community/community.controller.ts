import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import {
  CreateTopicDto,
  UpdateTopicDto,
  CreatePostDto,
  UpdatePostDto,
  VoteDto,
  TopicFilterDto,
} from './dto/community.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('forums')
  @ApiOperation({ summary: 'Get all community forums' })
  async getForums() {
    return this.communityService.getForums();
  }

  @Get('forums/:slug')
  @ApiOperation({ summary: 'Get forum by slug' })
  async getForumBySlug(@Param('slug') slug: string) {
    return this.communityService.getForumBySlug(slug);
  }

  @Get('topics')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get topics with filters' })
  async getTopics(
    @Query() filters: TopicFilterDto,
    @CurrentUser() user?: any,
  ) {
    return this.communityService.getTopics(filters, user?.id);
  }

  @Get('topics/trending')
  @ApiOperation({ summary: 'Get trending topics' })
  async getTrendingTopics() {
    return this.communityService.getTrendingTopics();
  }

  @Get('topics/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get topic by slug' })
  async getTopicBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: any,
  ) {
    return this.communityService.getTopicBySlug(slug, user?.id);
  }

  @Post('topics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new topic' })
  async createTopic(@Body() dto: CreateTopicDto, @CurrentUser() user: any) {
    return this.communityService.createTopic(dto, user.id);
  }

  @Patch('topics/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a topic' })
  async updateTopic(
    @Param('id') id: string,
    @Body() dto: UpdateTopicDto,
    @CurrentUser() user: any,
  ) {
    return this.communityService.updateTopic(id, dto, user.id);
  }

  @Delete('topics/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a topic' })
  async deleteTopic(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communityService.deleteTopic(id, user.id);
  }

  @Get('topics/:topicId/posts')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get posts for a topic' })
  async getPosts(
    @Param('topicId') topicId: string,
    @CurrentUser() user?: any,
  ) {
    return this.communityService.getPosts(topicId, user?.id);
  }

  @Post('topics/:topicId/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a post/reply' })
  async createPost(
    @Param('topicId') topicId: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: any,
  ) {
    return this.communityService.createPost(topicId, dto, user.id);
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: any,
  ) {
    return this.communityService.updatePost(id, dto, user.id);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  async deletePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communityService.deletePost(id, user.id);
  }

  @Post('posts/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept an answer' })
  async acceptAnswer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communityService.acceptAnswer(id, user.id);
  }

  @Post('votes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on a topic or post' })
  async vote(@Body() dto: VoteDto, @CurrentUser() user: any) {
    return this.communityService.vote(dto, user.id);
  }

  @Get('users/:id/stats')
  @ApiOperation({ summary: 'Get user community stats' })
  async getUserStats(@Param('id') id: string) {
    return this.communityService.getUserStats(id);
  }

  @Get('stars')
  @ApiOperation({ summary: 'Get community stars (top contributors)' })
  async getCommunityStars() {
    return this.communityService.getCommunityStars();
  }

  @Post('topics/:topicId/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark a topic' })
  async bookmarkTopic(
    @Param('topicId') topicId: string,
    @CurrentUser() user: any,
  ) {
    return this.communityService.bookmarkTopic(topicId, user.id);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks' })
  async getBookmarks(@CurrentUser() user: any) {
    return this.communityService.getBookmarks(user.id);
  }
}