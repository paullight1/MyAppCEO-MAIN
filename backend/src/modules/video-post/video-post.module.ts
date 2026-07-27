import { Module } from '@nestjs/common';
import { VideoPostController } from './video-post.controller';
import { VideoPostService } from './video-post.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VideoPostController],
  providers: [VideoPostService],
  exports: [VideoPostService],
})
export class VideoPostModule {}