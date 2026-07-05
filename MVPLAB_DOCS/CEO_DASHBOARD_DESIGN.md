# CEO Dashboard — UI/UX Design Specification

**Version:** 1.0  
**Date:** 2026-03-12  
**Type:** Design System & Wireframes  
**Status:** Draft  

---

## 1. Design Principles

### 1.1 Core Philosophy
- **Clarity Over Clutter:** Every metric should be understood in < 5 seconds
- **Actionable Insights:** Data should lead to clear next actions
- **Trust Through Transparency:** Show data sources and last updated times
- **Progressive Disclosure:** Start simple, reveal complexity on demand

### 1.2 Accessibility Goals
- WCAG 2.1 AA compliance
- Keyboard navigation for all features
- Screen reader optimized
- Color-blind safe palette

---

## 2. Layout System

### 2.1 Dashboard Grid
```
12-column responsive grid
- Desktop (1440px+): 12 columns, 24px gutters
- Tablet (768-1439px): 8 columns, 16px gutters
- Mobile (320-767px): 4 columns, 12px gutters

Container max-width: 1680px
```

### 2.2 Page Structure
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Top Navigation Bar (64px height)                           │
│  [Logo] [App Selector ▼] [Search] [Notifs] [Profile]        │
│                                                              │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│            │                                                 │
│  Sidebar   │   Main Content Area                            │
│  (280px)   │   - Page Header                                │
│            │   - Breadcrumbs                                │
│  [Nav      │   - Content Cards/Widgets                      │
│   Items]   │                                                 │
│            │                                                 │
│            │                                                 │
│            │                                                 │
│            │                                                 │
├────────────┴─────────────────────────────────────────────────┤
│                                                              │
│  Status Bar (40px height)                                   │
│  [Data: Updated 2m ago] [API: ● Connected] [Help]           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation Design

### 3.1 Sidebar Navigation
```
┌─────────────────────┐
│  MVPLAB         ▼   │  ← App selector (current app)
├─────────────────────┤
│  📊 Overview        │  ← Active state (highlighted)
│  📈 Analytics       │
│  🏪 Marketplace     │
│  💎 Stakes          │
│  🎬 Creators        │
│  💰 Finances        │
│  🔌 Connections     │
│  ⚙️ Settings        │
├─────────────────────┤
│  ────────────────   │
│  🆘 Support         │
│  📚 Documentation   │
└─────────────────────┘

Active Item:
- Background: #F1F5F9
- Left border: 3px solid #E94560
- Text: #0F172A (primary)

Inactive Item:
- Background: transparent
- Text: #64748B (muted)
- Hover: Background #F8FAFC
```

### 3.2 Top Navigation
```
┌─────────────────────────────────────────────────────────────┐
│ MVPLAB  │ My App ▼  │ 🔍 Search...  │ 🔔 3  │ 👤 John │ ▼  │
└─────────────────────────────────────────────────────────────┘

Elements (left to right):
1. Logo (40px × 40px)
2. App Selector Dropdown
3. Search Bar (expands on focus, 320px max)
4. Notifications Bell (badge for unread count)
5. Profile Avatar + Dropdown Menu

Dropdown: Profile
- My Account
- Billing
- API Keys
- ────
- Switch App
- Add New App
- ────
- Sign Out
```

---

## 4. Page Wireframes

