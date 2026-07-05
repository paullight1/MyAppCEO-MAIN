# Offer & Escrow Operations

## Overview
Legal and technical workflow for secure asset transfers and funds holding during a marketplace transaction.

## 1. Transaction Workflow
1. **Offer Made:** Buyer submits a binding offer with proof of funds.
2. **Acceptance:** Seller accepts; funds are moved to MVPLAB Escrow account.
3. **Inspection Period:** Buyer has 7 days to verify code, assets, and financials.
4. **Approval/Dispute:** Buyer approves transfer OR raises a dispute.
5. **Release:** Funds released to Seller (minus commission); Assets transferred to Buyer.

## 2. Asset Transfer Checklist
- Domain name transfer (EPP codes).
- Source code repository (GitHub/GitLab transfer).
- Third-party accounts (AWS, SendGrid, etc.).
- Customer data migration (GDPR compliant).

## 3. Escrow Security
- Funds are held in a segregated "Client Funds" account via Stripe Connect.
- Multi-signature approval required for any manual fund releases > $10,000.

## 4. Dispute Resolution
- Mediation by MVPLAB Admin team.
- Final decision binding based on the terms signed in the `LEGAL_TERMS_CONDITIONS.md`.

## Implementation Notes
- All communication during Escrow must occur within the MVPLAB platform for audit purposes.
- Use a state-machine in the backend to manage Escrow statuses.
