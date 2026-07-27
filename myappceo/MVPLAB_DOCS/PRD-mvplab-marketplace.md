# Product Requirements Document
## MVPLab Marketplace

**Version:** 1.0
**Date:** 2026-02-25
**Type:** Product + Technical PRD
**Status:** Draft
**Owner:** MVPLab

---

## 1. Executive Summary

MVPLab Marketplace is a curated platform where app owners, developers, and indie builders list their apps for sale or community investment. Buyers can purchase outright or stake a group investment through MVPLab Investment. The marketplace bridges sellers who want liquidity for their digital products and buyers/investors who want to own, operate, or co-own apps without building from scratch.

---

## 2. Problem Statement

There is no centralised, trusted marketplace tailored to apps built and validated within the MVPLab ecosystem. Indie builders need a professional venue to monetise their work — either through outright sale or by inviting community investment. Buyers and investors need a discovery layer where app quality and financial history are transparent, verified, and actionable.

---

## 3. Goals

| Goal | Success Metric |
|------|---------------|
| Enable app listings for sale or investment | 50 listings within 6 months |
| Drive group investment deals via MVPLab Investment | 20% of listings convert to investment deals |
| Build buyer trust through verification | 100% of listings reviewed before going live |
| Keep sellers engaged | < 60-day average time-to-first-offer |
| Grow community | 5,000 registered users within 12 months |

---

## 4. User Types

| Role | Description |
|------|-------------|
| **Seller** | App owner listing their app for sale or investment |
| **Buyer** | Individual purchasing an app outright |
| **Investor** | Group or individual buying a stake via MVPLab Investment |
| **Browser** | Unregistered visitor exploring listings |
| **Admin** | MVPLab staff reviewing listings and managing the platform |

---

## 5. Pages & Screen Inventory

### 5.1 Public Pages (No Login Required)

| Page | Route | Description |
|------|-------|-------------|
| **Landing Page** | `/` | Hero, value proposition, featured listings, how it works, CTA |
| **Browse Listings** | `/marketplace` | All active app listings with filters |
| **App Listing Detail** | `/marketplace/:slug` | Full app profile, metrics, pricing, CTAs |
| **How It Works** | `/how-it-works` | Step-by-step explanation for buyers and sellers |
| **About** | `/about` | MVPLab story and team |
| **Pricing** | `/pricing` | Seller commission rates and fee structure |
| **Blog** | `/blog` | Market insights, success stories |
| **Sign In** | `/auth/signin` | Email + OAuth login |
| **Sign Up** | `/auth/signup` | New account registration |
| **Verify Email** | `/auth/verify` | OTP email confirmation |
| **Forgot Password** | `/auth/forgot-password` | Password reset flow |

### 5.2 Authenticated — Seller Pages

| Page | Route | Description |
|------|-------|-------------|
| **Seller Dashboard** | `/seller/dashboard` | Overview: active listings, offers, revenue |
| **Create Listing** | `/seller/listings/new` | Multi-step listing creation wizard |
| **Edit Listing** | `/seller/listings/:id/edit` | Update listing details |
| **My Listings** | `/seller/listings` | All my listings with status |
| **Offers Received** | `/seller/offers` | Incoming buy and invest offers |
| **Offer Detail** | `/seller/offers/:id` | Review + accept/reject an offer |
| **Earnings** | `/seller/earnings` | Sale proceeds, platform fees, payout history |
| **Seller Profile** | `/seller/profile` | Public seller profile editor |
| **Analytics** | `/seller/listings/:id/analytics` | Views, saves, enquiries per listing |

### 5.3 Authenticated — Buyer/Investor Pages

| Page | Route | Description |
|------|-------|-------------|
| **Buyer Dashboard** | `/buyer/dashboard` | Saved listings, active offers, purchases |
| **My Offers** | `/buyer/offers` | Offers made — pending/accepted/rejected |
| **My Purchases** | `/buyer/purchases` | Completed app acquisitions |
| **Saved Listings** | `/buyer/saved` | Bookmarked apps |
| **Invest via MVPLab** | `/buyer/invest/:listingId` | Redirect flow into MVPLab Investment for group stake |
| **Buyer Profile** | `/buyer/profile` | Account settings |

