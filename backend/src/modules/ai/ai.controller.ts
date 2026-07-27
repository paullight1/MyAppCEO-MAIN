import { Controller, Post, Get, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AIService } from './ai.service';
import { ValuationRequestDto } from './dto/valuation.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI Intelligence')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('valuation')
  @ApiOperation({ summary: 'Suggest app valuation using OpenAI' })
  async suggestValuation(@Body() dto: ValuationRequestDto) {
    return this.aiService.suggestValuation(dto);
  }

  @Post('prd-suggestions')
  @ApiOperation({ summary: 'Generate PRD mind-map improvement suggestions' })
  async suggestPRDNode(
    @Body() dto: {
      ideaId?: string;
      nodeId: string;
      nodeType: string;
      nodeLabel: string;
      context?: string;
    },
    @Req() req: any,
  ) {
    if (!dto.nodeId || !dto.nodeType || !dto.nodeLabel) {
      throw new BadRequestException('nodeId, nodeType, and nodeLabel are required');
    }
    return this.aiService.suggestPRDNode(dto, req.user.id);
  }

  @Post('chat/start')
  @ApiOperation({ summary: 'Start a new AI conversation session' })
  async startConversation(
    @Body() body: {
      contextType: 'valuation' | 'listing' | 'pitch' | 'general';
      message: string;
      initialData?: Record<string, any>;
    },
    @Req() req: any,
  ) {
    if (!body.contextType || !body.message) {
      throw new BadRequestException('contextType and message are required');
    }
    return this.aiService.startConversation(
      req.user.id,
      body.contextType,
      body.message,
      body.initialData || {},
    );
  }

  @Post('chat/:sessionId/message')
  @ApiOperation({ summary: 'Send a message in an AI conversation' })
  @ApiParam({ name: 'sessionId', type: String })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
    @Req() req: any,
  ) {
    if (!body.message) {
      throw new BadRequestException('message is required');
    }
    return this.aiService.sendMessage(sessionId, req.user.id, body.message);
  }

  @Get('chat/:sessionId')
  @ApiOperation({ summary: 'Get conversation history' })
  @ApiParam({ name: 'sessionId', type: String })
  async getConversation(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.aiService.getConversation(sessionId, req.user.id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all AI conversation sessions' })
  async listConversations(
    @Req() req: any,
  ) {
    return this.aiService.listConversations(req.user.id);
  }
}
