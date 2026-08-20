import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RevenueVerificationService } from './revenue-verification.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './stripe.provider';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentsService, RevenueVerificationService, StripeProvider],
  controllers: [PaymentsController],
  exports: [PaymentsService, RevenueVerificationService],
})
export class PaymentsModule {}
