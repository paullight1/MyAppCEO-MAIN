# Dynamic Config API ("At-a-Glance")

## Overview
The Dynamic Config API is the technical backbone for the [App Management Switchboard](./APP_MANAGEMENT_DETAIL.md). It ensures that any changes made by a CEO (pricing, package tiers, maintenance status) are synchronized instantly across the database, cache, and frontend.

## 1. Sync Architecture
The API follows a "Write-Through" cache pattern to guarantee zero-latency updates for end-users while maintaining data integrity.

1.  **Request:** CEO submits a change (e.g., Update Price to $49) via the [Switchboard](./APP_MANAGEMENT_DETAIL.md).
2.  **Process:** API updates the **PostgreSQL** database (source of truth).
3.  **Sync:** API immediately updates the **Redis** cache with the new value.
4.  **Notify:** **WebSocket** (via Socket.io) broadcasts the "At-a-Glance" update to all active frontend clients.

## 2. API Endpoints

| Method | Endpoint | Description | Payload Example |
|--------|----------|-------------|-----------------|
| `GET` | `/config/:appId` | Fetch current "At-a-Glance" config. | `{ price: 49, status: 'LIVE' }` |
| `PATCH` | `/config/:appId` | Update a specific config field. | `{ price: 59 }` |
| `WS` | `live-config-update` | Real-time broadcast for all connected clients. | `config_updated` |

## 3. Data Schema
The configuration is stored as a JSONB field in the `AppProject` table, allowing for flexible, agent-driven schema updates without migrations.

```typescript
type AppConfig = {
  price: number;
  tiers: { name: string, cost: number }[];
  maintenanceMode: boolean;
  promotionLevel: 'STANDARD' | 'FEATURED' | 'SPOTLIGHT';
  lastOptimized: string; // ISO Date
}
```

## 4. Cache Strategy (Redis)
- **Key Format:** `app_config:{appId}`
- **TTL:** No expiration for active configs; updated only on write.
- **Eviction:** Configs are removed from Redis only when an app is moved to `ARCHIVED` status in the [App Lifecycle Tracking](./APP_LIFECYCLE_TRACKING.md).

## 5. Security & Validation
- **Role-based Access:** Only the "Owner" (CEO) can write to this API (enforced via [User Roles & Permissions](./USER_ROLES_PERMISSIONS.md)).
- **Input Validation:** Every update is validated via **Zod** schema (as defined in the [PRD-mvplab-marketplace](./PRD-mvplab-marketplace.md)).
- **Audit Logging:** Every change is recorded in the `ConfigAuditLog` for transparency.

## Implementation Notes
- This API is designed for high concurrency; it is stateless and horizontally scalable via Fastify.
- In the event of a Redis failure, the API falls back to PostgreSQL (slower but consistent).
- Frontend clients use `React Query` with a short `staleTime` and WebSocket invalidation to stay "At-a-Glance" synced.
