import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DesignsService } from './designs.service';
import { GenerateDesignDto, BatchGenerateDesignsDto } from './dto/design.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Designs')
@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a single design for a PRD node' })
  async generateDesign(
    @Body() dto: GenerateDesignDto,
    @CurrentUser() user: any,
  ) {
    return this.designsService.generateDesign(dto, user.id);
  }

  @Post('generate-batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate multiple designs for PRD nodes' })
  async generateBatch(
    @Body() dto: BatchGenerateDesignsDto,
    @CurrentUser() user: any,
  ) {
    return this.designsService.generateBatchDesigns(dto, user.id);
  }

  @Get(':ideaId/nodes/:nodeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific design by node ID' })
  async getDesignByNode(
    @Param('ideaId') ideaId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: any,
  ) {
    return this.designsService.getDesignByNode(ideaId, nodeId, user.id);
  }

  @Get(':ideaId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all designs for an idea' })
  async getAllDesigns(@Param('ideaId') ideaId: string, @CurrentUser() user: any) {
    return this.designsService.getAllDesigns(ideaId, user.id);
  }
}
