import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OpenAIProvider } from './openai.provider';

@Module({
  providers: [AIService, OpenAIProvider],
  controllers: [AIController],
  exports: [AIService, OpenAIProvider],
})
export class AIModule {}
