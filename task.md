# Implementation Tasks: MVPLAB Marketplace

> **Last Updated:** 2026-03-21  
> **Completion:** 75%  
> **See Also:** [TASK_TRACKER.md](./TASK_TRACKER.md) for detailed breakdown

---

## Phase 1: Core Search & Discovery

### 1.1 Meilisearch Integration
- [ ] Setup Meilisearch server
- [ ] Index listings (name, description, tech stack)
- [ ] Implement autocomplete (debounced 300ms)
- [ ] Configure typo-tolerant search

### 1.2 Dynamic Filters
- [ ] Category filter (multi-select)
- [ ] Listing Type filter (sale/investment/both)
- [ ] Price Range slider
- [ ] Monthly Revenue range
- [ ] Risk Rating multi-select
- [ ] Revenue Verified toggle
- [ ] Age of App range
- [ ] Sort options (newest, price, views, saves)

### 1.3 SSR Pages
- [ ] Configure SSR for listing detail pages
- [ ] Generate Open Graph images
- [ ] Add schema.org/Product structured data
- [ ] Auto-generate sitemap

**Status:** ❌ Not Started  
**Priority:** High  
**Est. Effort:** 2 weeks

---

## Phase 2: Seller Listing Wizard

### 2.1 Multi-step Form UI
- [x] Step 1: App Basics (name, category, description, images)
- [x] Step 2: Financial Disclosure (revenue, expenses)
- [x] Step 3: Deal Terms (listing type, pricing)
- [ ] Step 4: Investment-specific fields (target raise, equity %)
- [ ] Step 5: Preview & Submit (terms agreement, submit for review)

### 2.2 Image & File Upload
- [x] Basic image upload
- [ ] Cloudinary integration (auto-resize, optimization)
- [ ] Multiple screenshots (up to 8)
- [ ] Cover image validation (16:9, min 1280x720)
- [ ] Financial evidence upload (private storage)

### 2.3 Draft / Publish Logic
- [x] Create listing API integration
- [ ] Draft state management
- [ ] `under_review` status handling
- [ ] Admin approval trigger
- [ ] Rejection feedback system

**Status:** ⚠️ Partial (3/5 steps complete)  
**Priority:** Medium  
**Est. Effort:** 1 week

---

## Phase 3: Offer & Escrow Flow

### 3.1 Offer Modal Engine
- [x] Offer modal UI
- [x] useOffers hook (create, update, counter)
- [ ] Binding vs non-binding offers
- [ ] Offer expiration handling

### 3.2 Seller Offer Management
- [x] Offers table component
- [x] Counter-offer modal
- [ ] Accept/Reject workflow (backend)
- [ ] Offer notification to buyers

### 3.3 Stripe Escrow Setup
- [x] usePayments hook (connect, verify)
- [ ] Stripe Connect onboarding completion
- [ ] Fund holding on offer acceptance
- [ ] Escrow status tracking
- [ ] Transfer checklist (code, domain, accounts)
- [ ] Milestone-based fund release
- [ ] Platform fee deduction
- [ ] Dispute window (7 days)

**Status:** ⚠️ Partial (UI complete, backend needed)  
**Priority:** High  
**Est. Effort:** 2-3 weeks

---

## Phase 4: Integration with MVPLab Investment

### 4.1 "Invest as Group" Handoff
- [ ] Pass listing context to MVPLAB_INVESTMENT
- [ ] Route with target_raise, listing_id, equity %
- [ ] Handle return from investment app

### 4.2 Funding Progress Sync
- [ ] Webhook listener for investment updates
- [ ] Progress bar on marketplace card
- [ ] Investor count display
- [ ] Funding target reached notification

**Status:** ❌ Not Started  
**Priority:** High  
**Est. Effort:** 1 week  
**Dependencies:** MVPLAB_INVESTMENT app ready

---

## Phase 5: Admin & Support Tools

### 5.1 Admin Review Dashboard
- [x] Basic admin dashboard page
- [x] Listing review queue
- [x] Review checklist interface
- [x] Approve/Reject actions
- [x] Feedback notes
- [x] KYC verification for high-value listings

### 5.2 Q&A Messaging
- [ ] Email notifications (new question, response)

### 5.3 User Management
- [ ] User search and listing
- [ ] Suspend/activate users
- [ ] Role management

### 5.4 Payout Management
- [ ] Payout queue
- [ ] Commission calculation
- [ ] Payment history

**Status:** ⚠️ Partial  
**Priority:** High  
**Est. Effort:** 1.5 weeks

---

## Phase 6: Additional Pages (PRD Requirements)

