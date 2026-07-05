# MVPLAB Marketplace - Client Journey Task Tracker

> **Last Updated:** 2026-03-21  
> **Perspective:** End-User / Client  
> **Goal:** Track every stage a user encounters and ensure it works end-to-end

---

## User Types

| Type | Journey | Current State |
|------|---------|---------------|
| **Browser** | Discover → View → Save | ✅ Fixed (API data) |
| **Buyer** | Browse → Offer → Escrow → Own | ⚠️ Partial (escrow API ready) |
| **Seller** | Auth → List → Manage → Payout | ✅ Fixed (edit/delete wired) |
| **Admin** | Review → Approve → Monitor | ❌ Not Working |

---

## Stage 1: Discovery & Landing

### 1.1 HomePage (`/`)

**Purpose:** First impression, featured listings, CTAs

| Feature | Status | Issue |
|---------|--------|-------|
| Hero section | ✅ Working | Static content |
| Featured listings | ✅ Fixed | Now fetches from API |
| Category filter | ✅ Working | Filters API data |
| "Browse Listings" CTA | ✅ Working | Navigates to `/browse` |
| "List Your App" CTA | ✅ Fixed | Checks auth before redirect |
| Stats bar | ❌ Fake | Hardcoded numbers |

**What Client Sees:**
- Real listings from database
- Categories filter correctly
- Auth-aware "List Your App" button

**Fixed:**
```
[x] Replace MOCK_LISTINGS with getListings() API call
[x] Wire "List Your App" to handleListApp()
[ ] Fetch real stats from /analytics/platform endpoint
```

**Priority:** Done ✅

---

### 1.2 BrowsePage (`/browse`)

**Purpose:** Discover listings, quick access to sections

| Feature | Status | Issue |
|---------|--------|-------|
| "New in Marketplace" | ✅ Working | Fetches from API |
| "Active Investment Opportunities" | ✅ Working | Fetches from API |
| Hub cards (Marketplace, Invest, Staking) | ✅ Working | Links work |
| Loading states | ✅ Working | Spinner shown |
| Empty states | ✅ Working | Graceful fallback |

**What Client Sees:**
- Real listings appear if API returns data
- Empty state if no listings exist
- Smooth navigation to other sections

**To Fix:**
```
[ ] Add pagination for large datasets
[ ] Add skeleton loading for better UX
```

**Priority:** Low | **Est:** 1 day

---

### 1.3 MarketplacePage (`/marketplace`)

**Purpose:** Main listing discovery, search, filter

| Feature | Status | Issue |
|---------|--------|-------|
| Listing grid | ⚠️ Hybrid | API + mock fallback |
| Search bar | ⚠️ Client-side | No backend search |
| Category filter | ✅ Working | Filters merged data |
| Listing cards | ✅ Working | Links to detail |
| Banner carousel | ⚠️ Static | Hardcoded promos |

**What Client Sees:**
- Listings appear but may include fake data
- Search only filters what's loaded (no Meilisearch)
- Categories work but limited to loaded data

**To Fix:**
```
[ ] Remove mock data fallback (show empty state instead)
[ ] Implement Meilisearch for server-side search
[ ] Add price/revenue/rating filters
[ ] Add sort options (newest, price, views)
[ ] Make banner dynamic from admin config
```

**Priority:** High | **Est:** 1 week

---

## Stage 2: Detail & Decision

### 2.1 ListingDetailPage (`/listings/:id`)

**Purpose:** View full listing, make offer, save

| Feature | Status | Issue |
|---------|--------|-------|
| Listing data fetch | ✅ Working | API call |
| Loading/error states | ✅ Working | Proper handling |
| Image gallery | ⚠️ Basic | Single image only |
| Tech stack display | ✅ Working | From data |
| Valuation display | ⚠️ Local | Calculated client-side |
| Stake slider (investment) | ✅ Working | Interactive |
| "Acquire X% Stake" button | ✅ Working | Opens OfferModal |
| "Save to Watchlist" | ✅ Working | API call |
| "Contact Seller" | ❌ Not Wired | Just a button |

