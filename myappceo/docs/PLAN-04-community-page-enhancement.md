# PLAN-04: Community Page Enhancement

## Objective
Transform the static CommunityPage into a fully functional forum with real data.

## Current State
- `CommunityPage.tsx` has mock/static UI
- Tabs (All, Showcase, Q&A, General, Feedback) are hardcoded
- Post cards use mock data
- "Create Topic" button is non-functional

## Components to Update/Create

### Main Page (`src/pages/CommunityPage.tsx`)
- Replace mock data with useCommunity hooks
- Add forum filter tabs with real data
- Implement search functionality
- Add sorting dropdown (Latest, Popular, Trending)

### New Components Needed

```
src/components/community/
├── ForumTabs.tsx          # Forum category navigation
├── TopicCard.tsx          # Individual topic preview card
├── TopicList.tsx          # Paginated topic list
├── TrendingSidebar.tsx    # Trending topics widget
├── CommunityStars.tsx     # Top contributors sidebar
├── CreateTopicModal.tsx   # New topic creation modal
├── TopicFilters.tsx       # Search and sort controls
└── EmptyState.tsx         # No topics found state
```

## Features to Implement

1. **Forum Navigation**
   - Click tab to filter by forum
   - Show topic count per forum
   - Highlight active forum

2. **Topic List**
   - Virtualized list for performance
   - Show: author avatar, title, preview, stats (views, replies, votes)
   - Pinned topics at top
   - Solved indicator for Q&A

3. **Create Topic Modal**
   - Select forum category
   - Title input with character limit
   - Rich text editor for content (markdown support)
   - Tag input
   - Preview before posting

4. **Sidebar Widgets**
   - Trending Topics (most active in last 24h)
   - Community Stars (top 5 contributors)
   - Quick stats (total topics, posts, members)

5. **Search**
   - Search topics by title/content
   - Highlight matching terms

## UI Updates

- Loading skeletons while data fetches
- Error states with retry buttons
- Pull-to-refresh on mobile
- Infinite scroll pagination

## Implementation Order

1. Update `useCommunity` hooks with real API calls (PLAN-03)
2. Create `TopicCard` and `TopicList` components
3. Update `CommunityPage` to use hooks
4. Add `CreateTopicModal`
5. Add sidebar widgets
6. Add search and filters

## Files to Modify
- `src/pages/CommunityPage.tsx` - Main updates
- `src/components/community/*` - New components

## Priority
HIGH - Core user-facing feature