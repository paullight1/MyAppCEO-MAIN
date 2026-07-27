# Product Requirements Document (PRD): MVPLAB Admin

## 1. Executive Summary
**MVPLAB Admin** is the centralized control panel for the entire MVPLab X ecosystem. Its primary objective is to provide comprehensive oversight and management capabilities across all platform functions, including Talents, Community, Investment, and VoiceLab.

## 2. Product Vision
To serve as the "Mission Control" for MVPLab X, enabling administrators to monitor system health, manage users, moderate content, approve financial transactions, and drive ecosystem growth from a single, unified interface.

## 3. Core Objectives
- **Centralized Oversight:** Monitor activity across all apps (Talents, Community, Investment).
- **Moderation & Quality Control:** Approve talent portfolios and UGC submissions.
- **Financial Governance:** Oversee payouts, commission collection, and escrow balances.
- **Operational Efficiency:** Streamline administrative tasks through automated dashboards.

## 4. Functional Requirements

### 4.1. Global Ecosystem Dashboard
- **Real-time Metrics:**
    - Total Registered Users (Talents vs. Clients vs. Community Creators).
    - Platform Revenue (Total Commission Collected).
    - Active Jobs & Projects.
    - UGC Engagement Stats (Global views/comments).
- **System Health:** Status indicators for integrated services (Supabase, Stripe, etc.).

### 4.2. Talent & Marketplace Management
- **Approval Workflow:** Queue for new talent profiles and portfolio updates.
- **Project Monitoring:** Oversight of active contracts, milestone status, and platform fees.
- **Dispute Resolution:** Tools to intervene and resolve conflicts between clients and developers.

### 4.3. Community & UGC Control Center
- **Submission Queue:** Review and verify UGC links (videos/posts) for viral payouts.
- **Ambassador Management:** Review applications, assign status, and monitor creator performance.
- **Campaign Creator:** Post "List of Opportunities" for ambassadors to promote specific AI apps.

### 4.4. Financial Operations
- **Payout Ledger:** Manage and approve withdraw requests for "Cashout" (Talents & Community).
- **Stripe Integration:** Dashboard for monitoring successful transfers and platform split-payments.
- **Commission Management:** Adjust platform percentage fees globally or per-user.

### 4.5. User & Role Management
- **Unified Search:** Find any user profile across the ecosystem.
- **Admin Roles:** Granular permissions (SuperAdmin, Finance, Moderator).
- **Security Logs:** Detailed audit trails of all administrative actions.

## 5. User Flows
1. **The Administrator Workflow:** Log in -> View Global Dashboard -> Check Approval Queues (Portfolios/UGC) -> Approve/Reject -> Review Pending Payouts -> Authorize Cashouts.
2. **The Helpdesk Workflow:** Search for a specific User/Project -> Review History -> Adjust settings or resolve disputes.

## 6. Technical Stack
- **Framework:** React 19 (Vite) / Next.js.
- **UI Components:** Tailwind CSS with a "Command Center" aesthetic (dark mode prioritized).
- **Backend:** Supabase (Service Role access).
- **Analytics:** Tremor or Recharts for data visualization.

## 7. Success Metrics
- **Response Time:** Time taken to approve portfolios or UGC submissions.
- **Financial Accuracy:** Zero discrepancies in commission tracking and payouts.
- **Ecosystem Health:** Growth in active users and TTV (Total Transaction Volume).
