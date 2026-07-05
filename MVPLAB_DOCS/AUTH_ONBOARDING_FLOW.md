# Auth & Onboarding Flow

## Overview
This document outlines the registration and verification process for Sellers and App Creators on the MVPLAB Marketplace.

## 1. Registration Process
| Step | Action | Description |
|------|--------|-------------|
| 1 | Account Creation | User provides email, password, and selects role (Sellers/App Creators). |
| 2 | Email Verification | Standard OTP or verification link sent to the registered email. |
| 3 | Profile Setup | Collection of personal/business details, social links, and portfolio. |

## 2. Identity Verification (KYC)
All Sellers must undergo identity verification to ensure platform security.
- **Documents Required:** Government ID, Proof of Address.
- **Integration:** Third-party KYC provider (e.g., Stripe Identity or Sumsub).
- **Turnaround:** Automated checks take < 5 mins; manual reviews up to 24 hours.

## 3. App Creator Specialized Onboarding
- **Technical Assessment:** Optional submission of GitHub profile or previous projects.
- **Agreement Sign-off:** Digital signature on MVPLAB Service Level Agreements (SLAs).

## 4. Seller Specialized Onboarding
- **Payout Setup:** Connection to Stripe Connect for automated disbursements.
- **Tax Information:** Submission of W-8/W-9 forms depending on jurisdiction.

## Implementation Notes
- Use JWT for session management.
- Multi-factor authentication (MFA) is mandatory for all accounts with financial access.
- Onboarding state is persisted in the `User` table under `onboarding_status`.
