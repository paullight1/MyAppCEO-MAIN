# PLAN_01: Complete Promotion Hub Page

## Overview
Transform the existing basic `/promote` route (currently points to `CreatorsPage.tsx`) into a comprehensive **Promotion Hub** that serves as the central command center for all marketing and promotion activities.

## Problem Statement
The current `/promote` page (`CreatorsPage.tsx`) is incomplete:
- Only shows mock campaign data (hardcoded MOCK_CAMPAIGNS)
- Limited functionality - just a static page
- No connection to real campaign data, wallet, or product monitoring
- Missing key features users expect from a promotion platform

## User Stories
1. As a CEO, I want to see all my active promotion campaigns in one place
2. As a CEO, I want to create new promotion campaigns for my apps
3. As a CEO, I want to monitor my promotion performance metrics
4. As a CEO, I want quick access to hire UGC creators
5. As a CEO, I want to manage my promotion budget allocation

---

## Implementation Plan

### Phase 1: Page Structure & Layout

**File**: `src/pages/PromotionHubPage.tsx` (new file)

Create a new `PromotionHubPage` component with:
- **Header Section**: Page title, quick stats overview, "New Campaign" CTA
- **Navigation Tabs**: Campaigns | Budget | Analytics | Creators
- **Main Content Area**: Dynamic based on selected tab
- **Sidebar**: Quick actions, notifications, wallet summary

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Promotion Hub                        [+ New Campaign]  │
├─────────────────────────────────────────────────────────────┤
│  📊 Overview   📅 Campaigns   💰 Budget   👥 Creators      │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  💳 Wallet Balance       │
│  [Campaign Cards Grid]           │  $12,500 Available       │
│                                  │                          │
│  - Campaign 1: Active            │  [Add Funds]             │
│  - Campaign 2: Paused            │  ───────────────────     │
│  - Campaign 3: Draft             │  ⚡ Auto-Promote         │
│                                  │  $500/mo allocated       │
│                                  │  [Configure]             │
└──────────────────────────────────┴──────────────────────────┘
```

### Phase 2: Integrate Campaign Data

**File**: Modify `src/App.tsx`
- Change route `/promote` to use `PromotionHubPage` instead of `CreatorsPage`
- Keep `/promote/creators` for the dedicated UGC marketplace

**Update `PromotionHubPage.tsx`**:
- Import and use `useCampaigns` hook
- Fetch real campaign data
- Display campaign cards with real data (status, budget, reach, etc.)
- Implement campaign actions (pause, resume, cancel, edit)

**Campaign Card Component**:
```typescript
interface CampaignCardProps {
  campaign: Campaign;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onViewDetails: (id: string) => void;
}
```

### Phase 3: Quick Stats Dashboard

Add overview cards at the top:
| Stat | Description |
|------|-------------|
| Total Spent | Sum of all campaign budgets |
| Active Campaigns | Count of campaigns with status 'active' |
| Total Reach | Combined reach across all campaigns |
| ROI | Revenue generated / Amount spent |

### Phase 4: Integration Points

1. **Connect to Wallet** (`usePayments` or existing finance system)
   - Show available balance
   - Quick "Add Funds" action

2. **Connect to Apps** (use existing app listing)
   - Allow selecting which app to promote when creating campaign
   - Show app thumbnail/icon on campaign cards

3. **Connect to Creators**
   - "Find Creators" button navigates to `/promote/creators`
   - Show number of creators hired per campaign

---

## Technical Considerations

### Database Schema (if needed)
May require extending `campaigns` table:
```sql
-- Potential new columns
ALTER TABLE campaigns ADD COLUMN reach INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN impressions INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN conversions INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN auto_promote BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN daily_budget DECIMAL(10,2);
```

### API Endpoints (if needed)
- `GET /promotion/stats` - Aggregate promotion statistics
- `GET /promotion/overview` - Dashboard overview data

### Components to Create
1. `PromotionHubPage.tsx` - Main page container
2. `CampaignCard.tsx` - Individual campaign display
3. `CampaignStats.tsx` - Overview statistics
4. `BudgetSummary.tsx` - Wallet/budget sidebar
5. `CreateCampaignModal.tsx` - Campaign creation flow

---

## Dependencies
- `useCampaigns` - Already exists at `src/hooks/useCampaigns.ts`
- `usePayments` - Check if exists, may need to integrate
- `DashboardLayout` - Reuse existing component

---

## Success Criteria
1. ✅ Page loads at `/promote` route
2. ✅ Displays real campaign data (connected to API)
3. ✅ Shows accurate statistics from campaign data
4. ✅ "New Campaign" button opens creation flow
5. ✅ Campaign cards show status, budget, reach
6. ✅ Can pause/resume campaigns from UI
7. ✅ Wallet balance displayed
8. ✅ Quick access to UGC creators page

---

## Files to Modify
| File | Action |
|------|--------|
| `src/App.tsx` | Update `/promote` route to use new page |
| `src/pages/PromotionHubPage.tsx` | Create new page |
| `src/components/CampaignCard.tsx` | Create new component |
| `src/components/CampaignStats.tsx` | Create new component |
| `src/components/BudgetSummary.tsx` | Create new component |

---

## Priority: HIGH
This is the foundational page that other features (auto-promotion, UGC marketplace) will connect to.