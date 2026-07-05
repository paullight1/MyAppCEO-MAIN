# PLAN-03: Community Hooks

## Objective
Create React Query hooks for consuming the community API endpoints.

## Current State
- No community-specific hooks exist
- Only progress updates modal exists

## Hooks to Create

### src/hooks/useCommunity.ts

```typescript
// Forums
useForums() - List all community forums
useForum(slug) - Get single forum with stats

// Topics
useTopics(filters) - List topics with pagination/filters
useTopic(id) - Get topic details
useCreateTopic() - Create new topic mutation
useUpdateTopic() - Update topic mutation
useDeleteTopic() - Delete topic mutation

// Posts
usePosts(topicId) - List posts for topic
useCreatePost() - Create reply mutation
useUpdatePost() - Update reply mutation
useDeletePost() - Delete reply mutation
useAcceptAnswer() - Mark as accepted solution

// Votes
useVote() - Upvote/downvote mutation
useRemoveVote() - Remove vote mutation

// Users
useUserStats(userId) - Get user community stats
useCommunityStars() - List top contributors
```

## Hook Features

1. **React Query Integration**
   - Proper caching and invalidation
   - Optimistic updates for votes
   - Error handling with toast notifications

2. **Types**
   - Full TypeScript definitions matching API responses
   - Filter types for queries
   - Mutation result types

3. **Authentication**
   - Check auth state before mutations
   - Redirect to login if unauthenticated

## Files to Create
- `src/hooks/useCommunity.ts` - Main community hooks
- `src/types/community.ts` - TypeScript interfaces

## Example Usage

```typescript
// List topics
const { data, isLoading } = useTopics({ forum: 'qa', sort: 'latest' });

// Create topic
const createTopic = useCreateTopic();
createTopic.mutate({ forumId, title, content });

// Vote
const vote = useVote();
vote.mutate({ targetType: 'topic', targetId, voteType: 1 });
```

## Priority
HIGH - Required for UI to consume API data