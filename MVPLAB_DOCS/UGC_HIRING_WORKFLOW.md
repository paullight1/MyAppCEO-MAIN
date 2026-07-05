# UGC Hiring Workflow (The "Hire Creator" Flow)

## Overview
A CEO can hire a User Generated Content (UGC) creator to promote their app directly from the [App Management Switchboard](./APP_MANAGEMENT_DETAIL.md). This workflow ensures secure, performance-based payments via an escrow system.

## 1. The Workflow Steps

| Step | Action | Description | System |
|------|--------|-------------|--------|
| **1. Discovery** | **Search Creators** | CEO browses available creators by niche, rate, and performance. | Talent API |
| **2. Offer** | **Send Proposal** | CEO defines deliverables (e.g., "1 TikTok Video"), deadline, and budget. | Messaging / Offer |
| **3. Escrow** | **Lock Funds** | On acceptance, the CEO's funds are moved to a secure escrow. | [Escrow Operations](./OFFER_ESCROW_OPERATIONS.md) |
| **4. Creative** | **Submit Content** | Creator uploads raw or finished assets for approval. | Asset Storage / Review |
| **5. Release** | **Pay Creator** | CEO approves content; funds are released from escrow. | Stripe Connect |

## 2. Creator Discovery Interface
- **Filters:** Social platform (TikTok, IG, YouTube), average views, niche (FinTech, Gaming, SaaS).
- **Creator Profile:** Portfolio links, verified case studies, and current availability status.
- **Rating System:** "Creator Score" based on previous MVPLab campaign outcomes.

## 3. Escrow & Milestone Payments
The system supports two payout models:
- **One-Time:** Full payment on final approval.
- **Milestone-Based:** 30% on script approval, 70% on final video delivery.

## 4. Asset Approval & Monitoring
The CEO can:
- **Request Revisions:** Send feedback with timestamps.
- **Auto-Approve:** Set a 48-hour auto-approval window after delivery if no revisions are made.
- **Direct Post:** (Future) Automated posting to the app's official social channels.

## 5. The Talents Bridge
To ensure a seamless hiring experience, the Marketplace CEO Dashboard (Port 3000) hands off specific hiring workflows to the `MVPLAB_TALENTS` app (Port 3005).

### Deep Linking & State Handoff
When a CEO selects a creator from the Marketplace, the system redirects to the Talents portal with pre-populated offer details:
- **Base URL:** `http://localhost:3005/offers/new`
- **Parameters:**
  - `?hire=creator_id`: Targets the specific creator's profile.
  - `?budget=amount`: Carries over the budget set in the Marketplace.
  - `?app=app_id`: References the app being promoted.

### Multi-App Synergy
This architecture allows the Marketplace to handle the **Escrow & Financial** logic while the Talents app handles the **Creative Management & Portfolio** logic.

## Implementation Notes
- Payments are processed via Stripe Connect as defined in the [Commission Payout Models](./COMMISSION_PAYOUT_MODELS.md).
- Asset storage utilizes the `UploadThing` integration from the [PRD-mvplab-marketplace](./PRD-mvplab-marketplace.md).
- Status updates (Accepted, Delivered, Paid) trigger real-time notifications to both parties.