### 4.1 Main Dashboard (Overview)
```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard / Overview                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   MRR    │  │  Users   │  │ Downloads│  │  Value   │       │
│  │ $12,450  │  │  8,234   │  │  15,420  │  │  $450K   │       │
│  │ ▲ 12.5%  │  │ ▲ 8.2%   │  │ ▲ 15.3%  │  │ ▲ 22.1%  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌────────────────────────────┐  ┌────────────────────────────┐│
│  │                            │  │  Revenue Breakdown         ││
│  │    Revenue Trend (Line)    │  │                            ││
│  │                            │  │  ┌────┐ ┌────┐ ┌────┐     ││
│  │    ───────╱╲──────         │  │  │Subs│ │Ads │ │IAP │     ││
│  │          ╱    ╲            │  │  │60% │ │25% │ │15% │     ││
│  │         ╱      ╲           │  │  └────┘ └────┘ └────┘     ││
│  │                            │  │                            ││
│  │   J   F   M   A   M   J    │  │  [View Full Report →]     ││
│  └────────────────────────────┘  └────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────┐  ┌────────────────────────┐│
│  │  Quick Actions                 │  │  Recent Activity       ││
│  │                                │  │                        ││
│  │  [+ New Listing]               │  │  ○ Connected Stripe    ││
│  │  [Launch Campaign]             │  │  ○ New offer: $50K    ││
│  │  [Sell Stake]                  │  │  ○ Campaign reached    ││
│  │  [Invite Co-founder]           │  │    goal (2h ago)       ││
│  │                                │  │  ○ Dividend paid       ││
│  │  [View All Actions →]          │  │  ○ New creator joined  ││
│  └────────────────────────────────┘  └────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Marketplace Preview                                       ││
│  │                                                            ││
│  │  ┌────────┐  ┌────────┐  ┌────────┐                      ││
│  │  │ Listing│  │ Listing│  │ Listing│  [+ Create]          ││
│  │  │ Card 1 │  │ Card 2 │  │ Card 3 │                      ││
│  │  └────────┘  └────────┘  └────────┘                      ││
│  │                                                            ││
│  │  [View All Listings →]                                     ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Analytics Page
```
┌─────────────────────────────────────────────────────────────────┐
│  Analytics                                          [Export ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Time Range: [Last 30 days ▼]  Compare: [Previous period ☐]    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Key Metrics                                             │  │
│  │                                                          │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │
│  │  │  MRR    │ │  ARPU   │ │   LTV   │ │  Churn  │       │  │
│  │  │ $12,450 │ │  $4.50  │ │  $125   │ │  3.2%   │       │  │
│  │  │ ▲ 12.5% │ │ ▲ 5.1%  │ │ ▲ 8.4%  │ │ ▼ 0.5%  │       │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────┐  ┌──────────────────────┐  │
│  │  Revenue Trends                │  │  User Growth         │  │
│  │                                │  │                      │  │
│  │  [Line Chart]                  │  │  [Area Chart]        │  │
│  │                                │  │                      │  │
│  │  • MRR  • ARR  • One-time     │  │  • DAU  • MAU        │  │
│  └────────────────────────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────┐  ┌──────────────────────┐  │
│  │  Retention Cohorts             │  │  Acquisition Sources │  │
│  │                                │  │                      │  │
│  │  [Heatmap Table]               │  │  [Donut Chart]       │  │
│  │                                │  │                      │  │
│  │  Week 1: ████████ 85%          │  │  Organic    45%      │  │
│  │  Week 2: ██████   65%          │  │  Paid Ads   30%      │  │
│  │  Week 4: ████     42%          │  │  Referrals  15%      │  │
│  │  Week 8: ██       28%          │  │  Other      10%      │  │
│  └────────────────────────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Custom Report Builder                                     ││
│  │                                                            ││
│  │  Metrics: [MRR ▼] [Downloads ▼] [MAU ▼]  [+ Add Metric]   ││
│  │  Group by: [Week ▼]  Filter: [All Users ▼]                ││
│  │                                                            ││
│  │  [Generate Report]  [Save as Template]                     ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Marketplace Page
```
┌─────────────────────────────────────────────────────────────────┐
│  Marketplace                                  [+ New Listing]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Active Listings (3)                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ┌────┐  My Awesome App                      ● Active     ││
│  │  │IMG │  Productivity • SaaS                               ││
│  │  └────┘                                                    ││
│  │         Asking: $75,000   MRR: $3,200   ▲ 18%             ││
│  │                                                            ││
│  │  ┌─────────────────────────────────────────────────────┐  ││
│  │  │ Performance: 234 views  •  12 saves  •  3 offers    │  ││
│  │  └─────────────────────────────────────────────────────┘  ││
│  │                                                            ││
│  │  [Edit]  [View Analytics]  [Pause]  [Offers (3) →]        ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ┌────┐  Mobile Game Pro                         Review   ││
│  │  │IMG │  Games • iOS/Android                             ││
│  │  └────┘                                                    ││
│  │         Asking: $25,000   MRR: $1,100   ▲ 5%              ││
│  │                                                            ││
│  │  ⚠️ Pending admin review (submitted 2 days ago)            ││
│  │                                                            ││
│  │  [Edit]  [View Preview]  [Withdraw]                       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Offers Received (5 pending)                               ││
│  │                                                            ││
│  │  ┌────────────────────────────────────────────────────┐   ││
│  │  │ My Awesome App  •  $65,000  •  John D.  •  2h ago  │   ││
│  │  │ [View Details] [Accept] [Reject] [Counter]         │   ││
│  │  └────────────────────────────────────────────────────┘   ││
│  │                                                            ││
│  │  [View All Offers →]                                       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [View Sold Listings (2)]  [View Drafts (1)]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Stakes Page
```
┌─────────────────────────────────────────────────────────────────┐
│  Stakes & Ownership                        [+ New Offering]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Active        │  │  Total Raised  │  │  Investors     │   │
│  │  Offerings     │  │                │  │                │   │
│  │  2             │  │  $125,000      │  │  23            │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  My Stake Offerings                                        ││
│  │                                                            ││
│  │  ┌─────────────────────────────────────────────────────┐  ││
│  │  │  App Name                            65% Funded      │  ││
│  │  │  ───────────────────────────────────────────────     │  ││
│  │  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░          │  ││
│  │  │  $65,000 / $100,000                                  │  ││
│  │  │                                                      │  ││
│  │  │  Price: $1,000 per 1%  •  Min: $5,000  •  12 investors│ ││
│  │  │                                                      │  ││
│  │  │  [Edit Offering]  [View Investors]  [Pause]          │  ││
│  │  └─────────────────────────────────────────────────────┘  ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Cap Table                                                 ││
│  │                                                            ││
│  │  ┌────────────────────────────────────────────────────┐   ││
│  │  │  Owner              Stake      Value     Vested    │   ││
│  │  ├────────────────────────────────────────────────────┤   ││
│  │  │  👤 You (Founder)    55%      $275,000   100%     │   ││
│  │  │  👥 Investors        35%      $175,000   85%      │   ││
│  │  │  🏢 MVPLab Platform  10%       $50,000   100%     │   ││
│  │  └────────────────────────────────────────────────────┘   ││
│  │                                                            ││
│  │  [Download Cap Table]  [Add Investor]                      ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Investment Opportunities (Browse Other Apps)              ││
│  │                                                            ││
│  │  ┌────────┐  ┌────────┐  ┌────────┐                      ││
│  │  │  App   │  │  App   │  │  App   │  [Browse All →]     ││
│  │  │  Card  │  │  Card  │  │  Card  │                      ││
│  │  └────────┘  └────────┘  └────────┘                      ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Dividend History                                          ││
│  │                                                            ││
│  │  Date          Amount      Recipients    Status           ││
│  │  ─────────────────────────────────────────────────────    ││
│  │  Mar 1, 2026   $8,500      12 investors  ✓ Paid          ││
│  │  Feb 1, 2026   $7,200      11 investors  ✓ Paid          ││
│  │  Jan 1, 2026   $6,800      10 investors  ✓ Paid          ││
│  │                                                            ││
│  │  [Next Payout: Apr 1, 2026 - Est. $9,200]  [Distribute Now]││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Creators Page
```
┌─────────────────────────────────────────────────────────────────┐
│  UGC Creator Programs                        [+ New Campaign]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Active Campaigns (4)                [All Campaigns ▼]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Spring Launch Campaign                    $3,250 / $5,000 ││
│  │  ─────────────────────────────────────────────────────     ││
│  │  ████████████████████████████░░░░░░░░░░░░░░░░░░░░          ││
│  │                                                            ││
│  │  Goal: 1,000 downloads  •  Current: 650  •  65%           ││
│  │  Creators: 12  •  End Date: Mar 30, 2026                  ││
│  │                                                            ││
│  │  Top Performers:                                           ││
│  │  🥇 @TechReviewer  -  234 downloads  -  $585 earned       ││
│  │  🥈 @AppGuru  -  189 downloads  -  $472 earned            ││
│  │  🥉 @MobilePro  -  156 downloads  -  $390 earned          ││
│  │                                                            ││
│  │  [View Analytics]  [Edit Campaign]  [Add Creators]        ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Find Creators                                             ││
│  │                                                            ││
│  │  Search: [____________________]  Category: [All ▼]        ││
│  │                                                            ││
│  │  ┌────────────────────────────────────────────────────┐   ││
│  │  │  👤 @TechReviewer              Gaming • Tech       │   ││
│  │  │  ───────────────────────────────────────────────── │   ││
│  │  │  📺 YouTube 500K  •  📱 TikTok 200K  •  💬 8.5%    │   ││
│  │  │  Avg. Views: 50K  •  Rate: $2,000/video            │   ││
│  │  │  ⭐ 4.9 (24 campaigns)  •  ✓ Verified              │   ││
│  │  │                                                    │   ││
│  │  │  [View Profile]  [Invite to Campaign]              │   ││
│  │  └────────────────────────────────────────────────────┘   ││
│  │                                                            ││
│  │  [Browse All Creators →]                                   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Pending Payouts ($4,250 total)                            ││
│  │                                                            ││
│  │  Creator           Campaign          Amount     Due Date   ││
│  │  ─────────────────────────────────────────────────────     ││
│  │  @TechReviewer     Spring Launch     $585       Mar 15    ││
│  │  @AppGuru          Spring Launch     $472       Mar 15    ││
│  │  @MobilePro        Spring Launch     $390       Mar 15    ││
│  │  ...               ...               ...        ...       ││
│  │                                                            ││
│  │  [Review & Pay All]  [Export for Accounting]               ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 Finances Page
```
┌─────────────────────────────────────────────────────────────────┐
│  Financial Command Center                          [Reports ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Revenue  │  │ Expenses │  │  Profit  │  │  Runway  │       │
│  │ $18,500  │  │  $6,200  │  │  $12,300 │  │  14 mo   │       │
│  │ ▲ 15.2%  │  │ ▲ 8.5%   │  │ ▲ 19.8%  │  │ ▼ 2 mo   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌────────────────────────────────┐  ┌──────────────────────┐  │
│  │  P&L Overview                  │  │  Revenue by Source   │  │
│  │                                │  │                      │  │
│  │  Revenue         $18,500       │  │  ┌────┐ ┌────┐      │  │
│  │  ─────────────────────         │  │  │Subs│ │Stake│     │  │
│  │  COGS            ($3,200)      │  │  │55% │ │ 25% │     │  │
│  │  ─────────────────────         │  │  └────┘ └────┘      │  │
│  │  Gross Profit    $15,300       │  │  ┌────┐ ┌────┐      │  │
│  │  Operating Exp   ($6,200)      │  │  │App │ │Affil│     │  │
│  │  ─────────────────────         │  │  │Sales│ │ 10%│     │  │
│  │  Net Profit      $12,300       │  │  └────┘ └────┘      │  │
│  │                                │  │                      │  │
│  │  Margin: 66.5%  ▲ 3.2%         │  │  [View Breakdown →]  │  │
│  └────────────────────────────────┘  └──────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────┐  ┌──────────────────────┐  │
│  │  Expense Categories            │  │  Cash Flow           │  │
│  │                                │  │                      │  │
│  │  ┌──────────────────────────┐  │  │  [Line Chart]        │  │
│  │  │ Creator Pay   $3,250     │  │  │                      │  │
│  │  │ Ads         $2,100       │  │  │  In  ████░░░░░░      │  │
│  │  │ Tools       $850         │  │  │  Out ███░░░░░░░      │  │
│  │  │ Total       $6,200       │  │  │                      │  │
│  │  └──────────────────────────┘  │  │  J  F  M  A  M  J    │  │
│  │                                │  │                      │  │
│  │  [Manage Expenses →]           │  │  [Projections →]     │  │
│  └────────────────────────────────┘  └──────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Commission Splits                                         ││
│  │                                                            ││
│  │  Recipient          Type         %      Paid YTD   Action ││
│  │  ─────────────────────────────────────────────────────     ││
│  │  Co-founder         Revenue      30%    $45,000    [Edit] ││
│  │  Affiliate Program  Commission  10%    $15,000    [Edit] ││
│  │  Investor A         Dividend     15%    $22,500    [Edit] ││
│  │  Investor B         Dividend     10%    $15,000    [Edit] ││
│  │                                                            ││
│  │  [+ Add Recipient]  [Simulate Split]                       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Forecasts (Next 12 Months)                                ││
│  │                                                            ││
│  │  ┌────────────────────────────────────────────────────┐   ││
│  │  │  Scenario      Q2      Q3      Q4      Q1 2027    │   ││
│  │  │  Conservative  $65K    $72K    $80K    $88K       │   ││
│  │  │  Base          $75K    $88K    $102K   $118K      │   ││
│  │  │  Optimistic    $90K    $110K   $135K   $165K      │   ││
│  │  └────────────────────────────────────────────────────┘   ││
│  │                                                            ││
│  │  [Adjust Assumptions]  [Export Forecast]                   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.7 API Connections Page
```
┌─────────────────────────────────────────────────────────────────┐
│  API Connections                             [+ New Connection] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Connected Services (5)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ┌──────┐  Stripe                          ● Connected    ││
│  │  │Stripe│  ─────────────────────────────────────────────  ││
│  │  └──────┘  Last sync: 5 minutes ago                       ││
│  │                                                            ││
│  │  Metrics: MRR, Transactions, Refunds, Subscriptions       ││
│  │  Status: ✅ Healthy  •  Rate limit: 450/1000              ││
│  │                                                            ││
│  │  [Sync Now]  [Configure]  [Revoke Access]                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ┌──────┐  App Store Connect               ● Connected    ││
│  │  │Apple │  ─────────────────────────────────────────────  ││
│  │  └──────┘  Last sync: 2 hours ago                         ││
│  │                                                            ││
│  │  Metrics: Downloads, Revenue, Ratings, Reviews            ││
│  │  Status: ✅ Healthy  •  Rate limit: 200/1000              ││
│  │                                                            ││
│  │  [Sync Now]  [Configure]  [Revoke Access]                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  ┌──────┐  Google Play Console            ⚠️ Error       ││
│  │  │Google│  ─────────────────────────────────────────────  ││
│  │  └──────┘  Last sync: 1 day ago                           ││
│  │                                                            ││
│  │  ❌ Authentication failed. Please re-connect.              ││
│  │                                                            ││
│  │  [Re-connect]  [View Error Details]  [Remove]             ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Available Services                                        ││
│  │                                                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                ││
│  │  │ Firebase │  │RevenueCat│  │Meta Ads  │  [+ Connect]   ││
│  │  └──────────┘  └──────────┘  └──────────┘                ││
│  │                                                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                ││
│  │  │Google Ads│  │TikTok Ads│  │ YouTube  │  [+ Connect]   ││
│  │  └──────────┘  └──────────┘  └──────────┘                ││
│  │                                                            ││
│  │  [View All Services →]                                     ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  API Usage Summary                                         ││
│  │                                                            ││
│  │  Total API Calls (24h): 2,450  •  Errors: 3  •  Avg Latency: 245ms│
│  │                                                            ││
│  │  [View Detailed Logs]  [Set Up Webhooks]                   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 Metric Card
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  format?: 'currency' | 'number' | 'percentage';
  change?: number; // positive or negative
  changeLabel?: string; // e.g., "vs last month"
  trend?: 'positive' | 'negative' | 'neutral';
  icon?: React.ComponentType;
  footer?: string;
  tooltip?: string;
  onClick?: () => void;
}

// Visual States:
// - Positive change: Green arrow ▲ +12.5%, text #22C55E
// - Negative change: Red arrow ▼ -5.2%, text #EF4444
// - Neutral: Gray dash — 0%, text #64748B
```

### 5.2 Chart Components
```typescript
interface RevenueChartProps {
  data: TimeSeriesData[];
  timeframe?: '7d' | '30d' | '90d' | '12m';
  metrics?: string[]; // ['mrr', 'arr', 'one_time']
  showLegend?: boolean;
  showTooltip?: boolean;
  currency?: string;
}

interface RetentionCohortProps {
  cohorts: CohortData[];
  period?: 'days' | 'weeks' | 'months';
  colorScheme?: 'gradient' | 'discrete';
}

interface ValuationGaugeProps {
  current: number;
  previous?: number;
  min?: number;
  max?: number;
  format?: 'currency' | 'number';
}
```

### 5.3 Data Table
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  rowSelection?: boolean;
  actions?: RowActions<T>;
}

// Default styles:
// - Header: Background #F8FAFC, Text #475569, Font 13px SemiBold
// - Row: Border #E2E8F0, Hover #F1F5F9
// - Cell: Padding 12px 16px, Text #334155
```

### 5.4 Progress Indicators
```typescript
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  color?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

// Color mapping:
// - default: #3B82F6 (blue)
// - success: #22C55E (green)
// - warning: #F59E0B (amber)
// - error: #EF4444 (red)
```

### 5.5 Status Badges
```typescript
interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ComponentType;
  size?: 'sm' | 'md';
}

