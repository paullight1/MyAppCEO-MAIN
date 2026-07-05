# MyAppCEO Production Readiness Audit

Date: 2026-05-16

## Launch Goal

Phase 1 launch should let a user:

1. Add an existing live or in-production app.
2. Import public app metadata from website, Play Store, App Store, and other public listings.
3. Manage founders, co-founders, shareholders, documents, legal, and app operations from one workspace.
4. Create app-linked fundraising campaigns.
5. Let investors pay through Paystack and receive a recorded ownership position.

## Readiness Scores

| Area | Score | Status |
| --- | ---: | --- |
| Add existing app intake | 72/100 | Usable path exists, but import/provider reliability and transactional creation need hardening. |
| App store metadata import | 58/100 | Backend external-app service exists; UX button exists. Needs end-to-end provider verification and clearer failure states. |
| Founder/co-founder management | 68/100 | Backend co-owner APIs exist. Equity validation, invite uniqueness, and role protection need tightening. |
| Investor + Paystack flow | 61/100 | Happy path exists. Idempotency, provider-neutral schema, and payout/escrow ledger are P0 before production money. |
| App ownership/cap table | 45/100 | Shareholder membership is recorded, but no durable cap-table ledger tied to investment commitments. |
| Dashboard UX/navigation | 76/100 | Much improved; still needs stronger app workspace shortcuts and fewer duplicated entry points. |
| Promotion/growth features | 35/100 | Several pages still depend on empty or mock analytics/budget/provider integrations. |
| Legal/licensing | 64/100 | Static Nigeria license content is useful. Needs real application persistence/workflow and verified logo assets. |
| Notifications | 40/100 | Direct Supabase reads can 403. Needs backend API or RLS policy fix. |
| Overall phase-1 launch readiness | 61/100 | Good prototype with real core paths, but payment/idempotency and mock-data removal remain launch blockers. |

## P0 Launch Blockers

1. **Payment finalization must be atomic and idempotent.**
   - Current: `finalizePaidCommitment()` updates status, campaign totals, escrow totals, and shareholder membership sequentially.
   - Risk: Paystack callback and webhook can both finalize the same commitment and double-count funding/equity.
   - Code: `apps/MVPLAB_BACKEND/src/modules/crowdfunding/crowdfunding.service.ts`
   - Required:
     - Add provider-neutral payment columns.
     - Add a unique payment-reference index.
     - Wrap finalization in a database transaction.
     - Only run side effects after an atomic `pending/processing -> paid` transition succeeds.

2. **Create a real cap-table / ownership ledger.**
   - Current: investor ownership is written into `app_coowners` with role `shareholder`.
   - Risk: co-founder roles can be overwritten; no immutable investment ownership record exists.
   - Required:
     - Add `app_investment_holdings` or `cap_table_entries` tied to `investment_commitments.id`.
     - Keep `app_coowners` focused on team/access roles.

3. **Remove or gate all fake production data.**
   - Fixed now: promotion analytics hook no longer starts with fake campaign/app metrics.
   - Remaining:
     - `AppDetailPage` still uses mock analytics arrays.
     - `AppLifecycleTracker` still tracks `HealthSync AI`.
     - creator/promotion pages still include demo campaigns/creators.

4. **Replace direct Supabase writes for launch-critical ownership and campaign flows.**
   - Current direct Supabase paths remain in:
     - `src/hooks/useCrowdfundingSupabase.ts`
     - `src/hooks/useShareholderSystem.ts`
     - `src/hooks/useCapTable.ts`
     - notification hooks/components
   - Required: move these to backend APIs with server-side validation and consistent authorization.

## P1 Functional Gaps

1. **Paystack reference verification**
   - Immediate guard added: production fails when `PAYSTACK_SECRET_KEY` is missing, and confirmation rejects references that do not match the stored commitment reference.
   - Still needed: verify currency, exact amount, Paystack metadata commitmentId/campaignId/investorId, and customer email.

2. **App import end-to-end**
   - Need a Play Store provider or documented scraper/proxy approach.
   - Need a single import result model that maps store data into app name, icon, category, website, store URLs, description, screenshots, ratings, installs, version, developer, and privacy URL.
   - Need “manual review before save” so imported metadata does not silently overwrite user-entered fields.

3. **Promotion Hub**
   - Campaign creation/listing can be functional, but analytics, budget, wallet, creator discovery, and paid promotion execution are not production-ready.
   - Recommended providers:
     - Meta Marketing API
     - TikTok Business API
     - Google Ads API
     - Firebase / GA4
     - AppsFlyer or Adjust for attribution

4. **Legal applications**
   - Static license cards are useful for discovery.
   - Need application persistence, file upload, status tracking, regulator-specific checklist, and admin review.

5. **Finances**
   - Frontend calls `/finances/dashboard`; backend failures were seen as 500 in browser.
   - Need backend diagnostics and empty-state fallback for new users.

## Recommended Implementation Phases

### Phase A: Money Safety

- Add `payment_provider`, `payment_reference`, `provider_transaction_id`, `payment_verified_at`, and `payment_finalized_at` to `investment_commitments`.
- Add unique index on `(payment_provider, payment_reference)` where reference is not null.
- Implement `PaymentFinalizationService`.
- Add tests for duplicate webhook, callback/webhook race, mismatched amount, mismatched currency, and mismatched metadata.

### Phase B: Ownership Ledger

- Add `app_investment_holdings` or formal `cap_table_entries`.
- Finalize Paystack investments into the ledger.
- Build app detail ownership tab from backend ledger data.
- Add founder/co-founder invite constraints and total equity validation.

### Phase C: App Workspace Completion

- Make “Add My App” save app + listing transactionally.
- Verify app import from App Store, Play Store, website metadata, and GitHub.
- Add imported metadata preview and conflict resolution.
- Make the dashboard’s app list the primary route to app details.

### Phase D: Remove Mock Surfaces

- Replace app detail mock analytics with empty states and future provider cards.
- Replace creator/promote demo content with real API-backed empty states.
- Remove hardcoded lifecycle project or bind it to a selected real app.

### Phase E: Growth, Legal, and Admin

- Persist legal application forms.
- Add promotion provider connection status per app.
- Add notification backend API or fix RLS.
- Add admin review queues for apps, campaigns, legal applications, and reported payment issues.

## Immediate Changes Made In This Pass

- Removed fake initial promotion analytics data from `src/hooks/usePromotionAnalytics.ts`.
- Added Paystack production guard and mismatched-reference guard in `apps/MVPLAB_BACKEND/src/modules/crowdfunding/crowdfunding.service.ts`.
- Added sequential duplicate finalization guard in `finalizePaidCommitment()` as a short-term protection.
- Added a frontend Paystack callback fallback in `src/pages/CampaignInvestPage.tsx` so the page accepts `reference` or `trxref` and can recover the pending commitment ID from session storage after redirect.

The duplicate finalization guard is not a substitute for a transaction plus database-level idempotency index. Treat the transaction/index work as mandatory before accepting real funds.
