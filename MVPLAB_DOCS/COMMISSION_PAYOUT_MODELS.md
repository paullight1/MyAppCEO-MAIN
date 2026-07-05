# Commission & Payout Models

## Overview
Outlines the platform fee structure, referral logic, and payout schedules for MVPLAB.

## 1. Platform Fee Structure
| Sale Type | MVPLAB Commission | Seller Portion |
|-----------|-------------------|----------------|
| Standard Sale | 15% | 85% |
| Premium/Managed Sale | 25% | 75% |
| Referral Sale | 10% | 90% |

## 2. Referral Logic
- **Affiliate Program:** 2.5% of the platform commission is shared with the referrer.
- **Duration:** Referrals are tracked for 90 days via cookie/session.

## 3. Payout Schedules
- **Standard:** 14-day escrow hold to ensure buyer satisfaction.
- **Verified Sellers:** 7-day expedited payouts.
- **Threshold:** Minimum payout amount is $50.00.

## 4. Payment Gateway
- **Primary:** Stripe Connect (Standard and Express accounts).
- **Secondary:** Bank Transfer (for large institutional sales > $50k).

## Implementation Notes
- All commissions are calculated server-side to prevent tampering.
- Tax withholding (if applicable) is calculated based on seller's W-8/W-9 status.
