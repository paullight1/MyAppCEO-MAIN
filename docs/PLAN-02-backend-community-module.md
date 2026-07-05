# PLAN-02: Backend Community Module

## Objective
Create REST API endpoints to power the community features.

## Current State
- No community module exists in backend
- No API routes for forums, topics, posts, or votes

## Required Module Structure

```
MVPLAB_BACKEND/src/modules/community/
├── community.module.ts
├── community.controller.ts
├── community.service.ts
├── community.gateway.ts (if using WebSocket)
└── dto/
    ├── create-topic.dto.ts
    ├── create-post.dto.ts
    └── update-vote.dto.ts
```

## API Endpoints to Create

### Forums
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/community/forums | List all forums |
| GET | /api/v1/community/forums/:slug | Get forum details with stats |

### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/community/topics | List topics (with pagination, filters) |
| GET | /api/v1/community/topics/:id | Get topic details |
| POST | /api/v1/community/topics | Create new topic |
| PATCH | /api/v1/community/topics/:id | Update topic |
| DELETE | /api/v1/community/topics/:id | Delete topic |
| POST | /api/v1/community/topics/:id/pin | Pin/unpin topic (admin) |
| POST | /api/v1/community/topics/:id/lock | Lock/unlock topic (admin) |

### Posts (Replies)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/community/topics/:topicId/posts | List posts for topic |
| POST | /api/v1/community/topics/:topicId/posts | Create reply |
| PATCH | /api/v1/community/posts/:id | Update reply |
| DELETE | /api/v1/community/posts/:id | Delete reply |
| POST | /api/v1/community/posts/:id/accept | Mark as accepted answer |

### Votes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/community/votes | Upvote/downvote topic or post |
| DELETE | /api/v1/community/votes/:id | Remove vote |

### User Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/community/users/:id/stats | Get user community stats |
| GET | /api/v1/community/stars | List community stars (top contributors) |

## Query Parameters
- `forum` - Filter by forum slug
- `sort` - Sort by: latest, popular, trending
- `page`, `limit` - Pagination
- `search` - Search in titles/content

## Implementation Steps

1. Create community module with NestJS structure
2. Implement DTOs with validation
3. Create service methods with proper error handling
4. Add authentication guards (require auth for create/vote)
5. Add pagination and filtering
6. Implement soft delete for topics/posts

## Files to Create
- `MVPLAB_BACKEND/src/modules/community/*` - New community module

## Dependencies
- Already using NestJS in backend
- Use existing authentication module
- Use existing database connection

## Priority
HIGH - Required for frontend to connect to data