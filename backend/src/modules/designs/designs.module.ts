import { Module } from '@nestjs/common';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [ConfigModule, MediaModule],
  controllers: [DesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}