### 5.4 Shared Auth Pages

| Page | Route | Description |
|------|-------|-------------|
| **Account Settings** | `/settings` | Email, password, notifications |
| **KYC Verification** | `/settings/kyc` | Identity verification for high-value transactions |
| **Notifications** | `/notifications` | In-app notification feed |

### 5.5 Admin Pages

| Page | Route | Description |
|------|-------|-------------|
| **Admin Dashboard** | `/admin` | Platform overview — listings, users, revenue |
| **Listing Review Queue** | `/admin/listings/review` | Approve / reject submitted listings |
| **User Management** | `/admin/users` | Search, view, suspend users |
| **Offer Oversight** | `/admin/offers` | All platform offers and deal status |
| **Payout Management** | `/admin/payouts` | Process seller payouts |
| **Audit Log** | `/admin/audit` | Full action history |

---

## 6. Landing Page Specification

### 6.1 Sections (top to bottom)

#### Hero Section
- **Headline:** "Buy, Sell, or Invest in Apps — Together"
- **Subheadline:** A one-sentence value pitch for both buyers and sellers.
- **Primary CTA:** `Browse Apps` (→ `/marketplace`)
- **Secondary CTA:** `List Your App` (→ `/auth/signup?intent=seller`)
- **Visual:** Animated marketplace card grid or app mockup collage.

#### Stats Bar
- Total apps listed | Total deals closed | Total community investors | Total value transacted

#### How It Works
- **For Sellers:** 3 steps — List your app → Get verified → Receive offers
- **For Buyers:** 3 steps — Browse listings → Make an offer → Own your app
- **For Investors:** 3 steps — Find an app → Join a group → Earn ROI monthly

#### Featured Listings
- 3–6 curated app cards showing: name, category, asking price, revenue (if disclosed), risk badge.
- "View All" CTA.

#### Investment CTA Banner
- "Want to co-own an app? Group investing starts from $500 — through MVPLab Investment."
- CTA → `/how-it-works#invest`

#### Testimonials / Success Stories
- Seller quote cards and buyer outcome snapshots.

#### Newsletter Signup
- Email capture: "Get notified when new apps are listed."

#### Footer
- Links: About, Pricing, Blog, Terms, Privacy, Contact
- Social links

---

## 7. Listing Creation — Seller Wizard

Multi-step form, progress bar at top.

### Step 1 — App Basics
- App name
- Category (Mobile App / Web App / Game / SaaS / AI Product / Browser Extension / Other)
- Short description (160 chars)
- Long description (Markdown supported)
- App URL / App Store links
- Cover image upload (16:9, min 1280×720)
- Screenshot uploads (up to 8)

### Step 2 — Listing Type
- **Sale** — Asking price (USD). Accepts direct purchase offers.
- **Investment** — Not for outright sale. Accepts group investment offers via MVPLab Investment. Set target raise and equity % available.
- **Both** — Open to either, seller decides per-offer.

### Step 3 — Financial Disclosure
- Monthly revenue (optional but strongly encouraged)
- Monthly expenses
- Revenue model (ads, subscriptions, in-app purchase, one-time, other)
- Age of app (months since launch)
- Current user/download count (optional)
- Growth trend (Growing / Stable / Declining)
- Revenue evidence: upload Stripe dashboard screenshot, Play Console screenshot, AdSense report (stored privately, shown as "Verified Revenue" badge)

### Step 4 — Deal Terms
- For Sale: minimum offer, buy-it-now price (optional)
- For Investment: minimum stake %, max investors, monthly ROI estimate
- Transfer includes: source code (Y/N), domain (Y/N), social accounts (Y/N), customer data (Y/N), ongoing support (duration)
- Non-compete clause (Y/N)

### Step 5 — Preview & Submit
- Full listing preview as buyers will see it
- Agree to marketplace terms
- Submit for MVPLab review

