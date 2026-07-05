# PLAN_04: Promotion Monitoring Dashboard

## Overview
Create a comprehensive monitoring dashboard similar to Amazon Seller Central or TikTok Ads Manager, where CEOs can track the performance of their promoted products/apps in real-time. This provides visibility into how campaigns are performing, which creators are driving results, and ROI tracking.

## Problem Statement
Currently:
- No dedicated monitoring for promoted products
- Can't see which creators are performing best
- No real-time performance metrics
- Missing conversion/sales tracking

Users need:
- Real-time campaign performance tracking
- Creator performance analytics
- Traffic and conversion monitoring
- ROI calculations per campaign/app
- Alerts for underperforming campaigns

---

## Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  📈 Promotion Analytics                              [Date Range ▼] [Export] │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   $24,500   │  │    156K     │  │   3.2%     │  │   4.8x     │          │
│  │  Total Spent│  │ Total Reach │  │  Conv. Rate │  │     ROI     │          │
│  │   ↑12%      │  │    ↑28%     │  │    ↑0.5%   │  │    ↑1.2x   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Performance Over Time                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │     │                                                                    │ │
│  │     │            ╭──────────╮                                              │ │
│  │     │       ╭────╯          ╰────╮                                         │ │
│  │ ────╯───────╯                    ╰─────────╮                              │ │
│  │                                              ╰──                           │ │
│  │     Jan          Feb          Mar          Apr                            │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│        ── Spend ($)    ── Reach (K)    ── Conversions                         │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌────────────────────────────────┐  ┌────────────────────────────────────┐   │
│  │  Campaign Performance          │  │  Top Performing Creators           │   │
│  │                                │  │                                     │   │
│  │  [Search campaigns...]        │  │  1. @gaming_creator  45 conversions│   │
│  │                                │  │     → $890 spent  → $4,200 revenue  │   │
│  │  ───────────────────────────  │  │                                     │   │
│  │                                │  │  2. @saas_expert     32 conversions │   │
│  │  Spring Launch Blitz     ●    │  │     → $650 spent  → $2,800 revenue  │   │
│  │  HealthSync AI          ●    │  │                                     │   │
│  │  Active • $5,000 • 1.2M     │  │  3. @tech_reviewer    28 conversions │   │
│  │                                │  │     → $500 spent  → $2,100 revenue  │   │
│  │  ───────────────────────────  │  │                                     │   │
│  │                                │  │  [View All Creators →]             │   │
│  │  Viral Challenge #1     ○    │  │                                     │   │
│  │  VideoMate Pro          ○    │  │  ┌────────────────────────────────────┐ │
│  │  Draft • $2,500 • 450K      │  │  │  Creator Performance Chart         │ │
│  │                                │  │  │                                 │ │
│  │  ───────────────────────────  │  │  ████████████░░░░░░░              │ │
│  │                                │  │                                     │ │
│  │  Weekend Boost          ●    │  │                                     │ │
│  │  EduTrack SaaS          ●    │  │                                     │ │
│  │  Paused • $1,200 • 89K      │  │                                     │ │
│  │                                │  │                                     │ │
│  └────────────────────────────────┘  └────────────────────────────────────┘   │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  App-by-App Performance                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  App          │  Campaign Spend │  Revenue   │  ROI    │  Status       │  │
│  │ ────────────────────────────────────────────────────────────────────── │  │
│  │  HealthSync AI│  $8,500          │  $42,500   │  5.0x   │  🟢 Healthy   │  │
│  │  VideoMate Pro│  $4,200          │  $12,800   │  3.0x   │  🟢 Healthy   │  │
│  │  EduTrack SaaS│  $2,800          │  $5,600    │  2.0x   │  🟡 Needs Attn│  │
│  │  VoiceLab AI  │  $1,500          │  $2,100    │  1.4x   │  🔴 Low Perf  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Analytics Overview Cards

**Key Metrics**:
| Metric | Description |
|--------|-------------|
| Total Spent | Sum of all campaign spend |
| Total Reach | Combined reach across campaigns |
| Conversion Rate | (Conversions / Reach) × 100 |
| ROI | Revenue / Spend ratio |
| Active Campaigns | Count of running campaigns |
| Top Creator | Best performing creator |

### Phase 2: Performance Charts