**What Client Sees:**
- Full listing details work
- Can submit offers
- Cannot message seller directly
- Valuation may not match backend

**To Fix:**
```
[ ] Add image carousel for screenshots
[ ] Wire "Contact Seller" to messaging API
[ ] Fetch valuation from backend (not local calc)
[ ] Add Q&A section
[ ] Add "Report Listing" functionality
```

**Priority:** High | **Est:** 3 days

---

### 2.2 OfferModal

**Purpose:** Submit purchase/investment offer

| Feature | Status | Issue |
|---------|--------|-------|
| Amount input | ✅ Working | Validation |
| Message field | ✅ Working | Optional |
| Submit button | ✅ Working | API call |
| Loading state | ✅ Working | Spinner |
| Success state | ✅ Working | Confirmation |
| Error handling | ✅ Working | Shows message |

**What Client Sees:**
- Can submit offers successfully
- Gets confirmation after submission
- Redirected to dashboard

**To Fix:**
```
[ ] Add offer expiration option
[ ] Add "binding vs non-binding" toggle
[ ] Show platform fee breakdown
```

**Priority:** Medium | **Est:** 1 day

---

## Stage 3: Authentication

### 3.1 AuthPage (`/auth`)

**Purpose:** Sign in / Sign up

| Feature | Status | Issue |
|---------|--------|-------|
| Email/password sign in | ✅ Working | Supabase auth |
| Email/password sign up | ✅ Working | Supabase auth |
| Role selection | ✅ Working | Stored in metadata |
| Redirect after auth | ✅ Working | Deep link support |
| Error messages | ✅ Working | Proper display |
| "Forgot Password" | ❌ Not Wired | Just a button |
| "Biometric Login" | ❌ Placeholder | Not implemented |
| OAuth (Google) | ❓ Unknown | Check Supabase config |

**What Client Sees:**
- Can create account and sign in
- Role is saved (CEO/Creator)
- Cannot reset password from this page
- Biometric option does nothing

**To Fix:**
```
[ ] Wire "Forgot Password" to Supabase reset flow
[ ] Add Google OAuth button (if configured)
[ ] Remove or implement biometric login
[ ] Add email verification reminder
```

**Priority:** Medium | **Est:** 2 days

---

## Stage 4: Seller Journey

### 4.1 CreateListingPage (`/listings/new`)

**Purpose:** List an app for sale/investment

| Feature | Status | Issue |
|---------|--------|-------|
| Step 1: App Basics | ✅ Working | Name, category, desc, image |
| Step 2: Financials | ✅ Working | Revenue, age, Stripe connect |
| Step 3: Deal Terms | ✅ Working | Sale vs investment, pricing |
| Image upload | ✅ Working | API call |
| AI valuation suggest | ✅ Working | API call |
| Stripe Connect button | ⚠️ Partial | Depends on backend |
| Real-time preview | ✅ Working | Updates live |
| Form validation | ✅ Working | Required fields |
| Submit listing | ✅ Working | API call |

**What Client Sees:**
- Can create listing end-to-end
- Image uploads successfully
- Gets AI valuation suggestion
- May hit Stripe Connect issues if backend not configured
- Listing goes to "review" status

**To Fix:**
```
[ ] Add Step 4: Transfer inclusions (source code, domain, etc.)
[ ] Add Step 5: Preview & Terms agreement
[ ] Add draft save functionality
[ ] Improve Stripe Connect error handling
[ ] Add financial evidence upload (revenue proof)
```

**Priority:** Medium | **Est:** 1 week

---

### 4.2 ManageListingsPage (`/manage-listings`)

**Purpose:** View and manage seller's listings

