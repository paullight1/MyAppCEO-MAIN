# Marketplace, Listings, Offers, Escrow, And Payments

## Parallel Ownership Boundary

Owned areas:
- `src/hooks/useMarketplace.ts`
- `src/hooks/useOffers.ts`
- `src/hooks/useEscrow.ts`
- `src/hooks/usePayments.ts`
- `src/hooks/useWatchlist.ts`
- `src/components/ListingCard.tsx`
- `src/components/OfferModal.tsx`
- `src/components/CounterOfferModal.tsx`
- `src/components/OffersTable.tsx`
- `src/pages/MarketplacePage.tsx`
- `src/pages/BrowsePage.tsx`
- `src/pages/ListingDetailPage.tsx`
- `src/pages/CreateListingPage.tsx`
- `src/pages/EditListingPage.tsx`
- `src/pages/ManageListingsPage.tsx`
- `src/pages/WatchlistPage.tsx`
- `src/pages/EscrowDashboardPage.tsx`
- `src/pages/EscrowDealDetailPage.tsx`
- `src/pages/EscrowDetailPage.tsx`
- Marketplace tables and services: `listings`, `listing_views`, `favorites`, `offers`, `escrow_deals`, `escrow_milestones`, `transfer_items`, marketplace media uploads, payment onboarding for sellers

Avoid editing:
- Campaign/investor ownership, cap table, legal licenses, app workspace creation, AI generation, social/community/admin notification features, except where they link to listing IDs.

## Goal

Make the app marketplace production-ready from listing creation through discovery, offers, escrow, secure transfer, seller payout readiness, and saved listings.

## Tasks

- [ ] Align frontend listing routes with backend listing routes.
- [ ] Fix listing edit endpoint mismatch between `PATCH /listings/:id` and any backend pricing-only endpoint.
- [ ] Add ownership checks to every listing mutation endpoint.
- [x] Add RLS policies for listing draft, pending review, active, paused, sold, and rejected states.
- [ ] Convert the create listing wizard from partial flow to the full production flow.
- [ ] Add dedicated listing type step for sale, investment, or both.
- [ ] Add preview and submit step with marketplace terms acceptance.
- [x] Store listing terms acceptance with user ID, timestamp, and policy version.
- [ ] Validate listing category, app URLs, store URLs, asking price, minimum offer, target raise, equity available, app age, and financial metrics.
- [ ] Add server-side validation for all listing fields.
- [ ] Support cover image upload validation for aspect ratio and minimum size.
- [x] Support up to 8 screenshot uploads.
- [x] Add private upload path for revenue evidence.
- [x] Add revenue evidence review status.
- [ ] Add "verified revenue" display only after approval.
- [x] Add listing draft save.
- [x] Add listing submit-for-review state.
- [x] Add listing edit lock rules while review is in progress.
- [x] Add listing activity history.
- [ ] Add public marketplace filters for category, listing type, price, revenue, risk, verified revenue, age, and sort order.
- [ ] Add typo-tolerant full-text search or a clearly scoped production search fallback.
- [ ] Add search empty states and no-results recovery actions.
- [x] Track listing views once per visitor/session according to the analytics policy.
- [x] Persist watchlists server-side instead of localStorage-only.
- [ ] Migrate existing localStorage watchlist entries after sign-in.
- [ ] Add remove, notes, and status filters for watchlist items.
- [ ] Make public listing detail pages show only fields approved for public visibility.
- [ ] Add tabs for overview, financials, metrics, investment details, seller, and Q&A if supported.
- [ ] Add seller verification badge from real user/profile status.
- [ ] Add make-offer flow with amount validation and optional message.
- [x] Add buyer duplicate-offer protection.
- [x] Add offer withdraw support.
- [x] Add seller accept, reject, and counter-offer flows.
- [x] Add buyer response to counter-offer if backend supports it.
- [ ] Add offer notifications after create, counter, accept, reject, and withdraw.
- [ ] Create escrow automatically or explicitly after accepted offer based on product decision.
- [x] Add escrow funding state backed by the payment provider.
- [x] Add transfer checklist configuration per listing transfer inclusions.
- [x] Add buyer and seller confirmation rules for each transfer item.
- [x] Add inspection period timer from real deal timestamps.
- [x] Add milestone updates for funding, source handoff, domain handoff, inspection, approval, release, and completion.
- [x] Add dispute creation with reason, evidence, and audit trail.
- [x] Add admin/manual hold flag support without touching admin UI implementation.
- [ ] Integrate Stripe Connect onboarding for sellers from dashboard/settings into listing payout readiness.
- [ ] Verify seller payout account before allowing high-value listing activation if required.
- [ ] Add payment provider webhook handling for escrow funded, release succeeded, release failed, refund, chargeback, and account disconnected.
- [x] Add idempotency keys for offer creation, escrow creation, payment intent creation, and fund release.
- [x] Add transaction audit logs for offer and escrow state changes.
- [ ] Add marketplace API error taxonomy for validation, authorization, conflict, payment required, provider unavailable, and retryable failures.
- [ ] Add unit tests for listing payload normalization.
- [ ] Add backend/API tests for listing ownership, offer lifecycle, and escrow lifecycle.
- [ ] Add end-to-end tests for listing creation, review submission, offer acceptance, escrow checklist, and release.
- [ ] Add responsive QA for marketplace, listing detail, listing wizard, manage listings, watchlist, and escrow pages.
- [ ] Add accessibility checks for listing forms, modals, tabs, tables, and escrow checklist controls.

## Production Acceptance Criteria

- [ ] Sellers can create, preview, submit, edit, pause, and manage real listings.
- [ ] Buyers can discover, save, inspect, and make offers on listings.
- [ ] Offers cannot be changed by users who do not own the buyer or seller side.
- [ ] Accepted offers lead to a secure escrow deal with real transfer states.
- [ ] Escrow release is idempotent, audited, and payment-provider-backed.
- [ ] No marketplace, offer, watchlist, or escrow critical data depends only on localStorage.
- [ ] Marketplace flows pass mobile, tablet, desktop, API, and end-to-end tests.
