# Growth, Social Automation, Community, Notifications, And Support

## Parallel Ownership Boundary

Owned areas:
- `src/hooks/useSocialAutomation.ts`
- `src/hooks/usePromotionAnalytics.ts`
- `src/hooks/usePromotionBudget.ts`
- `src/hooks/useCreators.ts`
- `src/hooks/useScheduler.ts`
- `src/hooks/useVideoPost.ts`
- `src/hooks/useCommunity.ts`
- `src/hooks/useMessages.ts`
- `src/hooks/useNotifications.ts`
- `src/components/SocialHubLayout.tsx`
- `src/components/CreateRuleModal.tsx`
- `src/components/RuleCard.tsx`
- `src/components/AutomationBuilderModal.tsx`
- `src/components/SchedulePostModal.tsx`
- `src/components/VideoUploadModal.tsx`
- `src/components/CampaignPerformanceTable.tsx`
- `src/components/AppPerformanceTable.tsx`
- `src/components/CreatorLeaderboard.tsx`
- `src/components/NotificationDropdown.tsx`
- `src/components/NotificationPopup.tsx`
- `src/pages/PromotionHubPage.tsx`
- `src/pages/CreatorMarketplacePage.tsx`
- `src/pages/CreatorsPage.tsx`
- `src/pages/PromotionAnalyticsPage.tsx`
- `src/pages/SocialAutomationPage.tsx`
- `src/pages/CommunityPage.tsx`
- `src/pages/TopicDetailPage.tsx`
- `src/pages/CommunityProfilePage.tsx`
- `src/pages/CommunityStarsPage.tsx`
- `src/pages/SupportPage.tsx`
- Growth/community/notification tables and services: social accounts, OAuth callbacks, scheduled posts, social automations, creator profiles, UGC content, promotion analytics, promotion budgets, community topics, comments, profiles, messages, notifications, support requests

Avoid editing:
- Core app onboarding, marketplace purchase/escrow, campaign investment/cap table/legal/finance, PRD/generation/lifecycle, and admin moderation queue internals.

## Goal

Move growth, creator marketplace, social automation, community, notifications, and support from demo/mock surfaces to real connected workflows with production persistence, provider handling, analytics, moderation hooks, and trustworthy empty states.

## Tasks

- [ ] Replace `CreatorMarketplacePage` `MOCK_CREATORS` with real creator API data.
- [ ] Replace `CreatorsPage` mock campaigns with real creator campaign or UGC data.
- [ ] Replace `usePromotionAnalytics` mock initial state with `null`, loading states, empty states, or real API responses.
- [ ] Add promotion analytics endpoint contracts for overview, campaigns, creators, apps, and time series.
- [ ] Add promotion analytics date range filtering on the backend.
- [ ] Add app-level promotion health status from real spend, revenue, conversions, and ROI.
- [ ] Add campaign performance actions for pause, resume, inspect, and archive if backend supports them.
- [ ] Add promotion budget rules, thresholds, alerts, and real persistence.
- [ ] Add creator profile search, filtering by platform, niche, rate, availability, and creator score.
- [ ] Add creator profile detail page or modal.
- [ ] Add creator portfolio creation and edit flow.
- [ ] Add UGC submission upload flow.
- [ ] Add UGC review statuses for pending, approved, rejected, revision requested, delivered, and paid.
- [ ] Add UGC content approval notifications.
- [ ] Add creator hiring request persistence and status transitions.
- [ ] Add creator hiring escrow/payment handoff only as an API link, without editing escrow implementation.
- [ ] Add video upload validation for format, size, duration, and caption.
- [ ] Add social account OAuth connection for Meta, TikTok, and X.
- [ ] Persist connected accounts by app and platform.
- [ ] Add disconnect flow using the correct HTTP method and endpoint.
- [ ] Add expired token and reauth states for connected social accounts.
- [ ] Add social account permissions and scopes display.
- [ ] Replace social hub mock connection counts with real connected account counts.
- [ ] Add scheduled post create, edit, cancel, and publish-now flows.
- [ ] Add calendar view backed by scheduled post data.
- [ ] Add recurring post rule validation.
- [ ] Add post media upload and preview.
- [ ] Add platform-specific post length and media constraints.
- [ ] Add publish failure reasons and retry actions.
- [ ] Add automation rule persistence for triggers and actions.
- [ ] Add automation builder validation for keyword, new follower, mention, hashtag, reply, tag, and HTTP request blocks.
- [ ] Add automation simulation using real backend rules.
- [ ] Add automation execution logs.
- [ ] Add active, paused, failed, and draft automation states.
- [ ] Add safe secret handling for HTTP request automation credentials.
- [ ] Add community topic persistence from real hooks.
- [ ] Replace hardcoded community tabs with database-backed categories.
- [ ] Add topic creation, edit, delete, pin, lock, and report flows if required.
- [ ] Add comments and replies on topic detail pages.
- [ ] Add voting/reaction support if product requires it.
- [ ] Add community profile stats from real data.
- [ ] Add reputation calculations and badge thresholds from backend values.
- [ ] Add Community Stars leaderboard from real reputation data.
- [ ] Add community moderation hooks for reported content without editing admin moderation UI.
- [ ] Add message or direct contact flow if `useMessages` is intended for support/community.
- [ ] Add notification preferences persistence beyond localStorage where cross-device behavior matters.
- [ ] Keep localStorage only for non-critical dismissed hints/popups.
- [ ] Add notification read/unread, mark all read, and delete/archive flows.
- [ ] Add real-time notification subscription if supported.
- [ ] Add support request creation from `SupportPage`.
- [ ] Add support categories, priority, attachments, status, and conversation thread.
- [ ] Add support SLA and escalation metadata if required.
- [ ] Add audit/analytics events for creator hire, social connect, post schedule, automation creation, community post, support ticket, and notification open.
- [ ] Add unit tests for promotion analytics formatters, automation validation, notification preferences, and community reputation helpers.
- [ ] Add integration tests for social OAuth callbacks, scheduled posts, automation simulation, community topics/comments, notifications, and support tickets.
- [ ] Add end-to-end tests for connect social account, schedule post, create automation, hire creator, browse community, comment on topic, and submit support ticket.
- [ ] Add responsive QA for promotion hub, creator marketplace, promotion analytics, social hub, community, community profile, stars, and support pages.
- [ ] Add accessibility checks for calendars, modals, social account cards, community composer, comment forms, notification dropdown, and support forms.

## Production Acceptance Criteria

- [ ] Growth and community pages no longer display hardcoded campaign, creator, analytics, or community content as real user data.
- [ ] Social accounts connect through real OAuth and recover cleanly from expired tokens.
- [ ] Scheduled posts, automations, creators, UGC, community topics, comments, notifications, and support tickets persist in production storage.
- [ ] Users see honest empty states when no growth/community data exists.
- [ ] Provider failures show actionable UI without breaking the workspace.
- [ ] Growth, community, notification, and support flows pass API, provider-state, UI, and end-to-end tests.

