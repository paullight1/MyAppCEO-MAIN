export type MarketingNotificationPreference = 'have' | 'want' | 'skip';

export const MARKETING_NOTIFICATION_OPTIONS = [
  {
    id: 'have',
    label: 'Already have them',
    description: 'You already have launch or marketing notifications configured.',
  },
  {
    id: 'want',
    label: 'I want them',
    description: 'Send me launch, growth, and promotional notifications.',
  },
  {
    id: 'skip',
    label: 'Not now',
    description: 'Skip marketing notifications for this app for now.',
  },
] as const;

export interface NotificationPreferences {
  emailOffers: boolean;
  emailUpdates: boolean;
  emailReports: boolean;
  pushOffers: boolean;
  pushUpdates: boolean;
  pushReports: boolean;
  marketingNotificationPreference?: MarketingNotificationPreference;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailOffers: true,
  emailUpdates: true,
  emailReports: false,
  pushOffers: true,
  pushUpdates: false,
  pushReports: true,
};

const isMarketingNotificationPreference = (value: unknown): value is MarketingNotificationPreference =>
  value === 'have' || value === 'want' || value === 'skip';

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeNotificationPreferences = (value: unknown): NotificationPreferences => {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    emailOffers: toBoolean(raw.emailOffers, DEFAULT_NOTIFICATION_PREFERENCES.emailOffers),
    emailUpdates: toBoolean(raw.emailUpdates, DEFAULT_NOTIFICATION_PREFERENCES.emailUpdates),
    emailReports: toBoolean(raw.emailReports, DEFAULT_NOTIFICATION_PREFERENCES.emailReports),
    pushOffers: toBoolean(raw.pushOffers, DEFAULT_NOTIFICATION_PREFERENCES.pushOffers),
    pushUpdates: toBoolean(raw.pushUpdates, DEFAULT_NOTIFICATION_PREFERENCES.pushUpdates),
    pushReports: toBoolean(raw.pushReports, DEFAULT_NOTIFICATION_PREFERENCES.pushReports),
    marketingNotificationPreference: isMarketingNotificationPreference(raw.marketingNotificationPreference)
      ? raw.marketingNotificationPreference
      : undefined,
  };
};

export const applyMarketingNotificationPreference = (
  current: NotificationPreferences,
  preference: MarketingNotificationPreference,
): NotificationPreferences => {
  const next = {
    ...current,
    marketingNotificationPreference: preference,
  };

  if (preference === 'want') {
    return {
      ...next,
      emailOffers: true,
      pushOffers: true,
    };
  }

  if (preference === 'skip') {
    return {
      ...next,
      emailOffers: false,
      pushOffers: false,
    };
  }

  return next;
};

export const shouldIncludeNotification = (
  notificationType: string | null | undefined,
  preferences: NotificationPreferences,
): boolean => {
  if (notificationType === 'offer') {
    return preferences.emailOffers || preferences.pushOffers;
  }

  if (notificationType === 'promotional') {
    return preferences.marketingNotificationPreference !== 'skip';
  }

  return true;
};