---

## 8. App Listing Detail Page

### Header Block
- App name, category badge, risk/quality badge
- Cover image / screenshot carousel
- Asking price (or "Investment Opportunity" tag)
- `Make an Offer` CTA | `Invest as a Group` CTA | `Save` button
- Seller name + avatar + verified badge + member since

### Overview Tab
- Short and long description
- App URL and App Store links
- Transfer inclusions (source code, domain, etc.)
- Non-compete terms

### Financials Tab
- Monthly revenue (exact if disclosed, or range)
- Monthly expenses and profit
- Revenue model tags
- Revenue verification badge (if docs submitted)
- Age, growth trend
- Revenue chart (last 6–12 months, if provided)

### Metrics Tab
- Total users / MAU
- App store ratings (iOS / Android)
- Download count
- Tech stack (language, framework, hosting)

### Investment Tab (if listing type includes investment)
- Target raise amount
- Equity % available
- Minimum stake amount
- Projected monthly ROI
- Current investors count
- Funding progress bar
- `Join Investment Group` CTA → MVPLab Investment flow

### Seller Tab
- Seller bio
- Other listings by this seller
- Response time average
- Completed deals count
- Member since date

### Q&A Section
- Buyers can post questions (visible to all)
- Seller answers publicly
- Admin can hide inappropriate questions

---

## 9. Sign Up & Sign In

### Sign Up Flow
```
1. Choose role: Buyer / Seller / Both
2. Enter: Full name, Email, Password
3. Agree to Terms + Privacy Policy
4. Verify email (6-digit OTP, 10-min TTL)
5. Profile setup:
   - Avatar upload
   - Country
   - Short bio (optional)
   - For sellers: connect payment method for receiving payouts
6. Dashboard redirect
```

### Sign In Flow
```
1. Email + Password
2. If 2FA enabled: TOTP code
3. Session issued (JWT + HttpOnly refresh cookie)
4. Redirect to dashboard
```

### OAuth Options
- Google Sign In
- (Future: Apple Sign In for mobile)

### Password Rules
- Minimum 8 characters
- At least 1 uppercase, 1 number, 1 special character
- Breached password check via HaveIBeenPwned API

---

## 10. Dashboards

### 10.1 Seller Dashboard

#### Summary Cards (top row)
- Active Listings count
- Total Offers Received
- Pending Offers (awaiting response)
- Total Earnings (all closed deals)

#### Active Listings Table
| Column | Detail |
|--------|--------|
| App Name | With thumbnail |
| Type | Sale / Investment / Both |
| Asking Price | USD |
| Views (7d) | Pageviews in last 7 days |
| Saves | Bookmarked by how many users |
| Offers | Open offer count |
| Status | Active / Under Review / Sold / Paused |
| Actions | Edit / Pause / View Analytics / View Offers |

#### Recent Offers Feed
- Last 5 offers with: buyer name, offer amount, date, status (pending/accepted/rejected)

#### Earnings Chart
- Monthly earnings bar chart (last 12 months)
- Breakdown: sale proceeds vs. investment payouts vs. referral bonuses

#### Quick Actions
- `+ Create New Listing`
- `View All Offers`
- `Withdraw Earnings`

---

### 10.2 Buyer Dashboard

#### Summary Cards
- Saved Listings
- Active Offers
- Completed Purchases
- Total Invested (via MVPLab Investment)

#### Saved Listings Grid
- App cards with: name, category, price, time-saved
- "New offer from seller" badge if seller responds

#### My Offers Table
| Column | Detail |
|--------|--------|
| App | Name + thumbnail |
| Offer Type | Buy / Invest |
| Amount | USD |
| Date | Submitted |
| Status | Pending / Accepted / Rejected / Expired |
| Actions | View / Retract |

#### Recommended Listings
- Based on saved apps and browsing history

---

## 11. Design System