Using existing charting library (Recharts):
- **Spend vs Revenue**: Dual-axis line chart
- **Reach Over Time**: Area chart
- **Conversions Trend**: Bar chart
- **Creator Performance**: Horizontal bar chart

### Phase 3: Campaign Table

**Columns**:
- Campaign Name
- Status (Active/Paused/Draft)
- Budget Spent / Budget Total
- Reach
- Conversions
- ROI
- Actions (Pause, Edit, View Details)

**Features**:
- Sort by any column
- Search/filter campaigns
- Pagination

### Phase 4: Creator Performance Tracking

Track per-creator metrics:
- Content pieces delivered
- Reach generated
- Conversions driven
- Revenue attributed
- Cost per conversion
- ROI

### Phase 5: App-Level Aggregation

Group metrics by app:
- Total spend per app
- Total revenue per app
- ROI per app
- Health status (based on thresholds)

---

## Data Model

### Extended Campaign Interface
```typescript
interface CampaignMetrics {
  campaignId: string;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  roi: number;
  topCreators: CreatorPerformance[];
}

interface CreatorPerformance {
  creatorId: string;
  creatorName: string;
  contentPieces: number;
  reach: number;
  conversions: number;
  revenue: number;
  spend: number;
}

interface AppMetrics {
  appId: string;
  appName: string;
  totalSpend: number;
  totalRevenue: number;
  totalReach: number;
  conversions: number;
  roi: number;
  healthStatus: 'healthy' | 'needs_attention' | 'low_performance';
}
```

---

## API Endpoints

- `GET /analytics/promotion/overview` - Dashboard summary stats
- `GET /analytics/promotion/campaigns` - Campaign-level metrics
- `GET /analytics/promotion/creators` - Creator performance
- `GET /analytics/promotion/apps` - App-level aggregation
- `GET /analytics/promotion/timeseries` - Time-series data for charts

---

## UI Components

| Component | Description |
|-----------|-------------|
| `PromotionAnalyticsPage.tsx` | Main analytics page |
| `MetricCard.tsx` | Summary stat cards |
| `PerformanceChart.tsx` | Reusable chart component |
| `CampaignTable.tsx` | Campaign metrics table |
| `CreatorLeaderboard.tsx` | Top creators list |
| `AppPerformanceTable.tsx` | App-level metrics |
| `DateRangePicker.tsx` | Date range selector |
| `HealthStatusBadge.tsx` | Status indicator |

---

## Integration Points

1. **Promotion Hub** (`/promote`)
   - Add "Analytics" or "Monitor" tab
   - Link from campaign cards to detailed view

2. **Campaigns** (`useCampaigns`)
   - Extend with metrics data
   - Track conversions and revenue

3. **Wallet/Revenue** (`usePayments`)
   - Track revenue attributed to campaigns
   - Calculate true ROI

4. **Creators** (`useCreators`)
   - Link creator performance to metrics
   - Track content piece performance

---

## Alerting System

**Health Status Logic**:
```typescript
const getHealthStatus = (roi: number): HealthStatus => {
  if (roi >= 3) return 'healthy';
  if (roi >= 1.5) return 'needs_attention';
  return 'low_performance';
};
```

**Notifications**:
- Campaign underperforming (ROI < 1.5)
- Budget depleted
- Creator content approved/rejected

---

## Success Criteria
1. ✅ Dashboard shows accurate summary metrics
2. ✅ Performance charts render correctly
3. ✅ Campaign table is searchable and sortable
4. ✅ Creator performance tracked and displayed
5. ✅ App-level aggregation working
6. ✅ Date range filtering works
7. ✅ Health status indicators accurate
8. ✅ Export functionality works

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/pages/PromotionAnalyticsPage.tsx` | Create |
| `src/components/MetricCard.tsx` | Create |
| `src/components/PerformanceChart.tsx` | Create |
| `src/components/CampaignPerformanceTable.tsx` | Create |
| `src/components/CreatorLeaderboard.tsx` | Create |
| `src/components/AppPerformanceTable.tsx` | Create |
| `src/hooks/usePromotionAnalytics.ts` | Create |
| `src/App.tsx` | Add route |

---

## Priority: MEDIUM
This completes the promotion ecosystem by providing visibility into what's working and what isn't.