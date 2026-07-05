# Phase 2 Implementation Notes

Date: 2026-05-16

## Implemented in this slice

- Added a route-backed Add My App flow at `/apps/new`.
- Updated dashboard and apps empty states to route users into `/apps/new`.
- Added owner setup actions on each app dashboard:
  - Invite co-founder
  - Cap table
  - Legal setup
  - Raise funding
- Added React route-level lazy loading for pages.
- Reduced the production JS entry chunk from about 1.95 MB to about 435 KB.

## Recommended next sequence

1. **Investor workflow hardening**
   - Move campaign creation, investment commitment, payment confirmation, and shareholder membership creation behind backend service-role endpoints.
   - Add a transaction-like finalization path that updates funding totals, investor count, cap table, and notifications together.

2. **Single ownership model**
   - Replace the split `app_coowners`, `app_members`, shareholder requests, and cap-table flows with one canonical backend ownership service.
   - Keep pending invitations separate from accepted ownership.

3. **App-linked funding**
   - Make `/campaigns/new?appId=:id` preload the managed app/listing context.
   - Store the campaign relationship against the app/listing so investors land back on the right app workspace.

4. **RLS and environment readiness**
   - Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the backend.
   - Verify policies for notifications, license applications, crowdfunding campaigns, investments, and ownership tables.

5. **Smoke tests**
   - Add Playwright coverage for sign in, add app, invite co-founder, create campaign, and invest.