| Feature | Status | Issue |
|---------|--------|-------|
| Fetch my listings | ✅ Working | API call |
| Listing cards | ✅ Working | Status badges |
| Offers per listing | ✅ Working | API call |
| Accept/Reject offers | ✅ Working | API call |
| Counter-offer modal | ✅ Working | API call |
| Edit listing | ✅ Fixed | Navigate to edit page |
| Delete listing | ✅ Fixed | Confirmation + API call |
| Pause listing | ✅ Fixed | Toggle via API |
| View analytics | ⚠️ Partial | Links to /analytics |

**What Client Sees:**
- Can see their listings
- Can manage offers (accept/reject/counter)
- Can edit, delete, pause listings
- Delete has confirmation modal

**Fixed:**
```
[x] Wire Edit button to navigation
[x] Implement Delete with confirmation
[x] Implement Pause/Resume toggle
[x] Add delete confirmation modal
```

**Priority:** Done ✅

---

## Stage 5: Buyer Dashboard

### 5.1 DashboardPage (`/dashboard`)

**Purpose:** Overview of user's activity

| Feature | Status | Issue |
|---------|--------|-------|
| Sent offers list | ✅ Working | API call |
| Offer status badges | ✅ Working | Visual |
| KYC verification banner | ⚠️ Partial | Shows status |
| Stripe Connect banner | ⚠️ Partial | Hardcoded URL |
| "Complete KYC" button | ❌ Not Wired | Just a button |
| "Setup Payouts" button | ⚠️ Hardcoded | Wrong URL |
| "Start Escrow" button | ❌ Not Wired | Just a button |
| Market Activity sidebar | ❌ Mock | Hardcoded items |
| Analytics widget | ⚠️ Partial | Needs appId |