// Status colors:
// - Active/Success: bg #DCFCE7, text #166534
// - Pending/Warning: bg #FEF3C7, text #92400E
// - Error/Inactive: bg #FEE2E2, text #991B1B
// - Info: bg #DBEAFE, text #1E40AF
// - Default: bg #F1F5F9, text #475569
```

---

## 6. Interaction Patterns

### 6.1 Hover States
```
Metric Card Hover:
- Shadow: 0 4px 12px rgba(0,0,0,0.08)
- Transform: translateY(-2px)
- Transition: 200ms ease

Button Hover:
- Background: darken by 10%
- Cursor: pointer
- Transition: 150ms ease
```

### 6.2 Loading States
```
Skeleton Loader:
- Background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)
- Animation: shimmer 1.5s infinite
- Height: match content height

Chart Loading:
- Show skeleton rectangles for axes and data area
- No spinner during data fetch (use progressive loading)
```

### 6.3 Empty States
```
No Data:
- Icon: relevant illustration (80px)
- Title: Clear message (e.g., "No connections yet")
- Description: Helpful context (e.g., "Connect your first service to see metrics")
- CTA: Primary action button (e.g., "Connect Stripe")

No Results:
- Icon: search or filter illustration
- Title: "No matches found"
- Description: "Try adjusting your filters or search terms"
- CTA: "Clear all filters"
```

### 6.4 Error States
```
Connection Error:
- Icon: warning triangle (red)
- Title: "Connection failed"
- Description: Specific error message
- CTA: "Try again" or "Re-connect"
- Help link: "Troubleshooting guide"

