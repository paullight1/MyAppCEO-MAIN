# PLAN-05: Topic Detail & Comments

## Objective
Create a dedicated page for viewing topic details and threaded discussions.

## Current State
- No topic detail page exists
- No way to view full discussion threads

## New Page

### Route: `/community/topic/:slug`

```
src/pages/TopicDetailPage.tsx
```

## Components Needed

```
src/components/community/
├── TopicDetail.tsx        # Full topic content
├── PostCard.tsx           # Individual reply card
├── PostList.tsx           # Threaded replies
├── ReplyEditor.tsx        # Reply text area
├── VoteButtons.tsx        # Upvote/downvote UI
├── AcceptedBadge.tsx      # Accepted answer indicator
├── ShareButton.tsx        # Share topic
└── TopicActions.tsx       # Edit/delete/pin/lock (for owners/admins)
```

## Features to Implement

1. **Topic Display**
   - Full content with markdown rendering
   - Author info with reputation badge
   - Created/updated timestamps
   - View count
   - Tags

2. **Reply System**
   - Nested threaded replies (up to 3 levels)
   - Reply to specific post (quoted)
   - Edit own replies
   - Delete own replies

3. **Voting**
   - Upvote/downvote on topic
   - Upvote/downvote on replies
   - Show vote count
   - Optimistic UI updates

4. **Q&A Features (for Q&A forum)**
   - Mark reply as accepted answer
   - Show "Solved" badge on topic
   - Sort answers: votes, oldest, newest

5. **Actions**
   - Share (copy link, social)
   - Bookmark topic
   - Report inappropriate content (future)

## UI Elements

- Breadcrumb: Community > Forum > Topic
- Sticky reply editor at bottom
- Load more replies (pagination)
- Collapse/expand long threads

## Implementation Steps

1. Create `TopicDetailPage.tsx`
2. Add route to router
3. Create `PostCard` with nested replies
4. Add `ReplyEditor` component
5. Implement voting UI
6. Add accepted answer functionality

## Files to Create
- `src/pages/TopicDetailPage.tsx` - New page
- `src/components/community/TopicDetail.tsx`
- `src/components/community/PostCard.tsx`
- `src/components/community/ReplyEditor.tsx`
- `src/components/community/VoteButtons.tsx`

## Router Update
Add to existing router:
```typescript
{
  path: '/community/topic/:slug',
  element: <TopicDetailPage />
}
```

## Priority
MEDIUM - Core discussion functionality