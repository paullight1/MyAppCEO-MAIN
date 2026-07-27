# App Management Detail (The Switchboard)

## Overview
The App Management Detail view is the "cockpit" for a CEO to manage a specific app in their portfolio. It transitions from the high-level metrics of the [CEO Dashboard](./CEO_DASHBOARD_CORE.md) to granular, actionable controls.

## 1. Layout Structure
- **App Header:** App Name, Status (Live/Development), Current Valuation, Quick-link to Live Site.
- **Main Telemetry Grid:** 4-column grid showing real-time [Telemetry Visualizations](./TELEMETRY_VISUALIZATION.md).
- **The Switchboard (Control Center):** A dedicated sidebar or tabbed section for executive actions.
- **Activity Log:** Recent changes, creator updates, and automated system alerts.

## 2. The Switchboard (CEO Actions)
The Switchboard provides a unified interface for non-destructive updates and growth operations.

| Action | Description | Integration |
|--------|-------------|-------------|
| **Hire Creator** | Launch the [UGC Hiring Workflow](./UGC_HIRING_WORKFLOW.md) to find talent for marketing or content. | Escrow / Talent API |
| **Optimize App** | Trigger the [App Optimization Engine](./APP_OPTIMIZATION_ENGINE.md) for UI/UX and SEO suggestions. | AI Analysis Agent |
| **Promote App** | Access the [Promotion & Ad Manager](./PROMOTION_AD_MANAGER.md) to purchase featured slots. | Stripe / Marketplace API |
| **Update Pricing** | Change price points or subscription tiers instantly via the [Dynamic Config API](./DYNAMIC_CONFIG_API.md). | Redis Cache / DB Sync |
| **Maintenance Toggle** | Put the app into "Maintenance Mode" without affecting database integrity. | Global Config |

## 3. Navigation & Context
- **Parent:** [CEO Dashboard Core](./CEO_DASHBOARD_CORE.md) -> "My Apps" Widget.
- **Sub-pages:** Detailed Analytics, Team/Permissions, Billing History.

## 4. UX Principles
- **Command & Control:** Every action in the Switchboard should have a confirmation modal and an immediate visual feedback loop.
- **Data-Driven:** Actions should be positioned next to relevant metrics (e.g., "Promote" button next to "DAU" chart).
- **Modular Design:** New Switchboard modules can be added by different agents without refactoring the core layout.

## Implementation Notes
- Uses `React Query` for state management to ensure the Switchboard reflects the "At-a-Glance" API state.
- Components are built using the [Design System Strategy](./DESIGN_SYSTEM_STRATEGY.md) (Tailwind + Shadcn/ui).