### Public Pages
- [ ] `/how-it-works` - Step-by-step guide
- [ ] `/about` - MVPLab story
- [ ] `/pricing` - Commission rates
- [ ] `/blog` - Market insights

### Seller Pages
- [ ] `/seller/offers` - Dedicated offers received
- [ ] `/seller/offers/:id` - Offer detail
- [ ] `/seller/earnings` - Sale proceeds, payout history
- [ ] `/seller/profile` - Public profile editor
- [ ] `/seller/listings/:id/analytics` - Per-listing analytics

### Buyer Pages
- [ ] `/buyer/dashboard` - Dedicated buyer dashboard
- [ ] `/buyer/offers` - Offers made
- [ ] `/buyer/purchases` - Completed acquisitions
- [ ] `/buyer/saved` - Saved listings
- [ ] `/buyer/invest/:listingId` - Investment redirect

### Shared Pages
- [ ] `/notifications` - Notification center
- [ ] `/settings/kyc` - KYC verification

**Status:** ❌ Not Started  
**Priority:** Medium  
**Est. Effort:** 2-3 weeks

---

## Phase 7: Notifications

### In-App Notifications
- [ ] Notification bell in header
- [ ] Notification list page
- [ ] Mark as read functionality

### Email Notifications (Resend)
- [ ] New offer received
- [ ] Offer accepted/rejected/countered
- [ ] Listing approved/rejected
- [ ] Transfer step completed
- [ ] Funds released
- [ ] New Q&A question
- [ ] Seller response

### Push Notifications (OneSignal)
- [ ] Critical alerts
- [ ] Offer updates

**Status:** ⚠️ Partial (Hook exists)  
**Priority:** Medium  
**Est. Effort:** 1.5 weeks

---

## Completed Features

### Core Infrastructure
- [x] React Router with 25 routes
- [x] Protected route component
- [x] Supabase authentication
- [x] API client with auth

### Pages Implemented
- [x] Home, Browse, Marketplace
- [x] Listing Detail, App Detail
- [x] Create Listing (3-step wizard)
- [x] Dashboard, Analytics, Settings
- [x] Finances, Connections, Watchlist
- [x] Invest, Community, Support
- [x] Developers Portal, Documentation
- [x] Escrow Dashboard (UI), Audit Log
- [x] Admin Dashboard, Manage Listings
- [x] Social Hub

### Hooks Implemented
- [x] useAuth, useMarketplace, useOffers
- [x] usePayments, useWatchlist, useNotifications
- [x] useDashboardData, useAI, useCreators
- [x] useCampaigns, useMessages, useSocialAutomation
- [x] useUserStatus

### Components Implemented
- [x] Layout, DashboardLayout, ProtectedRoute
- [x] ListingCard, MetricCard, OfferModal
- [x] CounterOfferModal, OffersTable
- [x] RevenueChart, RevenueBreakdown
- [x] RecentActivity, WatchlistPreview
- [x] AppOnboardingWizard, AppLifecycleTracker
- [x] QuickActions

---

## Roadmap Summary

| Phase | Focus | Status | Timeline |
|-------|-------|--------|----------|
| Phase 1 | Search & Discovery | ❌ Not Started | Week 1-2 |
| Phase 2 | Listing Wizard | ⚠️ 60% | Week 1 |
| Phase 3 | Offer & Escrow | ⚠️ 40% | Week 1-2 |
| Phase 4 | Investment Integration | ❌ Not Started | Week 3-4 |
| Phase 5 | Admin & Support | ⚠️ 30% | Week 2 |
| Phase 6 | Additional Pages | ❌ Not Started | Week 4-5 |
| Phase 7 | Notifications | ⚠️ 20% | Week 5 |

---

## Technical Debt

- [ ] Remove unused imports in App.tsx
- [ ] Fix null checks in DashboardPage.tsx
- [ ] Remove unused imports in EscrowDashboardPage.tsx
- [ ] Replace `any` types with proper TypeScript
- [ ] Remove mock data, use real API calls
- [ ] Add error boundaries
- [ ] Consistent loading states

---

## External Dependencies

| Service | Status | Required For |
|---------|--------|--------------|
| Meilisearch | ❌ Setup needed | Search |
| Cloudinary | ❌ Setup needed | Image CDN |
| Resend | ❌ Setup needed | Email |
| OneSignal | ❌ Setup needed | Push |
| Stripe Connect | ⚠️ Partial | Payments/Escrow |

---

*This document syncs with [TASK_TRACKER.md](./TASK_TRACKER.md) for detailed feature breakdown.*