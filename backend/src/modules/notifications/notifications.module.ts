import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RolesGuard } from '../admin/guards/roles.guard';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RolesGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
