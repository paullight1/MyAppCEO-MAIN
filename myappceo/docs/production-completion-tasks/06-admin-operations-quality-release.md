# Admin, Operations, Quality, UX, And Release Readiness

## Parallel Ownership Boundary

Owned areas:
- `src/pages/AdminReviewQueuePage.tsx`
- `src/pages/AdminNotificationPage.tsx`
- `src/pages/AuditLogPage.tsx`
- `src/pages/DocumentationCenterPage.tsx`
- `src/pages/DevPortalPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AnalyticsPage.tsx`
- `src/pages/NotFoundPage.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/Layout.tsx`
- `src/components/DashboardLayout.tsx`
- `src/components/ui/*`
- `src/styles/*`
- `src/index.css`
- `src/compiled.css`
- `tailwind.config.js`
- `docs-mintlify/*`
- `docs/*`
- Admin/ops services and tables: admin review queue, audit log, platform notifications, settings, documentation, developer API keys, analytics summary, observability, error reporting, release configuration

Avoid editing:
- Feature-specific business logic owned by the other five task files. This stream may update shared UI components and layouts, but must coordinate before changing hook contracts or route behavior owned elsewhere.

## Goal

Make the platform operable and shippable: admin review, moderation, auditability, notifications, settings, documentation, developer tools, shared UI/UX polish, accessibility, performance, observability, testing, and release gates.

## Tasks

- [ ] Define admin roles for super admin, moderator, support agent, finance operator, and content reviewer.
- [ ] Hide admin routes from non-admin users at navigation and route-guard levels.
- [ ] Add admin permission checks to admin pages and backend endpoints.
- [ ] Replace any admin mock data with real API data or honest empty states.
- [ ] Complete admin listing review queue.
- [ ] Add review checklist for listing quality, ownership proof, revenue proof, transfer inclusions, legal concerns, and security concerns.
- [ ] Add approve, reject, request changes, and hold actions for listings.
- [ ] Add review feedback notes visible to sellers where appropriate.
- [ ] Add review assignment and status filters.
- [ ] Add moderation queue support for reported community content if backend exists.
- [ ] Add admin user lookup and support context if product requires it.
- [ ] Add audit log page backed by real audit records.
- [ ] Add filters for actor, action, entity type, date range, severity, and app/listing/campaign ID.
- [ ] Make audit log read-only in UI and protected in backend.
- [ ] Ensure all critical workflows emit audit events through their owning streams.
- [ ] Complete admin notification composer.
- [ ] Add notification targeting by all users, role, status, specific user, and segment if supported.
- [ ] Add scheduled send and draft support if required.
- [ ] Add notification preview from real payload.
- [ ] Add sent notification history from backend.
- [ ] Add delete/archive rules for sent notifications.
- [ ] Add settings persistence for profile, security, appearance, notification preferences, payout settings links, and connected-service controls.
- [ ] Add clear separation between local-only appearance settings and server-synced account settings.
- [ ] Add developer portal API key creation, display-once secret behavior, rotation, revocation, scopes, and usage stats.
- [ ] Add documentation center content from `docs-mintlify` or an agreed docs source.
- [ ] Fix docs route behavior so `/docs` redirects to the configured docs URL or in-app docs consistently.
- [ ] Add API reference links for listings, campaigns, escrow, and external API.
- [ ] Add support for environment-specific docs URL configuration.
- [ ] Add global error boundary logging to observability provider.
- [ ] Add user-friendly error pages for 404, 403, 500, backend unavailable, and maintenance mode.
- [ ] Add app-wide loading skeleton conventions.
- [ ] Standardize empty state components.
- [ ] Standardize form field errors, helper text, disabled states, and success states.
- [ ] Standardize modal behavior, focus trap, escape close, and scroll locking.
- [ ] Standardize table loading, empty, error, sort, filter, and pagination states.
- [ ] Standardize chart loading and empty states.
- [ ] Standardize toast/notification behavior.
- [ ] Run a full responsive pass across public, dashboard, admin, modal, table, and chart screens.
- [ ] Fix text overflow in buttons, cards, sidebars, tables, tabs, and mobile drawers.
- [ ] Verify dashboard sidebar collapse and mobile drawer behavior across all protected routes.
- [ ] Verify public layout navigation and footer links.
- [ ] Add accessible labels to icon-only buttons.
- [ ] Add keyboard navigation for menus, tabs, drawers, modals, and dropdowns.
- [ ] Add visible focus states.
- [ ] Add color contrast checks for light and dark modes.
- [ ] Add reduced-motion handling for animations.
- [ ] Add semantic headings and landmarks.
- [ ] Add ARIA only where native HTML is insufficient.
- [ ] Add performance budgets for bundle size, route chunk size, first load, interaction, and chart rendering.
- [ ] Audit lazy-loaded routes and shared chunks.
- [ ] Add error monitoring and source maps for production.
- [ ] Add analytics event naming standards.
- [ ] Add environment variable validation at startup/build time.
- [ ] Add production build checks for missing Supabase, API, payment, social, and docs configuration.
- [ ] Add security headers and CSP plan for deployment target.
- [ ] Add dependency vulnerability scan to CI.
- [ ] Add lint, TypeScript, unit, integration, and end-to-end test scripts to CI.
- [ ] Add smoke test for production build and preview.
- [ ] Add database migration verification command to release checklist.
- [ ] Add seed data strategy for demo/staging that cannot leak into production user accounts.
- [ ] Add feature flag strategy for incomplete providers.
- [ ] Add release checklist for staging sign-off, rollback, and incident contacts.
- [ ] Add production readiness scorecard that tracks all six workstreams to 100%.
- [ ] Add documentation for parallel workstream boundaries so future contributors avoid merge conflicts.
- [ ] Add final acceptance test matrix across roles: browser, seller, buyer, investor, app owner, co-founder, shareholder, creator, moderator, admin, support agent.

## Production Acceptance Criteria

- [ ] Admin users can review listings, inspect audit logs, and send platform notifications using real data.
- [ ] Non-admin users cannot see or access admin surfaces.
- [ ] Shared UI states are consistent across loading, empty, error, success, disabled, and mobile conditions.
- [ ] The app meets agreed accessibility, responsive, performance, security, and observability gates.
- [ ] CI blocks releases on lint, typecheck, tests, build, vulnerability, migration, and smoke-test failures.
- [ ] Release readiness is tracked by workstream without requiring teams to edit each other's files.

