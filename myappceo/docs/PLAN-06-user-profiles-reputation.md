# PLAN-06: User Profiles & Reputation System

## Objective
Add community user profiles, reputation tracking, and gamification features.

## Current State
- No community user profiles
- No reputation or gamification
- Community Stars section is static

## Reputation System

### Points Calculation
| Action | Points |
|--------|--------|
| Topic created | +5 |
| Post/reply | +2 |
| Upvote received | +10 |
| Downvote received | -2 |
| Answer accepted | +25 |
| Accepted answer given | +15 |

### Reputation Levels
| Level | Points Required | Badge |
|-------|-----------------|-------|
| New Member | 0-49 | 🌱 |
| Contributor | 50-199 | ⭐ |
| Active Member | 200-499 | 🌟 |
| Trusted Member | 500-999 | 💫 |
| Community Star | 1000+ | 👑 |

## New Page

### Route: `/community/profile/:username`

```
src/pages/CommunityProfilePage.tsx
```

## Components Needed

```
src/components/community/
├── ProfileHeader.tsx      # Avatar, name, reputation
├── ReputationBadge.tsx    # Level indicator
├── ActivityTimeline.tsx   # Recent activity
├── TopicHistory.tsx       # User's topics
├── PostHistory.tsx        # User's replies
└── BadgesSection.tsx      # Achievement badges
```

## Features to Implement

1. **Profile Page**
   - Avatar and display name
   - Join date
   - Reputation score with level badge
   - Bio/description
   - Stats: topics, posts, upvotes

2. **Activity Feed**
   - Recent topics created
   - Recent replies made
   - Accepted answers

3. **Community Stars Page**
   - `/community/stars` - Leaderboard
   - Top 10 by reputation
   - Filter by timeframe (all-time, monthly, weekly)

4. **Badges (Future)**
   - First topic created
   - 10 helpful answers
   - etc.

## Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/community/users/:id | Get user profile |
| GET | /api/v1/community/users/:id/topics | User's topics |
| GET | /api/v1/community/users/:id/posts | User's replies |
| GET | /api/v1/community/stars | Leaderboard |

## Implementation Steps

1. Update database schema with profile fields (PLAN-01)
2. Add API endpoints for user profiles (PLAN-02)
3. Add hooks for user data (PLAN-03)
4. Create profile page and components
5. Create stars/leaderboard page

## Files to Create
- `src/pages/CommunityProfilePage.tsx`
- `src/pages/CommunityStarsPage.tsx`
- `src/components/community/ProfileHeader.tsx`
- `src/components/community/ReputationBadge.tsx`

## Priority
MEDIUM - Enhances community engagement