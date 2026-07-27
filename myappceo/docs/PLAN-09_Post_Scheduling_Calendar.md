# PLAN-09: Post Scheduling & Calendar System

## Overview
Implement a visual calendar for scheduling posts at optimal times, with drag-and-drop scheduling, recurring posts, and time zone support.

## Problem
Users need to plan and schedule content in advance rather than posting immediately. They need a visual calendar to see their content pipeline.

## Solution

### Phase 1: Backend - Scheduler Service

**1.1 Create Scheduler Service** (`scheduler.service.ts`)
- Store scheduled posts in database
- Cron job to trigger post publish
- Handle timezone conversion
- Support recurring schedules

**1.2 Create Scheduler Controller** (`scheduler.controller.ts`)
Endpoints:
- `POST /schedule/posts` - Schedule a new post
- `GET /schedule/posts` - List scheduled posts
- `GET /schedule/calendar` - Get calendar view data
- `PATCH /schedule/posts/:id` - Update scheduled post
- `DELETE /schedule/posts/:id` - Cancel scheduled post
- `POST /schedule/posts/:id/publish-now` - Publish immediately

**1.3 Cron Job Implementation**
- Run every minute to check for due posts
- Trigger platform-specific posting
- Handle missed schedules (catch-up posting)
- Send notifications on publish

### Phase 2: Frontend - Calendar UI

**2.1 Create Calendar Component**
- Monthly/weekly/daily views
- Visual timeline of scheduled posts
- Color-coded by platform
- Drag-and-drop to reschedule
- Click to view/edit post details

**2.2 Create Schedule Modal**
- Date/time picker with timezone
- Platform selection
- Content input (text, media, links)
- Optimal time suggestions
- Recurring schedule options (daily, weekly, custom)

**2.3 Calendar Sidebar**
- Upcoming posts list
- Quick actions (edit, delete, publish now)
- Post templates

### Phase 3: Advanced Scheduling Features

**3.1 Optimal Time Suggestions**
- Analyze user's audience engagement patterns
- Suggest best times to post per platform
- Machine learning model for timing

**3.2 Recurring Posts**
- Set frequency (daily, weekly, custom days)
- Auto-generate posts from templates
- Variation suggestions to avoid duplicates

**3.3 Time Zone Handling**
- Detect user timezone
- Convert to each platform's local time
- Display times in user's local timezone

## Files to Create
- `apps/MVPLAB_BACKEND/src/modules/scheduler/scheduler.module.ts`
- `apps/MVPLAB_BACKEND/src/modules/scheduler/scheduler.service.ts`
- `apps/MVPLAB_BACKEND/src/modules/scheduler/scheduler.controller.ts`
- `apps/MVPLAB_BACKEND/src/modules/scheduler/scheduler.cron.ts`
- `apps/MyAppCEO/src/components/SocialCalendar.tsx`
- `apps/MyAppCEO/src/components/SchedulePostModal.tsx`

## Files to Modify
- `apps/MVPLAB_BACKEND/src/app.module.ts`
- `apps/MVPLAB_BACKEND/src/database/schema.ts` - Add `scheduled_posts` table
- `apps/MyAppCEO/src/pages/SocialAutomationPage.tsx`
- Add route for full calendar view

## Database Schema Addition
```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  media_urls TEXT[],
  platforms TEXT[], -- ['instagram', 'tiktok', 'twitter']
  scheduled_at TIMESTAMP NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'pending', -- pending, published, failed, cancelled
  published_at TIMESTAMP,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format
  parent_post_id UUID REFERENCES scheduled_posts(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Dependencies
- Node-cron or Bull for job scheduling
- Timezone handling (moment-timezone or date-fns-tz)
- Platform API rate limits awareness

## Priority: MEDIUM
Important for content planning but can come after basic posting.

## Notes
- Reuse video upload infrastructure for media
- Integrate with video library for scheduled video posts
- Show engagement predictions based on timing