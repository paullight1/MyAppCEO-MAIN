import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './stripe.provider';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentsService, StripeProvider],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