### 11.1 Design Principles
- **Trustworthy** — Financial data shown clearly; verified badges prominent
- **Minimal** — Clean card-based layouts; no visual clutter
- **Action-Oriented** — Every page has a clear primary CTA
- **Responsive** — Mobile-first, all pages work on 320px+

### 11.2 Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1A1A2E` | Navigation, headings, primary buttons |
| `primary-light` | `#16213E` | Dark sections, footer |
| `accent` | `#0F3460` | CTA hover, active states |
| `highlight` | `#E94560` | Investment badge, alerts, key numbers |
| `success` | `#22C55E` | Verified badges, positive trends |
| `warning` | `#F59E0B` | Under review status, caution states |
| `error` | `#EF4444` | Errors, declined status |
| `surface` | `#FFFFFF` | Card backgrounds |
| `background` | `#F8FAFC` | Page background |
| `border` | `#E2E8F0` | Card borders, dividers |
| `text-primary` | `#0F172A` | Main body text |
| `text-muted` | `#64748B` | Secondary text, labels |

### 11.3 Typography

| Scale | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `display` | Inter | 48px | 700 | Hero headlines |
| `h1` | Inter | 36px | 700 | Page titles |
| `h2` | Inter | 28px | 600 | Section headings |
| `h3` | Inter | 22px | 600 | Card titles |
| `h4` | Inter | 18px | 500 | Sub-headings |
| `body-lg` | Inter | 16px | 400 | Main body copy |
| `body` | Inter | 14px | 400 | UI text |
| `caption` | Inter | 12px | 400 | Metadata, labels |
| `mono` | JetBrains Mono | 13px | 400 | Code, tech stack tags |

### 11.4 Spacing System (4px base)
- `xs` = 4px | `sm` = 8px | `md` = 16px | `lg` = 24px | `xl` = 32px | `2xl` = 48px | `3xl` = 64px

### 11.5 Border Radius
- `sm` = 6px (inputs, small buttons)
- `md` = 10px (cards)
- `lg` = 16px (modals, panels)
- `full` = 9999px (badges, pills, avatars)

### 11.6 Shadow Scale
```css
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
shadow-md:  0 4px 6px rgba(0,0,0,0.07)
shadow-lg:  0 10px 15px rgba(0,0,0,0.1)
shadow-xl:  0 20px 25px rgba(0,0,0,0.12)
```

### 11.7 Component Library (shadcn/ui base)

| Component | Customisation Notes |
|-----------|-------------------|
| `Button` | Primary, Secondary, Ghost, Danger variants |
| `Card` | Default, Elevated, Outlined |
| `Badge` | Category, Status, Verified, Risk-level |
| `ListingCard` | Custom: app thumbnail, price, category, offers count |
| `Avatar` | With verified overlay badge |
| `Input` | With validation state (error, success) |
| `Select` | Styled for filter dropdowns |
| `Modal` | Offer modal, confirmation modal |
| `Tabs` | For listing detail page sections |
| `Progress` | Funding progress bar |
| `Toast` | Success / error / info notifications |
| `Skeleton` | Loading state for listing cards and dashboards |
| `DataTable` | TanStack Table base, custom column renderers |
| `Chart` | Recharts wrapper with MVPLab theme |
| `FileUpload` | Drag-and-drop for listing images/documents |
| `StepWizard` | Multi-step listing creation form |
| `OfferCard` | Shows offer amount, type, status, and actions |

### 11.8 Icon Library
- **Lucide React** — primary icon set (consistent with shadcn/ui)
- **Custom SVG icons** for: MVPLab logo, app category icons, badge icons

---

## 12. Tech Stack

### 12.1 Frontend

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Components** | shadcn/ui (Radix UI primitives) |
| **State (client)** | Zustand |
| **State (server)** | TanStack Query v5 |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Tables** | TanStack Table v8 |
| **Rich Text** | TipTap (seller descriptions, Q&A) |
| **File Upload** | UploadThing |
| **Animations** | Framer Motion |
| **Auth** | NextAuth.js v5 |
| **Date Handling** | date-fns |
| **Image Optimisation** | Next.js Image + Cloudinary |

