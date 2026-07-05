# Code Findings

## P0 blockers

### 1. Add My App is UI-only

Evidence:

- `src/components/AppOnboardingWizard.tsx` has `handleSubmit` that sets loading, waits 1.5 seconds, then calls `setStep(5)`.
- The wizard does not call `apiPost`, `supabase.from`, or a mutation hook.
- `src/hooks/useUserApps.ts` reads from `app_members` joined to `listings`, so the app list cannot reflect wizard submissions.

Impact:

Users can believe an app was added while the database remains unchanged. This breaks the main phase-1 launch promise.

Required fix:

Create one canonical endpoint, for example `POST /api/v1/apps`, that:

- Creates a managed app workspace.
- Creates or attaches a listing record if needed.
- Inserts an owner membership row.
- Stores imported store metadata.
- Returns `{ appId, listingId }`.
- Navigates the user to `/apps/:appId/dashboard`.

### 2. Ownership and team data is split

Evidence:

- `src/hooks/useUserApps.ts` reads `app_members`.
- `src/hooks/useAppRole.ts` reads and writes `app_members`.
- `src/hooks/useTeamManagement.ts` reads and writes `app_coowners`.
- `src/components/modals/CofounderInviteModal.tsx` inserts directly into `app_coowners`.
- `src/hooks/useDevelopment.ts` uses `/development/apps/:appId/team`, which maps to a separate development team concept.

Impact:

Co-founders invited in one surface may not appear in another. Permissions, equity, cap table, and dashboard app counts can drift.

Required fix:

Choose one phase-1 ownership source of truth. Recommended:

- `app_members` for user-to-app role membership.
- `cap_table_entries` for ownership/equity ledger.
- `app_invitations` for pending email invites.

Then retire or migrate `app_coowners` and development `app_team_members` for the phase-1 owner/co-founder workflow.

### 3. Investor flow has a broken function call

Evidence:

- `src/pages/CampaignInvestPage.tsx` destructures `invest` from `useCrowdfunding`.
- `src/hooks/useCrowdfundingSupabase.ts` exposes `commitInvestment` and `confirmInvestment`, not `invest`.
- `confirmInvestment` only updates `investment_commitments`; it does not update campaign totals or create shareholder/cap-table records.

Impact:

The invest action can fail at runtime, and even if patched, investor ownership is not reflected in the app workspace.

Required fix:

Implement a transactional investment finalization path:

1. Create pending commitment.
2. Run payment/KYC checks.
3. Confirm payment.
4. Increment `funding_raised` and `current_investor_count`.
5. Insert shareholder membership.
6. Insert or update cap table entry.
7. Emit investor/founder notifications.

### 4. Backend listing mutations need ownership checks

Evidence:

- `../MVPLAB_BACKEND/src/modules/marketplace/listing.controller.ts` protects status and delete routes with auth.
- `../MVPLAB_BACKEND/src/modules/marketplace/listing.service.ts` `updateStatus` and `remove` do not compare `sellerId` with current user.
- `updatePricing` does check ownership, which should be the pattern for the other mutations.

Impact:

Any authenticated user could potentially update status or delete another listing if they know the ID.

Required fix:

Pass `user.id` into status/delete service methods and enforce owner/admin authorization before mutation.

### 5. Listing edit endpoint mismatch

Evidence:

- `src/hooks/useMarketplace.ts` calls `PATCH /listings/:id`.
- Backend exposes `PATCH /listings/:id/pricing`.

Impact:

Edit listing save can fail even when authenticated.

Required fix:

Either add a backend `PATCH /listings/:id` full update endpoint or update the frontend hook to use the implemented endpoint and DTO.

## P1 functional gaps

### App Store and Play Store import

Apple import uses the public iTunes lookup API. Google Play full metadata depends on `GOOGLE_PLAY_CATALOG_API_URL`; without it the backend returns a configuration error and frontend falls back to package-name-only metadata.

Phase-1 requirement:

- Apple lookup can ship if tested.
- Google Play needs an approved catalog provider or a reliable internal metadata service before production claims of full import.

### Legal licenses

The UI now has license cards and forms, but `useLegalLicenses` still queries `license_types` and `user_license_applications`. Prior console evidence showed 403 errors for `license_types`, so RLS/grants need verification.

### Notifications

`useNotifications` and `NotificationPopup` query `notifications` directly. Prior console evidence showed 403 permission errors. This should be either fixed with RLS policies or routed through an authenticated backend service.

### Mock/static areas remaining

Code search still finds these launch risks:

- `src/components/AppLifecycleTracker.tsx` uses `MOCK_ACTIVE_PROJECT`.
- `src/pages/CreatorMarketplacePage.tsx` uses `MOCK_CREATORS`.
- `src/pages/CreatorsPage.tsx` uses `MOCK_CAMPAIGNS`.
- `src/components/RecentActivity.tsx` has static activity messages.
- `src/components/QuickActions.tsx` is static and should be role-aware.
- `src/components/modals/LicenseApplicationModal.tsx` persists applications to localStorage.
- `src/hooks/useWatchlist.ts` and `src/pages/BrowseCampaignsPage.tsx` use localStorage-only watchlists.

Some localStorage usage is fine for preferences such as theme or dismissed hints. It is not enough for launch-critical business records.

## Security and Supabase findings

Supabase's RLS guidance says RLS should always be enabled on exposed-schema tables and policies should explicitly match the access model. Current code depends on many direct Supabase calls from the browser:

- `app_members`
- `app_coowners`
- `app_shareholder_offers`
- `app_shareholder_requests`
- `cap_table_entries`
- `crowdfunding_campaigns`
- `investment_commitments`
- `license_types`
- `notifications`

Before launch, each table needs:

- Existence verified in the active Supabase project.
- API exposure/grants verified.
- RLS enabled.
- Select/insert/update/delete policies tested with anon and authenticated users.
- Owner/admin policy tests for cross-user access.

For sensitive operations such as investment confirmation, ownership transfer, or cap-table mutation, use backend service-role code with explicit authorization rather than client-side direct table writes.

