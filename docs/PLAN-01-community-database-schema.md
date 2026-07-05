# PLAN-01: Community Database Schema

## Objective
Create database tables to support a full community discussion forum system similar to Amazon's product communities.

## Current State
- Only `progress_updates` table exists for app updates
- No community/forum/post/comment tables

## Required Tables

### 1. community_forums
Categories/sections for organizing discussions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar(100) | Forum name (e.g., "General Discussion", "Q&A", "Showcase", "Feature Requests") |
| slug | varchar(100) | URL-friendly identifier |
| description | text | Forum description |
| icon | varchar(50) | Icon identifier |
| color | varchar(7) | Hex color for UI |
| sort_order | integer | Display order |
| is_active | boolean | Whether forum is visible |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### 2. community_topics
Main discussion threads (posts).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| forum_id | uuid | FK to community_forums |
| user_id | uuid | FK to users (author) |
| title | varchar(255) | Topic title |
| content | text | Full content (supports markdown) |
| slug | varchar(255) | URL-friendly title |
| is_pinned | boolean | Sticky topic |
| is_locked | boolean | No more replies |
| is_solved | boolean | Q&A: marked as solved |
| view_count | integer | Number of views |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### 3. community_posts
Replies/comments on topics.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| topic_id | uuid | FK to community_topics |
| user_id | uuid | FK to users (author) |
| parent_id | uuid | FK to community_posts (for nested replies) |
| content | text | Reply content |
| is_accepted_answer | boolean | Q&A: accepted solution |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### 4. community_votes
Likes/upvotes on topics and posts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| target_type | varchar(20) | "topic" or "post" |
| target_id | uuid | FK to topic or post |
| vote_type | integer | 1 = upvote, -1 = downvote |
| created_at | timestamptz | Creation timestamp |

### 5. community_user_stats
User reputation and activity tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users (unique) |
| reputation | integer | Total reputation points |
| topics_count | integer | Number of topics created |
| posts_count | integer | Number of replies |
| upvotes_received | integer | Total upvotes received |
| is_verified | boolean | Community star/verified member |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

## Implementation Steps

1. Add tables to database migration system
2. Create seed data for default forums (General, Q&A, Showcase, Feedback)
3. Add triggers to update `community_user_stats` on topic/post creation
4. Add triggers to update vote counts on topics/posts

## Files to Modify
- `MVPLAB_BACKEND/src/database/schema.ts` - Add table definitions
- Create migration file for new tables
- Add seed data for default forums

## Priority
HIGH - Foundation for all other community features