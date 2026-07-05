# PLAN-12: Social Analytics & Insights Dashboard

## Overview
Add comprehensive analytics to track social media performance across all connected platforms, including engagement metrics, follower growth, post performance, and ROI tracking.

## Problem
Users need to understand how their social media presence is performing and which content drives the best results.

## Solution

### Phase 1: Metrics Collection

**1.1 Create Analytics Service** (`analytics.service.ts`)
- Fetch platform analytics via APIs
- Store historical metrics
- Calculate derived metrics
- Generate reports

**1.2 Platform Analytics Integration**
- Meta Insights API - Reach, engagement, followers
- TikTok Analytics - Views, likes, shares
- Twitter Analytics - Impressions, engagements
- YouTube Analytics - Watch time, subscribers

**1.3 Data Aggregation**
- Daily/weekly/monthly aggregations
- Cross-platform comparisons
- Trend analysis data

### Phase 2: Frontend Analytics UI

**2.1 Overview Dashboard**
- Total followers (all platforms)
- Engagement rate comparison
- Top performing content
- Growth trends chart

**2.2 Platform-Specific Views**
- Individual platform deep-dive
- Platform comparison charts
- Best posting times per platform

**2.3 Content Performance**
- Posts ranked by engagement
- Media type performance (video vs image vs text)
- Hashtag performance analysis
- Best performing captions

### Phase 3: Advanced Analytics

**3.1 Audience Insights**
- Demographics (if available)
- Active hours
- Content preferences

**3.2 Competitor Tracking**
- Track competitor accounts (optional)
- Benchmarking

**3.3 ROI Calculator**
- Track conversions from social
- Calculate engagement cost
- Estimate reach value

## Files to Create
- `apps/MVPLAB_BACKEND/src/modules/analytics/analytics.module.ts`
- `apps/MVPLAB_BACKEND/src/modules/analytics/analytics.service.ts`
- `apps/MVPLAB_BACKEND/src/modules/analytics/analytics.controller.ts`
- `apps/MyAppCEO/src/pages/SocialAnalyticsPage.tsx`
- `apps/MyAppCEO/src/components/analytics/Charts.tsx`

## Database Schema Addition
```sql
CREATE TABLE analytics_data (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_analytics_platform_date ON analytics_data(platform, recorded_at);
```

## Priority: LOW
Nice-to-have feature, can be added after core functionality.

## Notes
- Cache analytics data to reduce API calls
- Rate limit analytics fetching
- Show "no data" states gracefully