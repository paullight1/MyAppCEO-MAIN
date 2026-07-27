import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { GenerationProviderRegistry } from './providers/generation-provider.registry';

@Module({
  imports: [AIModule],
  controllers: [GenerationController],
  providers: [GenerationService, GenerationProviderRegistry],
  exports: [GenerationService, GenerationProviderRegistry],
})
export class GenerationModule {}
