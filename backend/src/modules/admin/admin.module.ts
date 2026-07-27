import { Module } from '@nestjs/common';
import { AdminSyncController } from './admin-sync.controller';
import { ModerationController } from './moderation.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { ModerationService } from './services/moderation.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { AuditLogService } from './services/audit-log.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [
    AdminSyncController,
    ModerationController,
    AdminNotificationsController,
  ],
  providers: [
    ModerationService,
    AdminNotificationsService,
    AuditLogService,
    RolesGuard,
  ],
  exports: [ModerationService, AuditLogService, RolesGuard],
})
export class AdminModule {}
