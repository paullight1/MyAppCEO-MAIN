import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class MarketplaceModule {}
