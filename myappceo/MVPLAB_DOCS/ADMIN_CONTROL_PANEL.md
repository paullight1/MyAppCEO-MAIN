# Admin Control Panel

## Overview
Defines how the `MVPLAB_ADMIN` app oversees marketplace operations, user management, and disputes.

## 1. Core Modules

### User Management
- View user profiles, transaction history, and KYC status.
- Ban/Suspend accounts for TOS violations.
- Impersonation mode for support troubleshooting.

### Listing Moderation
- Queue of "Pending Review" app listings.
- Tools for approving, rejecting (with reasons), or requesting modifications.

### Financial Oversight
- Monitor platform revenue and upcoming payouts.
- Manual override for Escrow fund releases.

### Dispute Resolution Center
- View all active disputes between Buyers and Sellers.
- Upload evidence and issue final rulings.

## 2. Marketplace CEO Oversight
The Admin panel (Port 3003) maintains a real-time connection with the Marketplace CEO Dashboard to facilitate platform-wide optimizations.

### Sync Mechanism
- **Endpoint:** `/api/admin/marketplace/sync`
- **Method:** POST (Webhook)
- **Data:** Receives events from the Marketplace's Optimization Engine.

### Core Signals
- **Improvement Suggestions:** Automated AI-driven recommendations from the CEO Dashboard that require Admin approval (e.g., category restructuring or global fee adjustments).
- **Price Change Alerts:** Notifications when high-volume apps undergo significant price fluctuations, allowing Admins to monitor for market manipulation.

## 3. Security & Audit
- All Admin actions are logged in a read-only audit trail.
- Require 2FA for all Admin-level logins.
- IP whitelisting for accessing the Admin panel.

## Implementation Notes
- Built using the same design system as the Marketplace but with a distinct "Internal" visual theme.
- Roles: `SuperAdmin`, `Moderator`, `SupportAgent`.