### 12.2 Backend (Marketplace API)

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22 |
| **Framework** | Fastify 5 |
| **Language** | TypeScript 5 |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL 16 (AWS Aurora Serverless v2) |
| **Search** | Meilisearch (full-text listing search + filters) |
| **Cache** | Redis 7 (ElastiCache) |
| **Queue** | BullMQ |
| **File Storage** | AWS S3 + CloudFront |
| **CDN / Images** | Cloudinary (listing screenshots, auto-resize) |
| **Email** | Resend |
| **Auth** | JWT RS256 + Refresh Token rotation |
| **Payments** | Stripe (buyer deposits) + Stripe Connect (seller payouts) |
| **API Docs** | Scalar + OpenAPI 3.1 |
| **Validation** | Zod |
| **Testing** | Vitest + Supertest |

### 12.3 Integrations

| Integration | Purpose |
|-------------|---------|
| **MVPLab Investment API** | Trigger group investment from marketplace listing |
| **Stripe Connect** | Seller onboarding, payout management |
| **HaveIBeenPwned API** | Breached password checking on signup |
| **Meilisearch** | Listing search, autocomplete, faceted filtering |
| **Cloudinary** | Listing image upload, optimisation, CDN delivery |
| **Resend** | Transactional emails (offers, verification, etc.) |
| **OneSignal** | Push notifications |
| **Sentry** | Error monitoring |

### 12.4 Infrastructure

| Service | Tool |
|---------|------|
| **Hosting** | AWS ECS Fargate |
| **Database** | AWS RDS Aurora PostgreSQL |
| **Cache** | AWS ElastiCache Redis |
| **CDN** | AWS CloudFront |
| **Search** | Meilisearch (self-hosted on EC2 or Railway) |
| **Object Storage** | AWS S3 |
| **CI/CD** | GitHub Actions |
| **IaC** | Terraform |
| **Secrets** | AWS Secrets Manager |
| **Monitoring** | CloudWatch + Sentry |

---

## 13. Key User Flows

### 13.1 Seller Lists an App
```
Sign Up (role: Seller) → Verify Email → Complete Profile →
Create Listing (5-step wizard) → Submit for Review →
MVPLab Reviews (1–3 business days) → Listing Goes Live →
Seller Notified → Offers Start Coming In
```

### 13.2 Buyer Purchases an App
```
Browse Marketplace → View Listing Detail → Click "Make an Offer" →
Enter Offer Amount + Message → Submit →
Seller Notified → Seller Accepts/Rejects/Counters →
If Accepted: Escrow payment held → Transfer process begins →
Assets transferred → Funds released to seller →
Platform fee deducted → Deal marked Complete
```

### 13.3 Group Investment via MVPLab Investment
```
Browse Marketplace → Find Investment Listing →
Click "Invest as a Group" →
Redirected to MVPLab Investment with listing prefilled →
Investor Signs In / Signs Up on Investment platform →
Chooses stake % and amount →
Stakes pooled with other group members →
Funding target hit → MVPLab takes over operations →
Investors receive monthly ROI
```

### 13.4 Offer Negotiation
```
Buyer submits offer → Seller receives notification →
Seller can: Accept | Reject | Counter-Offer →
If Counter: Buyer receives counter, can Accept | Reject | Counter →
Max 3 rounds of counter before offer must be accepted/rejected →
Final acceptance triggers escrow + transfer process
```

---

## 14. Search & Discovery

### 14.1 Search Features (Meilisearch)
- Full-text search across: app name, description, tech stack
- Autocomplete suggestions (debounced 300ms)
- Typo-tolerant (Meilisearch default)

### 14.2 Filters
| Filter | Type |
|--------|------|
| Category | Multi-select |
| Listing Type | Sale / Investment / Both |
| Price Range | Slider (min–max) |
| Monthly Revenue | Range |
| Risk Rating | Multi-select |
| Revenue Verified | Toggle |
| Age of App | Range (months) |
| Sort By | Newest / Price ↑ / Price ↓ / Most Viewed / Most Saved |

