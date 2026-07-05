# Phase 3 Implementation Notes

Date: 2026-05-16

## Completed in this phase

- Campaign creation now supports `appId` so an owner can raise funding for a managed app.
- Backend campaign creation validates that the authenticated user owns the linked app.
- Frontend campaign creation reads `/campaigns/new?appId=...`, preloads the app context, and submits `appId`.
- Investment commitment and confirmation now route through backend crowdfunding endpoints instead of direct Supabase writes.
- Confirmed investments for app-linked campaigns now create or update a `shareholder` ownership record in `app_coowners`.
- The user app list now separates shareholder apps from cofounder apps.
- Stripe is optional in local/dev mode: when no Stripe key exists, investment intent creation returns a simulated payment intent for development verification.

## Verification

- `npm run test -- crowdfunding.service.spec.ts --runInBand` passed in `apps/MVPLAB_BACKEND`.
- `npm run test -- --runInBand` passed in `apps/MVPLAB_BACKEND`.
- `npm run build` passed in `apps/MVPLAB_BACKEND`.
- `npm run build` passed in `apps/MyAppCEO`.

## Remaining production gaps

- Simulated payment confirmation must be disabled or guarded in production before launch.
- Stripe webhook finalization should become the canonical investment confirmation path.
- Cap table rows are still not written to a dedicated cap-table table; shareholder state currently uses `app_coowners`.
- Investor-facing campaign pages should show richer linked app context: app URL, store links, traction, team, risk terms, use of funds, and legal entity.
- Campaign listing/read endpoints are still partly mixed between Supabase direct reads and backend REST reads.

## Recommended next phase

Phase 4 should focus on production investment reliability:

1. Add Stripe webhook finalization with idempotent commitment confirmation.
2. Add a dedicated investment ownership ledger or cap-table entry table tied to `investment_commitments`.
3. Expose backend read endpoints for campaign listings, my campaigns, campaign details, and investor portfolio.
4. Replace remaining direct Supabase campaign reads in the frontend with backend API calls.
5. Add launch checks for payment configuration so production cannot run in simulated-payment mode.
