import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  shouldIncludeNotification,
} from './notificationPreferences';

export type AdminNotificationTargetType = 'all' | 'specific' | 'role' | 'status' | 'segment';

export interface AdminNotificationTargetSelection {
  targetType: AdminNotificationTargetType;
  selectedUserId?: string;
  selectedRole?: string;
  selectedStatus?: string;
}

export interface AdminNotificationRecipientUser {
  id: string;
  role?: string;
  status?: string;
}

export interface AdminNotificationProfileRow {
  id: string;
  notification_preferences?: unknown;
}

export const getAdminNotificationCandidates = (
  users: AdminNotificationRecipientUser[],
  selection: AdminNotificationTargetSelection,
): AdminNotificationRecipientUser[] => {
  const { targetType, selectedUserId, selectedRole, selectedStatus } = selection;

  switch (targetType) {
    case 'all':
      return users;
    case 'specific':
      return users.filter((user) => user.id === selectedUserId);
    case 'role':
      return users.filter((user) => user.role === selectedRole);
    case 'status':
      return users.filter((user) => (user.status || 'active') === selectedStatus);
    default:
      return [];
  }
};

export const getEligiblePromotionalRecipients = (
  users: AdminNotificationRecipientUser[],
  profileRows: AdminNotificationProfileRow[],
): AdminNotificationRecipientUser[] => {
  const preferencesByUserId = new Map(
    profileRows.map((row) => [row.id, normalizeNotificationPreferences(row.notification_preferences)]),
  );

  return users.filter((user) =>
    shouldIncludeNotification(
      'promotional',
      preferencesByUserId.get(user.id) ?? DEFAULT_NOTIFICATION_PREFERENCES,
    ),
  );
};