Data Sync Error:
- Banner at top of relevant section
- Yellow background (#FEF3C7)
- Message: "Last sync failed 2 hours ago"
- Action: "Sync now" | "View error"
```

---

## 7. Responsive Breakpoints

### 7.1 Mobile (< 768px)
```
- Stack all cards vertically (1 column)
- Hide secondary metrics, show on expand
- Hamburger menu for sidebar
- Bottom nav for primary actions
- Charts: simplify, remove legends
- Tables: horizontal scroll or card view
```

### 7.2 Tablet (768px - 1439px)
```
- 2-column card grid
- Collapsible sidebar (icons only)
- Charts: full width, reduced detail
- Tables: show essential columns
```

### 7.3 Desktop (1440px+)
```
- Full 12-column grid
- Persistent sidebar
- All features visible
- Multi-column layouts
```

---

## 8. Design Files

### 8.1 Figma Organization
```
CEO Dashboard/
├── 🎨 Foundations/
│   ├── Colors
│   ├── Typography
│   ├── Icons
│   └── Grid System
├── 🧩 Components/
│   ├── Buttons
│   ├── Cards
│   ├── Charts
│   ├── Tables
│   ├── Forms
│   └── Navigation
├── 📄 Pages/
│   ├── Overview
│   ├── Analytics
│   ├── Marketplace
│   ├── Stakes
│   ├── Creators
│   ├── Finances
│   └── Connections
└── 📱 Responsive/
    ├── Mobile
    ├── Tablet
    └── Desktop
```

### 8.2 Design Tokens
```json
{
  "colors": {
    "primary": "#1A1A2E",
    "accent": "#0F3460",
    "highlight": "#E94560",
    "success": "#22C55E",
    "warning": "#F59E0B",
    "error": "#EF4444"
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "typography": {
    "display": { "font": "Inter", "size": "48px", "weight": "700" },
    "h1": { "font": "Inter", "size": "36px", "weight": "700" },
    "h2": { "font": "Inter", "size": "28px", "weight": "600" },
    "body": { "font": "Inter", "size": "14px", "weight": "400" }
  }
}
```

---

## 9. Prototype Requirements

### 9.1 Clickable Prototype Scope
Create interactive Figma prototype for:
1. **Onboarding Flow** - First-time CEO setup
2. **Dashboard Navigation** - Moving between all main pages
3. **Key Actions:**
   - Connect API service
   - Create marketplace listing
   - Launch stake offering
   - Invite creator to campaign
   - Process dividend payout

### 9.2 User Testing Scenarios
```
Scenario 1: New app owner wants to list their app
- Task: Connect Stripe, create listing, set price

Scenario 2: CEO wants to raise capital
- Task: Create stake offering, set terms, share with investors

Scenario 3: Marketing lead running creator campaign
- Task: Find creators, launch campaign, review performance

Scenario 4: Monthly investor payout
- Task: Calculate dividends, review, distribute
```

---

## 10. Handoff Checklist

### 10.1 For Developers
- [ ] All components built in Storybook
- [ ] Design tokens exported as JSON
- [ ] Responsive specs documented
- [ ] Interaction states documented
- [ ] Accessibility annotations complete
- [ ] Exportable assets organized

### 10.2 For Stakeholders
- [ ] Full prototype walkthrough scheduled
- [ ] Key user flows demonstrated
- [ ] Feedback collection period (1 week)
- [ ] Revision rounds defined (max 2)
- [ ] Final sign-off process clear

---

*This design specification should be used alongside the Strategic Plan and Technical Implementation documents.*
