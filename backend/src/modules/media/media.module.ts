import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { CloudinaryProvider } from './cloudinary.provider';

@Module({
  providers: [MediaService, CloudinaryProvider],
  controllers: [MediaController],
  exports: [MediaService, CloudinaryProvider],
})
export class MediaModule {}
