import { Module } from '@nestjs/common';
import { CeoControlController } from './ceo-control.controller';
import { CeoControlService } from './ceo-control.service';
import { DatabaseModule } from '../../database/database.module';
import { StripeConnectorService } from './connectors/stripe-connector.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CeoControlController],
  providers: [CeoControlService, StripeConnectorService],
  exports: [CeoControlService],
})
export class CeoControlModule {}