### 14.3 Listing Card
Each card shows:
- App icon / screenshot
- App name
- Category badge
- Listing type badge (For Sale / Investment)
- Asking price
- Monthly revenue (if disclosed) or "Revenue not disclosed"
- "Verified Revenue" badge (if submitted)
- Save (bookmark) button

---

## 15. Offer & Escrow Flow

### Offer States
```
draft → submitted → viewed_by_seller → accepted | rejected | countered → completed | expired
```

### Escrow Rules
- On offer acceptance: buyer's funds moved to escrow (held by Stripe)
- Transfer checklist provided: source code, domain, accounts, etc.
- Seller marks each item transferred
- Buyer confirms receipt of each item
- On full completion: funds released to seller minus platform fee
- Dispute window: 7 days after fund release for buyer to raise issues
- Platform fee: 5–10% of sale price (sliding scale, lower % for higher-value deals)

---

## 16. Notifications

| Event | Channels |
|-------|---------|
| New offer received | Email + Push + In-app |
| Offer accepted | Email + Push + In-app |
| Offer rejected / countered | Email + Push + In-app |
| Listing approved by admin | Email + In-app |
| Listing rejected by admin | Email + In-app |
| Transfer step completed | Email + In-app |
| Funds released | Email + Push + In-app |
| New Q&A question on listing | Email + In-app |
| Seller responded to Q&A | Email + In-app |
| New listing matching saved search | Email + In-app |
| Investment funding target reached | Email + Push + In-app |

---

## 17. SEO & Performance

- Static generation for all public listing pages (Next.js SSG with ISR — revalidate every 10 minutes)
- Dynamic `og:image` generation per listing using `@vercel/og`
- Structured data (`schema.org/Product`) on listing detail pages
- Sitemap auto-generated from published listings
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Lazy loading for listing images with Next.js Image
- Pagination over infinite scroll (better for SEO and performance)

---

## 18. Admin — Listing Review Criteria

Before a listing goes live, an admin checks:

- [ ] App name is genuine and not misleading
- [ ] Description is coherent and in English
- [ ] Revenue claims are plausible (or verified evidence submitted)
- [ ] Cover image meets quality standards
- [ ] Transfer terms are clearly stated
- [ ] No prohibited content (adult apps, gambling, illegal services)
- [ ] Seller account is email-verified
- [ ] For high-value listings (> $10,000): KYC required before approval

---

## 19. Monetisation

| Stream | Rate |
|--------|------|
| **Listing Fee** | Free (standard), $29/month (featured placement) |
| **Sale Commission** | 8% on deals < $5,000 / 5% on deals $5,000–$50,000 / 3% on deals > $50,000 |
| **Investment Facilitation** | Handled by MVPLab Investment platform fee |
| **Escrow Service** | Included in commission |
| **Premium Seller Profile** | $19/month (priority listing, analytics, badge) |
| **Promoted Listings** | $49–$199 per week based on category |

---

## 20. Success Metrics

| Metric | 6-Month | 12-Month |
|--------|---------|----------|
| Registered Users | 2,000 | 10,000 |
| Active Listings | 50 | 250 |
| Deals Closed | 15 | 75 |
| Avg. Deal Value | $3,000 | $5,000 |
| Investment Deals (via Investment platform) | 5 | 25 |
| Monthly GMV | $15,000 | $100,000 |
| Seller Repeat Rate | 30% | 50% |

---

## 21. Open Questions

1. Does the marketplace vet the quality of the app code before listing, or only financial disclosure?
2. Is the escrow managed by MVPLab directly or via Stripe Escrow / third party?
3. What is the dispute resolution process if a seller disputes transfer completion?
4. Will the platform support non-USD currencies at launch?
5. Is there a rating/review system for sellers post-deal?
6. How tightly does the Investment flow need to be integrated — same account or separate sign-in?

---

*This PRD is a living document. Update it as requirements are clarified during design and development sprints.*
