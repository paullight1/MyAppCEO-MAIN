import { Module } from '@nestjs/common';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';
import { AIModule } from '../ai/ai.module';
import { GenerationModule } from '../generation/generation.module';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [AIModule, GenerationModule, AppsModule],
  controllers: [IdeasController],
  providers: [IdeasService],
  exports: [IdeasService],
})
export class IdeasModule {}
