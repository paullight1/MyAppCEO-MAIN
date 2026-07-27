# Phase 1 Launch Task List

## P0: Required before launch

- [ ] Build canonical app creation endpoint.
  - Owner: Backend + frontend.
  - Files likely involved: `AppOnboardingWizard.tsx`, `apiClient.ts`, backend app/listing modules, Supabase migrations.
  - Acceptance: adding an app creates a persisted workspace, owner membership, and dashboard app card.

- [ ] Unify app ownership model.
  - Owner: Backend/database.
  - Acceptance: owner, co-founder, shareholder, and prospective roles are represented in one membership model and all UI reads the same source.

- [ ] Add phase-1 app membership and cap-table migrations.
  - Owner: Database.
  - Acceptance: tables exist, RLS is enabled, policies cover owner/co-founder/shareholder/prospective access, and browser queries no longer 403.

- [ ] Fix co-founder invitation flow.
  - Owner: Frontend + database.
  - Acceptance: invite by email creates a pending invitation, accepting creates active membership, equity proposal is reflected in cap table or pending equity split.

- [ ] Fix investor commit flow.
  - Owner: Backend + frontend.
  - Acceptance: investment action creates a commitment, payment confirmation updates campaign totals, shareholder membership, cap table, and notifications atomically.

- [ ] Fix `CampaignInvestPage` API mismatch.
  - Owner: Frontend.
  - Acceptance: page calls implemented hook functions and handles pending/paid/failed states.

- [ ] Enforce listing ownership on backend mutations.
  - Owner: Backend.
  - Acceptance: status/delete/update requests reject non-owners unless admin.

- [ ] Fix listing edit endpoint mismatch.
  - Owner: Backend + frontend.
  - Acceptance: edit listing page saves against the implemented endpoint with validation.

- [ ] Fix Supabase permission errors.
  - Owner: Database.
  - Acceptance: `notifications`, `license_types`, `crowdfunding_campaigns`, and app ownership tables work for the intended roles and fail for unauthorized users.

- [ ] Repair lint pipeline.
  - Owner: Frontend.
  - Acceptance: `npm run lint` runs successfully under ESLint 9 or package pins compatible ESLint/config.

## P1: Needed for a credible beta

- [ ] Add `/apps/new` route or globally reusable Add My App launcher.
  - Acceptance: dashboard, `/apps`, and empty states all open the same persistent app intake flow.

- [ ] Normalize owner route structure.
  - Acceptance: owner management uses `/apps/:id/*`; public marketplace views use `/listings/:id` or another clearly public route.

- [ ] Add founder-specific funding CTA.
  - Acceptance: app dashboard and dashboard expose "Raise Funding" for owners and co-founders.

- [ ] Configure Google Play import provider.
  - Acceptance: Google Play URL import fetches app name, icon, developer, category, screenshots, rating, and store URL without relying on package-name fallback.

- [ ] Replace mock creator/promotion data.
  - Acceptance: creator marketplace and promotion hub show empty states or real data, not static demo campaigns/creators.

- [ ] Persist legal applications.
  - Acceptance: legal applications are stored in Supabase or backend, not localStorage.

- [ ] Add notifications backend/RLS tests.
  - Acceptance: unread notifications, read status, and realtime subscription work for the logged-in user only.

- [ ] Add route-level code splitting.
  - Acceptance: initial JS chunk is materially reduced and heavy pages are dynamically imported.

## P2: Hardening and iteration

- [ ] Add analytics events for the app intake funnel.
- [ ] Add owner/co-founder onboarding checklist in each app dashboard.
- [ ] Add audit log entries for app creation, team invitation, equity changes, listing changes, and investment confirmation.
- [ ] Add KYC provider spike and vendor choice.
- [ ] Add e2e smoke tests for sign in, add app, invite co-founder, create campaign, invest, and legal application.
- [ ] Add production error tracking and frontend performance monitoring.