**What Client Sees:**
- Can see their sent offers
- Sees verification prompts
- Cannot action them (buttons don't work)
- Activity feed is fake

**To Fix:**
```
[ ] Wire "Complete KYC" to KYC flow
[ ] Fix "Setup Payouts" URL (use API response)
[ ] Wire "Start Escrow" to escrow creation
[ ] Fetch real Market Activity from API
[ ] Fix analytics to not require appId context
```

**Priority:** High | **Est:** 3 days

---

### 5.2 WatchlistPage (`/watchlist`)

**Purpose:** Saved listings

| Feature | Status | Issue |
|---------|--------|-------|
| Fetch watchlist | ✅ Working | API call |
| Listing cards | ✅ Working | Display |
| Remove from watchlist | ✅ Working | API call |
| Empty state | ✅ Working | Message shown |

**What Client Sees:**
- Can see saved listings
- Can remove items
- Works as expected

**To Fix:**
```
[ ] Add "Make Offer" quick action
[ ] Add price change notifications
[ ] Add "View Similar" suggestions
```

**Priority:** Low | **Est:** 1 day

---

## Stage 6: Escrow & Transfer

### 6.1 EscrowDashboardPage (`/escrow`)

**Purpose:** Monitor and manage active deals

| Feature | Status | Issue |
|---------|--------|-------|
| Deal list | ✅ Fixed | API call via useEscrow |
| Deal stages | ✅ Fixed | Real data from API |
| Total escrow value | ✅ Fixed | API stats |
| Search deals | ✅ Working | Client-side filter |
| Filter tabs | ✅ Working | Status filtering |
| "Manage Deal" button | ⚠️ Partial | Links to detail page |

**What Client Sees:**
- Real deals from database
- Can search and filter
- Can navigate to deal detail

**Fixed:**
```
[x] Create useEscrow hook with API calls
[x] Implement GET /escrow endpoint integration
[x] Wire search to filter results
[x] Wire "Manage Deal" to deal detail page
[ ] Build deal detail page with timeline
[ ] Add document upload for proof
```

**Priority:** Partial ✅ (hook created, API integration ready)

---

### 6.2 Deal Management (Missing)

**Purpose:** Manage individual escrow deal

| Feature | Status | Issue |
|---------|--------|-------|
| Deal detail page | ❌ Missing | No route |
| Transfer checklist | ❌ Missing | Not implemented |
| Milestone tracking | ❌ Missing | Not implemented |
| Fund release approval | ❌ Missing | Not implemented |
| Dispute filing | ❌ Missing | Not implemented |
| Document upload | ❌ Missing | Not implemented |

**What Client Sees:**
- Nothing - page doesn't exist

**To Fix:**
```
[ ] Create /escrow/:dealId route
[ ] Build deal detail page
[ ] Implement transfer checklist
[ ] Add document upload for proof
[ ] Add milestone approval flow
```

**Priority:** Critical | **Est:** 2 weeks

---

## Stage 7: Admin & Moderation

### 7.1 AdminDashboardPage (`/admin`)

**Purpose:** Platform oversight

| Feature | Status | Issue |
|---------|--------|-------|
| Dashboard metrics | ⚠️ Partial | Some mock data |
| User stats | ❓ Unknown | Check API |
| Revenue chart | ⚠️ Mock | Hardcoded |
| Quick actions | ⚠️ Partial | Some wired |

**What Client Sees:**
- Admin dashboard appears
- Some data may be fake

**To Fix:**
```
[ ] Verify all metrics fetch from API
[ ] Add listing review queue
[ ] Add user management
[ ] Add payout approval queue
```

**Priority:** High | **Est:** 1 week

---

### 7.2 Listing Review Queue (Missing)

**Purpose:** Approve/reject submitted listings

| Feature | Status | Issue |
|---------|--------|-------|
| Pending listings list | ❌ Missing | Not implemented |
| Review checklist | ❌ Missing | Not implemented |
| Approve button | ❌ Missing | Not implemented |
| Reject with reason | ❌ Missing | Not implemented |
| Feedback to seller | ❌ Missing | Not implemented |

**What Admin Sees:**
- Cannot review listings
- No queue interface

**To Fix:**
```
[ ] Create /admin/listings/review route
[ ] Build review queue component
[ ] Implement approve/reject API calls
[ ] Add notification to seller
```

**Priority:** Critical | **Est:** 1 week

---

## Summary: What Was Fixed (2026-03-21)

### Completed Fixes

| Issue | Status | Changes Made |
|-------|--------|--------------|
| HomePage mock data | ✅ Fixed | Replaced with API call via useMarketplace |
| Edit listing | ✅ Fixed | Wired to navigation, created EditListingPage |
| Delete listing | ✅ Fixed | Added confirmation modal + API call |
| Pause/Resume listing | ✅ Fixed | Toggle via API |
| Escrow dashboard | ✅ Fixed | Created useEscrow hook, wired to API |
| Escrow search/filter | ✅ Fixed | Client-side filtering on real data |
| Escrow detail page | ✅ Fixed | Created /escrow/:id route with full UI |
| Admin review queue | ✅ Fixed | Created /admin/review route with approve/reject |
| Dashboard KYC button | ✅ Fixed | Wired to settings page |
| Dashboard Stripe button | ✅ Fixed | Wired to usePayments hook |
| Start Escrow button | ✅ Fixed | Wired to createEscrow API |

### Files Modified
- `src/pages/HomePage.tsx` - API integration
- `src/pages/ManageListingsPage.tsx` - Edit/Delete/Pause wired
- `src/pages/EscrowDashboardPage.tsx` - API integration
- `src/pages/EscrowDetailPage.tsx` - **NEW** Deal detail page
- `src/pages/AdminReviewQueuePage.tsx` - **NEW** Admin review queue
- `src/pages/EditListingPage.tsx` - **NEW** Listing edit page
- `src/pages/DashboardPage.tsx` - Wired KYC/Stripe/Escrow buttons
- `src/hooks/useMarketplace.ts` - Added update/delete/status methods
- `src/hooks/useEscrow.ts` - **NEW** Escrow API hook
- `src/hooks/usePayments.ts` - Updated return type
- `src/App.tsx` - Added new routes

---

## Remaining Issues

### High (Degrades Experience)
| Issue | Impact | Status |
|-------|--------|--------|
| Search is client-side | Poor discoverability | ❌ Needs Meilisearch |
| Contact Seller broken | No communication | ❌ Not Started |
| Admin review uses mock data | Need backend API | ⚠️ Partial |

### Medium (Polish Needed)
| Issue | Impact | Status |
|-------|--------|--------|
| Listing wizard incomplete | Missing 2 steps | ❌ Not Started |
| Forgot password broken | Poor UX | ❌ Not Started |
| Market Activity mock data | Shows fake data | ❌ Not Started |

---

## Recommended Next Steps

### Week 1: Critical Fixes ✅ COMPLETED
```
[x] Fix HomePage mock data → API
[x] Wire Edit/Delete on ManageListingsPage
[x] Create useEscrow hook + API integration
[x] Update EscrowDashboardPage with real API
```

### Week 2: Escrow & Admin ✅ COMPLETED
```
[x] Build deal detail page (/escrow/:id)
[x] Build Admin Review Queue
[x] Wire Dashboard KYC/Stripe buttons
[x] Create listing edit page
```

### Week 3: Search & Polish (NEXT)
```
[ ] Integrate Meilisearch for server-side search
[ ] Complete listing wizard (5 steps)
[ ] Wire "Contact Seller" to messaging
[ ] Add Q&A on listings
```

### Week 4: Communication
```
[ ] Build messaging system
[ ] Add email notifications
[ ] Add push notifications
```

---

## Routes Missing or Incomplete

| Route | Status | Purpose |
|-------|--------|---------|
| `/escrow/:id` | ✅ Created | Deal management |
| `/listings/:id/edit` | ✅ Created | Edit listing |
| `/admin/review` | ✅ Created | Admin queue |
| `/seller/offers` | ❌ Missing | Seller offers |
| `/buyer/offers` | ❌ Missing | Buyer offers |
| `/buyer/purchases` | ❌ Missing | Completed deals |
| `/messaging` | ❌ Missing | Direct messages |
| `/how-it-works` | ❌ Missing | Help page |
| `/pricing` | ❌ Missing | Fee structure |

---

## API Endpoints Needed

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /escrow` | Fetch user's escrow deals | Critical |
| `GET /escrow/:id` | Deal detail | Critical |
| `POST /escrow` | Create escrow from offer | Critical |
| `PATCH /escrow/:id/milestone` | Update transfer progress | Critical |
| `GET /admin/listings/pending` | Review queue | Critical |
| `PATCH /admin/listings/:id/review` | Approve/reject | Critical |
| `PUT /listings/:id` | Update listing | High |
| `DELETE /listings/:id` | Delete listing | High |
| `POST /messages` | Contact seller | High |
| `GET /search` | Server-side search | High |

---

## Change Log

### 2026-03-21 (Session 2)
- ✅ Created EscrowDetailPage with deal timeline, transfer checklist, milestones
- ✅ Created AdminReviewQueuePage with approve/reject modals
- ✅ Created EditListingPage with 3-step form
- ✅ Wired Dashboard "Complete KYC" button to settings
- ✅ Wired Dashboard "Setup Payouts" button to Stripe Connect
- ✅ Wired Dashboard "Start Escrow" button to createEscrow API
- ✅ Added routes: /escrow/:id, /listings/:id/edit, /admin/review
- ✅ Updated usePayments hook return type

### 2026-03-21 (Session 1)
- ✅ Fixed HomePage - replaced mock data with API call
- ✅ Fixed ManageListingsPage - wired Edit/Delete/Pause buttons
- ✅ Created useEscrow hook with full API integration
- ✅ Updated EscrowDashboardPage to use real API
- ✅ Added delete confirmation modal
- ✅ Added updateListing, deleteListing, updateListingStatus to useMarketplace

### 2026-03-21 (Initial Analysis)
- Analyzed all pages from client perspective
- Identified 4 critical blockers
- Documented 10+ missing routes
- Listed 11 needed API endpoints
- Created 4-week fix roadmap