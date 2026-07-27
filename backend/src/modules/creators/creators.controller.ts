import { Controller, Get, Post, Body, UseGuards, Param, Query } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Creators / Talents')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get('talents')
  @ApiOperation({ summary: 'Get all approved talents' })
  async findAllTalents() {
    return this.creatorsService.findAllTalents();
  }

  @Get('portfolio/:talentId')
  @ApiOperation({ summary: 'Get a specific talent portfolio' })
  async findPortfolio(@Param('talentId') talentId: string) {
    return this.creatorsService.findPortfolioByTalent(talentId);
  }

  @Post('portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update my talent portfolio' })
  async createPortfolio(@CurrentUser() user: any, @Body() body: any) {
    return this.creatorsService.createPortfolio(user.id, body);
  }

  @Post('ugc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit UGC content for review' })
  async submitUGC(@CurrentUser() user: any, @Body() body: any) {
    return this.creatorsService.submitUGC(user.id, body);
  }

  @Get('ugc/recent')
  @ApiOperation({ summary: 'Get recent approved UGC content' })
  async findRecentUGC() {
    return this.creatorsService.findRecentUGC();
  }
}
