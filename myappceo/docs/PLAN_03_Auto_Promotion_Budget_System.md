# PLAN_03: Auto-Promotion Budget System

## Overview
Allow CEOs to allocate funds from their MVPLAB wallet that automatically flows into promoting their apps. This feature enables set-it-and-forget-it promotional spending with configurable rules for automatic creator hiring and ad purchases.

## Problem Statement
Currently:
- No way to set aside money specifically for promotion
- Manual process to fund each campaign
- No recurring/automated promotion options
- Users want "set and forget" promotion like Amazon's automatic advertising

Users need:
- A "promotion wallet" or budget allocation system
- Automatic spending rules (e.g., "$100/month on creators")
- Triggers for when auto-promotion activates (e.g., low traffic)
- Dashboard to see auto-promotion performance

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 Auto-Promotion Budget                          [Configure] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Current Allocation                                        │ │
│  │                                                            │ │
│  │  $500 / month                                             │ │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░  $1,000 limit         │ │
│  │                                                            │ │
│  │  💳 Funded from: Main Wallet                              │ │
│  │  📊 Spent this month: $320                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Auto-Promotion Rules                                      │ │
│  │                                                            │ │
│  │  [+] Add New Rule                                          │ │
│  │                                                            │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │                                                            │ │
│  │  Rule 1: Active                                           │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  When: App has < 100 daily visitors                       │ │
│  │  Action: Hire random UGC creator ($50-150)               │ │
│  │  Frequency: Once per week                                 │ │
│  │  Status: ✅ Active                                        │ │
│  │                                                            │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │                                                            │ │
│  │  Rule 2: Scheduled                                        │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  When: Every Monday at 9AM                                │ │
│  │  Action: Boost top 3 campaigns by $25 each               │ │
│  │  Frequency: Weekly                                        │ │
│  │  Status: ✅ Active                                        │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Transaction History                                       │ │
│  │                                                            │ │
│  │  Mar 15  - Hired @creator123        -$75    ✅           │ │
│  │  Mar 12  - Boosted Campaign #2       -$25    ✅           │ │
│  │  Mar 10  - Hired @ugc_star            -$120   ✅           │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Budget Allocation System

**New Hook**: `usePromotionBudget`
```typescript
interface PromotionBudget {
  id: string;
  userId: string;
  monthlyLimit: number;
  currentSpend: number;
  walletSource: 'main' | 'dedicated';
  autoFund: boolean;
}

interface AutoPromotionRule {
  id: string;
  userId: string;
  name: string;
  trigger: TriggerConfig;
  action: ActionConfig;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  status: 'active' | 'paused' | 'disabled';
  lastTriggered?: string;
}

interface TriggerConfig {
  type: 'traffic_threshold' | 'scheduled' | 'manual' | 'performance';
  params: Record<string, any>;
}

interface ActionConfig {
  type: 'hire_creator' | 'boost_campaign' | 'purchase_ads' | 'featured_slot';
  params: Record<string, any>;
}
```

**API Endpoints**:
- `GET /promotion/budget` - Get current budget settings
- `POST /promotion/budget` - Set/update budget
- `GET /promotion/rules` - List auto-promotion rules
- `POST /promotion/rules` - Create new rule
- `PATCH /promotion/rules/:id` - Update rule
- `DELETE /promotion/rules/:id` - Delete rule

### Phase 2: Budget UI Components

**File**: `src/components/AutoPromotionBudget.tsx`
- Monthly allocation slider/input
- Wallet source selection
- Current spend visualization
- Add funds quick action

**File**: `src/components/AutoPromotionRules.tsx`
- List of configured rules
- Add/Edit/Delete rules
- Toggle rule active/paused

**File**: `src/components/CreateRuleModal.tsx`
- Multi-step wizard for creating rules

### Phase 3: Rule Types

