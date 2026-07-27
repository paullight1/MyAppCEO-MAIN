import { describe, expect, it } from 'vitest';
import {
  getAdminNotificationCandidates,
  getEligiblePromotionalRecipients,
  type AdminNotificationRecipientUser,
} from '../src/utils/adminNotificationRecipients';

const USERS: AdminNotificationRecipientUser[] = [
  { id: '1', role: 'creator', status: 'active' },
  { id: '2', role: 'creator', status: 'pending' },
  { id: '3', role: 'admin', status: 'active' },
];

describe('admin notification recipients', () => {
  it('resolves raw recipients from the selected target', () => {
    expect(getAdminNotificationCandidates(USERS, { targetType: 'all' })).toHaveLength(3);
    expect(
      getAdminNotificationCandidates(USERS, {
        targetType: 'specific',
        selectedUserId: '2',
      }).map((user) => user.id),
    ).toEqual(['2']);
    expect(
      getAdminNotificationCandidates(USERS, {
        targetType: 'role',
        selectedRole: 'creator',
      }).map((user) => user.id),
    ).toEqual(['1', '2']);
    expect(
      getAdminNotificationCandidates(USERS, {
        targetType: 'status',
        selectedStatus: 'active',
      }).map((user) => user.id),
    ).toEqual(['1', '3']);
  });

  it('removes promotional opt-outs before send', () => {
    const eligible = getEligiblePromotionalRecipients(USERS, [
      { id: '1', notification_preferences: { marketingNotificationPreference: 'skip' } },
      { id: '2', notification_preferences: { marketingNotificationPreference: 'want' } },
    ]);

    expect(eligible.map((user) => user.id)).toEqual(['2', '3']);
  });
});
