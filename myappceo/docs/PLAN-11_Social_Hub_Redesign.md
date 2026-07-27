# PLAN-11: Social Hub Page Redesign

## Overview
Complete redesign of the Social Hub page to become a unified command center for managing all social media activities - combining account management, content creation, scheduling, analytics, and automation in a cohesive interface.

## Problem
Current Social Hub page has disconnected sections with mock data. It doesn't feel like a unified social media management tool (like ManyChat, Buffer, or Hootsuite).

## Solution

### Phase 1: New Layout Architecture

**1.1 Page Structure**
Replace current 2-column layout with sidebar + main content:

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Page Title + Quick Actions + User Menu            │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  Sidebar │           Main Content Area                      │
│          │  (Tab-based content switching)                   │
│  - Home  │                                                   │
│  - Posts │  ┌─────────────────────────────────────────┐    │
│  - Video │  │  Tab: Overview | Posts | Calendar |     │    │
│  - Sched │  │         Automations | Analytics         │    │
│  - Auto  │  └─────────────────────────────────────────┘    │
│  - Stats │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

**1.2 Sidebar Navigation**
- **Overview**: Quick stats, recent activity, quick actions
- **Content**: Posts feed, video library
- **Scheduler**: Calendar view
- **Automations**: Automation rules and builder
- **Accounts**: Connected accounts management
- **Analytics**: Performance metrics

### Phase 2: Dashboard Overview Tab

**2.1 Stats Cards Row**
- Total followers (across platforms)
- Total engagement this week
- Posts scheduled
- Automation rules active

**2.2 Connected Accounts Widget**
- Quick view of all connected platforms
- Connection status indicators
- Quick "Connect New" button

**2.3 Recent Activity Feed**
- Latest posts published
- Recent automation triggers
- New followers (if tracked)
- Comments/messages received

**2.4 Quick Actions Panel**
- Create Post button
- Upload Video button
- New Automation button
- View Calendar button

### Phase 3: Content Tab

**3.1 Posts Feed**
- List of all published posts
- Filter by platform, date, status
- Quick actions: Edit, Delete, Boost
- Preview media

**3.2 Video Library**
- Grid of uploaded videos
- Upload button
- Filter by platform
- Performance metrics

### Phase 4: Unified Header

**4.1 Left Section**
- Hamburger menu (mobile)
- Page title with tab indicator

**4.2 Center Section**
- Quick post composer
- Platform selector
- Schedule options

**4.3 Right Section**
- Notifications bell
- Settings gear
- User avatar/menu

### Phase 5: Responsive Design

**5.1 Mobile Layout**
- Collapsible sidebar (bottom nav)
- Stacked cards
- Touch-friendly interactions

**5.2 Tablet Layout**
- Condensed sidebar
- 2-column grid where appropriate

## Components to Create/Modify

### New Components
- `SocialHubLayout.tsx` - Main layout with sidebar
- `SidebarNav.tsx` - Navigation sidebar
- `OverviewTab.tsx` - Dashboard overview
- `ContentTab.tsx` - Posts and videos
- `CalendarTab.tsx` - Scheduling calendar
- `AutomationsTab.tsx` - Automation management
- `AccountsTab.tsx` - Connected accounts
- `AnalyticsTab.tsx` - Performance metrics
- `QuickPostComposer.tsx` - Header post creator

### Files to Modify
- `apps/MyAppCEO/src/pages/SocialAutomationPage.tsx` - Complete rewrite
- `apps/MyAppCEO/src/hooks/useSocialAutomation.ts` - Add new hooks
- Add new routes in `App.tsx` if needed

## Implementation Order

1. **Phase 1**: New layout skeleton
2. **Phase 2**: Overview tab with real data
3. **Phase 3**: Integrate Video Upload (Plan-08)
4. **Phase 4**: Integrate Scheduler (Plan-09)
5. **Phase 5**: Integrate Automations (Plan-10)
6. **Phase 6**: Connect Accounts (Plan-07)
7. **Phase 7**: Analytics

## Priority: HIGH
This is the umbrella plan that brings everything together. Should be started after foundational plans.

## Dependencies
- All other social hub plans (07-10)
- Real data from backend

## Design Guidelines
- Use existing color scheme (dark primary, accent)
- Maintain rounded corners (32px, 40px)
- Smooth transitions and animations
- Consistent spacing (8px base unit)
- Platform-specific icons and branding