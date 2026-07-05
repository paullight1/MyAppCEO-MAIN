# Marketplace Dashboard Strategy: Unified vs. Split

## Executive Summary
For the MVPLABX Marketplace, a **Unified Entry with Contextual Dashboards** is recommended over two separate sign-in portals. This approach maximizes user retention, reduces friction, and allows users to evolve within the ecosystem (e.g., an investor deciding to build their own app later).

---

## 1. Unified vs. Split Dashboard Analysis

### Recommendation: Unified Sign-In (Single Portal)
We should have **one primary sign-in**, but the dashboard interface should adapt based on the user's "Active Persona."

| Feature | Unified Entry (Recommended) | Split Portals (Avoid) |
| :--- | :--- | :--- |
| **User Experience** | Seamless. One account for everything. | Fragmented. Users need two accounts or separate logins. |
| **Engagement** | High. Builders see investment opportunities; Investors see how easy it is to build. | Siloed. Users are stuck in one track. |
| **Development** | DRY (Don't Repeat Yourself). One auth flow, one shared layout component. | High Overhead. Managing two separate codebases/routes for auth. |
| **Data Integrity** | Single source of truth for user profiles. | Risk of duplicated or conflicting user data. |

### How It Works (UX Design Thinking)
1. **The Entry:** User signs in at `marketplace.mvplabx.com/login`.
2. **The Switcher:** In the top navigation, a toggle allows the user to switch between **"My Apps" (Owner Mode)** and **"Opportunities" (Investor Mode)**.
3. **Role-Based Views:**
   - **Owner Mode:** Focuses on app performance, submission status, user metrics, and "Request Funding" buttons.
   - **Investor Mode:** Focuses on portfolio performance, browsing new apps, ROI metrics, and "Funding History."

---

## 2. Operational Flow within the Current System

Using the existing MVPLABX architecture, the project operates as a multi-layered ecosystem:

### A. Authentication & Data Layer (`MVPLAB_BACKEND`)
- **Supabase/Drizzle:** Acts as the central brain. Stores a single `users` table with a `role` or `permissions` JSON field.
- **Shared Logic:** The backend provides unified endpoints for both app management and investment tracking, secured by JWT roles.

### B. Front-End Presentation (`MVPLAB_MARKETPLACE`)
- **Vite/React/Tailwind:** The marketplace is the primary user interface.
- **Context API:** A `UserContext` provider detects the user's active mode and renders specific components:
  - `OwnerDashboard.tsx` for submitting and monitoring apps.
  - `InvestorDashboard.tsx` for monitoring investments and browsing.

### C. Cross-App Integration
- **`MVPLAB_INVESTMENT`:** When an investor clicks "Fund" in the Marketplace, the system triggers the investment engine's logic.
- **`MVPLAB_VOICELAB` / `MVPLAB_COMMUNITY`:** Builders in the Marketplace can access Talent or Community resources to improve their apps directly from their dashboard.

---

## 3. Customer-Focused Benefits
- **Empowerment:** A user who joins to develop an app might see another project and decide to invest their profits.
- **Trust:** A single, polished brand experience (Brand UI) builds more trust than multiple disjointed websites.
- **Support:** Customer support can see the user's entire history (both as a builder and an investor) in one view, leading to faster resolution.

---

## 4. Logical System Architecture (High Level)
1. **User Auth** → `MVPLAB_BACKEND` (NestJS)
2. **App Submission** → `MVPLAB_MARKETPLACE` → `BACKEND` → `POSTGRES`
3. **Investment Flow** → `MVPLAB_MARKETPLACE` (UI) → `MVPLAB_INVESTMENT` (Engine)
4. **Monitoring** → Real-time updates from `BACKEND` to the specific dashboard view the user is currently looking at.
