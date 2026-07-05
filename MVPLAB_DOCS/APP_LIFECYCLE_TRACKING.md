# App Lifecycle Tracking

## Overview
Defines the technical and business stages of an app project within the MVPLAB ecosystem.

## 1. Lifecycle Stages

| Stage | Name | Description | Transition Trigger |
|-------|------|-------------|--------------------|
| 1 | **In-Development** | Project is being built; internal testing phase. | Developer submits for review. |
| 2 | **Publishing** | Undergoing manual/automated moderation checks. | Admin approval or rejection. |
| 3 | **Live** | Visible on the marketplace; active for sale/usage. | Seller deactivates or license sold. |
| 4 | **Sold/Archived** | Ownership transferred or project discontinued. | Completion of Escrow process. |

## 2. Tracking Metrics
- **Build Health:** Automated CI/CD status.
- **Engagement:** Daily Active Users (DAU) during the Live phase.
- **Revenue:** MRR/ARR tracking via API telemetry.

## 3. State Management
The `AppProject` entity in the database maintains a `status` field mapped to the following Enum:
- `DRAFT`
- `PENDING_REVIEW`
- `REJECTED`
- `APPROVED`
- `LIVE`
- `SOLD`
- `ARCHIVED`

## Implementation Notes
- Status changes trigger automated email notifications to stakeholders.
- Transition from `Approved` to `Live` requires a valid Stripe integration.