**1. Traffic-Based Trigger**
```typescript
{
  type: 'traffic_threshold',
  params: {
    metric: 'daily_visitors' | 'page_views' | 'conversion_rate',
    operator: 'lt' | 'gt' | 'eq',
    value: 100
  }
}
```

**2. Scheduled Trigger**
```typescript
{
  type: 'scheduled',
  params: {
    dayOfWeek: 'monday',
    time: '09:00',
    timezone: 'UTC'
  }
}
```

**3. Performance Trigger**
```typescript
{
  type: 'performance',
  params: {
    metric: 'roi' | 'conversion_rate',
    operator: 'lt',
    value: 0.5,
    period: '7d'
  }
}
```

### Phase 4: Action Types

**1. Hire Random Creator**
```typescript
{
  type: 'hire_creator',
  params: {
    minBudget: 50,
    maxBudget: 150,
    niche: 'auto' | 'gaming' | 'saas' | 'health',
    platforms: ['tiktok', 'instagram']
  }
}
```

**2. Boost Campaign**
```typescript
{
  type: 'boost_campaign',
  params: {
    amount: 25,
    targetCampaign: 'top_performing' | 'specific_id'
  }
}
```

**3. Purchase Featured Slot**
```typescript
{
  type: 'purchase_ads',
  params: {
    category: 'homepage' | 'search' | 'newsletter',
    duration: '7d'
  }
}
```

### Phase 5: Background Job / Cron

The auto-promotion system needs a background worker to:
- Check scheduled rules at configured times
- Evaluate trigger conditions
- Execute actions within budget limits
- Log transactions for history

**Note**: This may require backend implementation beyond the frontend scope.

---

## Database Schema

```sql
-- promotion_budget table
CREATE TABLE promotion_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  monthly_limit DECIMAL(10,2) NOT NULL,
  current_spend DECIMAL(10,2) DEFAULT 0,
  wallet_source VARCHAR(20) DEFAULT 'main',
  auto_fund BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- auto_promotion_rules table
CREATE TABLE auto_promotion_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_params JSONB NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_params JSONB NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- promotion_transactions table
CREATE TABLE promotion_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  rule_id UUID REFERENCES auto_promotion_rules(id),
  campaign_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration Points

1. **Promotion Hub** (`/promote`)
   - Add "Budget" tab to main page
   - Show budget summary in sidebar

2. **Wallet/Finances** (`usePayments`)
   - Deduct from user's wallet when auto-promotion triggers
   - Show promotion spending in finance reports

3. **Campaigns** (`useCampaigns`)
   - Link auto-promotion actions to campaigns
   - Track which campaigns were boosted automatically

4. **Creators** (`useCreators`)
   - Auto-hire creators based on rules
   - Use existing escrow for payments

---

## UI Components to Create

| Component | Description |
|-----------|-------------|
| `AutoPromotionBudget.tsx` | Budget allocation UI |
| `AutoPromotionRules.tsx` | Rules list and management |
| `CreateRuleModal.tsx` | Multi-step rule creation |
| `RuleCard.tsx` | Individual rule display |
| `TransactionHistory.tsx` | Auto-promotion spend history |

---

## Success Criteria
1. ✅ User can set monthly promotion budget
2. ✅ User can create auto-promotion rules
3. ✅ Rules can use different trigger types
4. ✅ Rules can execute different action types
5. ✅ Budget deductions work from wallet
6. ✅ Transaction history shows all auto-spending
7. ✅ Rules can be paused/activated
8. ✅ System respects budget limits (won't overspend)

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/hooks/usePromotionBudget.ts` | Create |
| `src/components/AutoPromotionBudget.tsx` | Create |
| `src/components/AutoPromotionRules.tsx` | Create |
| `src/components/CreateRuleModal.tsx` | Create |
| `src/components/RuleCard.tsx` | Create |
| `src/components/TransactionHistory.tsx` | Create |
| Update `PromotionHubPage.tsx` | Add Budget tab |

---

## Priority: HIGH
This feature differentiates the platform by offering automated, hands-free promotion management.