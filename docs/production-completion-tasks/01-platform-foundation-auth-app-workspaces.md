# Platform Foundation, Auth, And App Workspaces

## Parallel Ownership Boundary

Owned areas:
- `src/hooks/useAuth.ts`
- `src/hooks/useUserApps.ts`
- `src/hooks/useUserStatus.ts`
- `src/hooks/useDashboardData.ts`
- `src/hooks/useAppRole.ts`
- `src/components/ProtectedRoute.tsx`
- `src/components/PermissionGuard.tsx`
- `src/components/AppOnboardingWizard.tsx`
- `src/components/AppLifecycleTracker.tsx`
- `src/pages/AuthPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/AppsPage.tsx`
- `src/pages/AppIntakePage.tsx`
- `src/pages/AppDashboardPage.tsx`
- Workspace membership tables and policies: `app_members`, `user_profiles`, app/workspace creation tables

Avoid editing:
- Marketplace listing, offer, escrow, payment, campaign, finance, legal, promotion, community, notification, PRD, design, generation, admin, and docs routes except for read-only integration checks.

## Goal

Make sign-up, sign-in, onboarding, app import, app workspace creation, role-aware navigation, and dashboard data production-ready with real persistence, real permissions, clear empty states, and no demo-only success paths.

## Tasks

- [ ] Confirm the canonical app/workspace data model.
- [ ] Decide whether `app_members`, `app_coowners`, or a dedicated app workspace table owns app membership.
- [ ] Document the chosen relationship between an app workspace, a marketplace listing, an imported store app, and an idea-generated app.
- [ ] Add or update migrations so app workspace creation is database-backed and repeatable.
- [ ] Add row-level security policies for app workspaces and membership records.
- [ ] Add owner, co-founder, shareholder, prospective, admin, and support role access tests.
- [ ] Replace UI-only app onboarding with a persisted create/import flow.
- [ ] Make `AppOnboardingWizard` create or attach a real app workspace.
- [ ] Make `AppOnboardingWizard` insert the owner membership row.
- [ ] Make `AppOnboardingWizard` store imported App Store or Google Play metadata when available.
- [ ] Make onboarding navigate to `/apps/:id/dashboard` only after persistence succeeds.
- [ ] Add actionable failure states for backend unavailable, duplicate app, invalid URL, provider unavailable, and permission denied.
- [ ] Replace any hardcoded onboarding success message with a real server response.
- [ ] Replace `AppLifecycleTracker` mock project data with selected app progress data.
- [ ] Show an empty lifecycle state for apps without initialized phases.
- [ ] Add a "continue setup" checklist only when a real app has incomplete required setup.
- [ ] Make `/apps` the canonical page for all user-managed apps.
- [ ] Separate owner apps, co-founder apps, shareholder apps, and watch-only apps in the app list.
- [ ] Add app list filtering by role, status, category, and setup completeness.
- [ ] Add app list loading skeletons and empty states.
- [ ] Add dashboard cards that only use real API or Supabase data.
- [ ] Remove dashboard cards that imply fake revenue, fake app count, fake campaigns, or fake lifecycle state.
- [ ] Make dashboard quick actions role-aware.
- [ ] Hide admin-only navigation items from non-admin users.
- [ ] Add permission checks before protected route render, not only inside pages.
- [ ] Ensure unauthenticated users are redirected back to their original destination after login.
- [ ] Add refresh-token and expired-session handling.
- [ ] Add profile completion flow for users missing full name, role, or avatar.
- [ ] Make profile/verification state visible in the dashboard.
- [ ] Add account status states for active, suspended, pending verification, and deleted.
- [ ] Add user-facing copy for unavailable integrations without exposing stack traces.
- [ ] Add typed API response handling for all foundation hooks.
- [ ] Remove duplicate direct Supabase reads when a backend endpoint is the source of truth.
- [ ] Keep direct Supabase reads only where RLS is verified and the table is explicitly frontend-owned.
- [ ] Add app/workspace creation idempotency so repeated submits do not create duplicates.
- [ ] Add audit-log writes for app creation, app import, role change, and onboarding completion.
- [ ] Add telemetry events for sign-up, sign-in, app import started, app import completed, workspace created, and onboarding abandoned.
- [ ] Add unit tests for auth guards and permission gates.
- [ ] Add integration tests for app onboarding persistence.
- [ ] Add end-to-end tests for first-run founder flow.
- [ ] Add end-to-end tests for returning-user dashboard flow.
- [ ] Add responsive QA for `/auth`, `/dashboard`, `/apps`, `/apps/new`, and `/apps/:id/dashboard`.
- [ ] Add accessibility checks for forms, errors, focus states, keyboard navigation, and mobile drawer behavior.

## Production Acceptance Criteria

- [ ] A new founder can create an account, add/import an app, and land on a real app dashboard in under 2 minutes.
- [ ] No success message appears before a database write succeeds.
- [ ] A user cannot view or edit an app workspace without a valid role.
- [ ] A brand-new empty account shows empty states, not demo business data.
- [ ] A signed-out user can browse public areas but cannot access protected workspace routes.
- [ ] Dashboard and app workspace screens pass mobile, tablet, and desktop visual checks.
- [ ] Tests cover auth redirects, app creation, role checks, and dashboard empty states.

