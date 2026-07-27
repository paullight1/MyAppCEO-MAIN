import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/message.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Marketplace / Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: any) {
    return this.messagesService.sendMessage(dto, user.id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get my conversations' })
  async getConversations(@CurrentUser() user: any) {
    return this.messagesService.getConversations(user.id);
  }

  @Get('conversation/:id')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async getMessages(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.getMessages(id, user.id);
  }
}
