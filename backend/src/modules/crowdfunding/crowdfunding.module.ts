import { Module } from '@nestjs/common';
import { CrowdfundingController } from './crowdfunding.controller';
import { CrowdfundingService } from './crowdfunding.service';

@Module({
  controllers: [CrowdfundingController],
  providers: [CrowdfundingService],
  exports: [CrowdfundingService],
})
export class CrowdfundingModule {}