# PLAN_02: UGC Creator Marketplace

## Overview
Create a dedicated marketplace page for hiring UGC (User Generated Content) creators, accessible from `/promote/creators`. This page allows CEOs to browse, filter, and hire creators for their app promotion campaigns - similar to Fiverr or Upwork for UGC content.

## Problem Statement
Currently:
- UGC creator section is embedded in `CreatorsPage.tsx` as a basic sidebar
- No real creator listings or search/filter functionality
- No way to browse creators by niche, rate, or platform
- No portfolio viewing or creator profiles

Users need:
- A dedicated marketplace to discover and hire creators
- Filter by niche (gaming, SaaS, health tech, etc.)
- Filter by platform (TikTok, Instagram, YouTube, etc.)
- View creator portfolios and past work
- Direct hiring with escrow payment protection

---

## Implementation Plan

### Phase 1: Page Structure & Layout

**File**: `src/pages/CreatorMarketplacePage.tsx` (new file)

```
┌─────────────────────────────────────────────────────────────────────┐
│  👥 UGC Creator Marketplace                    [Filters] [Search] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┬──────────┬──────────┬──────────┐                    │
│  │  Gaming  │   SaaS   │   AI     │  Health  │  [More +]          │
│  │  (245)   │  (189)   │  (156)   │  (98)    │                    │
│  └──────────┴──────────┴──────────┴──────────┘                    │
│                                                                     │
│  Rate: ○ All  ○ <$500  ○ $500-1K  ○ $1K-5K  ○ $5K+                │
│  Platform: [TikTok] [Instagram] [YouTube] [All]                   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  [Creator Photo]│  │  [Creator Photo]│  │  [Creator Photo]│    │
│  │                  │  │                  │  │                  │    │
│  │  @username      │  │  @username      │  │  @username      │    │
│  │  Gaming Niche   │  │  SaaS Niche     │  │  AI Niche       │    │
│  │                  │  │                  │  │                  │    │
│  │  📊 2.5M reach  │  │  📊 500K reach  │  │  📊 1.2M reach  │    │
│  │  ⭐ 4.9 rating  │  │  ⭐ 4.8 rating  │  │  ⭐ 5.0 rating  │    │
│  │                  │  │                  │  │                  │    │
│  │  💰 $500/camp   │  │  💰 $1,200/camp │  │  💰 $800/camp   │    │
│  │                  │  │                  │  │                  │    │
│  │  [View] [Hire]  │  │  [View] [Hire]  │  │  [View] [Hire]  │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│  [Load More...]                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Creator Data Integration

**Update existing `useCreators` hook** or create new `useCreatorMarketplace`:
```typescript
interface CreatorFilters {
  niche?: string;
  platform?: string[];
  minRate?: number;
  maxRate?: number;
  minReach?: number;
  search?: string;
}

interface CreatorProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  niches: string[];
  platforms: string[];
  rate: number;
  reach: number;
  rating: number;
  completedCampaigns: number;
  portfolio: PortfolioItem[];
  verified: boolean;
}
```

**API Endpoints needed**:
- `GET /creators/marketplace` - List creators with filters
- `GET /creators/:id/profile` - Full creator profile
- `GET /creators/:id/portfolio` - Creator's work samples

### Phase 3: Creator Profile Modal

When clicking "View" on a creator card, open a modal with:
- Full profile information
- Portfolio gallery (videos/images of past work)
- Reviews/testimonials
- Stats breakdown
- Availability status
- "Hire for Campaign" CTA

### Phase 4: Hiring Flow

**Step 1: Select Creator**
- Choose creator from marketplace
- Select campaign (or create new)

**Step 2: Define Scope**
- Number of content pieces
- Platforms required
- Deadline/timing
- Key messaging points

**Step 3: Budget & Escrow**
- Confirm rate
- Set milestone payments
- Funds held in escrow

**Step 4: Launch**
- Creator notified
- Campaign tracking begins

---

## UI Components to Create

| Component | Description |
|-----------|-------------|
| `CreatorMarketplacePage.tsx` | Main marketplace page |
| `CreatorCard.tsx` | Grid card for creator listing |
| `CreatorFilters.tsx` | Filter sidebar/bar |
| `CreatorProfileModal.tsx` | Full creator details |
| `HireCreatorModal.tsx` | Multi-step hiring flow |
| `PortfolioGallery.tsx` | Creator's work showcase |

---

## Database Schema (if needed)

```sql
-- creators table extension
ALTER TABLE creators ADD COLUMN rate DECIMAL(10,2);
ALTER TABLE creators ADD COLUMN reach INT DEFAULT 0;
ALTER TABLE creators ADD COLUMN rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE creators ADD COLUMN completed_campaigns INT DEFAULT 0;
ALTER TABLE creators ADD COLUMN verified BOOLEAN DEFAULT false;

-- creator_portfolio table
CREATE TABLE creator_portfolio (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  media_url TEXT,
  media_type VARCHAR(20), -- video, image
  platform VARCHAR(50),
  campaign_id UUID,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration Points

1. **Promotion Hub** (`/promote`)
   - "Find Creators" button links to `/promote/creators`
   - Pass `?campaign_id=` to pre-select campaign

2. **Escrow System** (`useEscrow`)
   - Use existing escrow for payment protection
   - Milestone-based releases

3. **Campaign System** (`useCampaigns`)
   - Link hired creators to campaigns
   - Track creator performance per campaign

---

## Routing

**File**: `src/App.tsx`
```typescript
<Route path="/promote" element={<PromotionHubPage />} />
<Route path="/promote/creators" element={<CreatorMarketplacePage />} />
<Route path="/promote/creators/:id" element={<CreatorProfileModal />} />
```

---

## Success Criteria
1. ✅ Page loads at `/promote/creators`
2. ✅ Displays creator listings from API
3. ✅ Filter by niche, platform, rate works
4. ✅ Search by username/name works
5. ✅ Creator profile modal shows portfolio
6. ✅ Hiring flow initiates escrow transaction
7. ✅ Hired creator linked to campaign

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/pages/CreatorMarketplacePage.tsx` | Create |
| `src/components/CreatorCard.tsx` | Create |
| `src/components/CreatorFilters.tsx` | Create |
| `src/components/CreatorProfileModal.tsx` | Create |
| `src/components/HireCreatorModal.tsx` | Create |
| `src/hooks/useCreatorMarketplace.ts` | Create |
| `src/App.tsx` | Add routes |

---

## Priority: HIGH
This is the primary way CEOs will hire UGC creators to promote their apps.