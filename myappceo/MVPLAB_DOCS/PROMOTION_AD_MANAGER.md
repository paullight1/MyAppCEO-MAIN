# Promotion & Ad Manager (App Positioning)

## Overview
A CEO can use the Ad Manager to purchase premium "Positioning" for their app on the MVPLab Marketplace. This increases visibility to potential buyers and investors beyond organic discovery.

## 1. Promotion Slots

| Slot Type | Location | Description | Duration |
|-----------|----------|-------------|----------|
| **Hero Spotlight** | Marketplace Home | Top banner (1 slot only). | Weekly |
| **Featured List** | Marketplace Home | Curated 3-6 app grid. | Weekly |
| **Category Top** | Category Pages | Fixed top-row position for a niche. | Daily |
| **Sidebar Promo** | All App Detail Pages | Relevant "Recommended" sidebar slot. | CPC based |

## 2. Ad Booking Workflow
- **Campaign Setup:** CEO chooses the "Slot Type" from the [App Management Switchboard](./APP_MANAGEMENT_DETAIL.md).
- **Creative Upload:** CEO provides a dedicated ad banner (16:9) or uses the existing app screenshots.
- **Budgeting:** Fixed-fee for Spotlight/Featured; Cost-Per-Click (CPC) for Sidebar.
- **Payment:** Integrated with Stripe Checkout (processed via the [Commission Payout Models](./COMMISSION_PAYOUT_MODELS.md) architecture).
- **Approval:** Admin review of the ad creative before it goes live.

## 3. Performance Tracking
The Ad Manager provides a dedicated dashboard for each campaign:
- **Impressions:** How many users saw the promo.
- **CTR (Click-Through Rate):** Percentage of users who clicked.
- **Conversions:** How many of those clicks led to a "Save" or an "Offer".
- **ROI:** Estimated return on investment based on campaign cost vs. resulting offers.

## 4. Automation & Bidding
- **Automatic Top-up:** Option to auto-renew a campaign if budget hits 0.
- **Smart Placement:** AI suggests the best category based on the app's performance in the [Optimization Engine](./APP_OPTIMIZATION_ENGINE.md).

## Implementation Notes
- Ad status is tracked in the `AdCampaign` entity with states: `Draft`, `Pending`, `Running`, `Completed`, `Paused`.
- Real-time slot availability is checked via the [Dynamic Config API](./DYNAMIC_CONFIG_API.md).
- Ad delivery on the frontend is optimized for zero-latency using Edge caching.
