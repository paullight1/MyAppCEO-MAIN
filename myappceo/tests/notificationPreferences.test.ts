import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  applyMarketingNotificationPreference,
  normalizeNotificationPreferences,
  shouldIncludeNotification,
} from '../src/utils/notificationPreferences';

describe('notification preferences', () => {
  it('normalizes stored preferences without dropping defaults', () => {
    const next = normalizeNotificationPreferences({
      emailUpdates: false,
      pushReports: false,
      marketingNotificationPreference: 'want',
    });

    expect(next).toMatchObject({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      emailUpdates: false,
      pushReports: false,
      marketingNotificationPreference: 'want',
    });
  });

  it('applies marketing preference to offer toggles', () => {
    const want = applyMarketingNotificationPreference(DEFAULT_NOTIFICATION_PREFERENCES, 'want');
    const skip = applyMarketingNotificationPreference(DEFAULT_NOTIFICATION_PREFERENCES, 'skip');

    expect(want.emailOffers).toBe(true);
    expect(want.pushOffers).toBe(true);
    expect(want.marketingNotificationPreference).toBe('want');
    expect(skip.emailOffers).toBe(false);
    expect(skip.pushOffers).toBe(false);
    expect(skip.marketingNotificationPreference).toBe('skip');
  });

  it('suppresses promotional notifications when marketing is skipped', () => {
    expect(shouldIncludeNotification('promotional', { ...DEFAULT_NOTIFICATION_PREFERENCES, marketingNotificationPreference: 'skip' })).toBe(false);
    expect(shouldIncludeNotification('offer', { ...DEFAULT_NOTIFICATION_PREFERENCES, emailOffers: false, pushOffers: false })).toBe(false);
    expect(shouldIncludeNotification('announcement', { ...DEFAULT_NOTIFICATION_PREFERENCES, marketingNotificationPreference: 'skip' })).toBe(true);
  });
});
