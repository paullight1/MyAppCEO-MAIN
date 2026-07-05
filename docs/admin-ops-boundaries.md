# Admin And Operations Workstream Boundaries

Use this file to keep parallel release work disjoint. Each stream should update only its owned files unless it coordinates a shared change first.

## Admin/Ops Owned Surfaces

The admin and operations stream owns:

- Admin review queue, admin notifications, and audit log pages.
- Documentation center, developer portal, and settings surfaces.
- Error pages, error boundary behavior, observability wiring, release documentation, and operational quality gates.
- Release readiness documentation, scorecard, staging sign-off, rollback plan, and incident contacts.

## This Slice Ownership

This worker only edited:

- `src/pages/DocumentationCenterPage.tsx`
- `src/pages/DevPortalPage.tsx`
- `src/pages/SettingsPage.tsx`
- `docs/release-readiness.md`
- `docs/admin-ops-boundaries.md`
- `package.json`

## Do Not Edit Without Coordination

- Feature business logic for marketplace, campaigns, escrow, finance, legal, community, social, AI generation, and app workspaces.
- Shared layout, shared UI components, route guards, and admin pages unless assigned to the same worker.
- Backend hook contracts owned by other workstreams.

## Integration Contracts

### Documentation

- Hosted docs should be controlled by `VITE_DOCS_URL`.
- In-app documentation should remain available at `/documentation`.
- API references must cover listings, campaigns, escrow, and external API overview.

### Developer API Keys

- Frontend should call backend endpoints for key metadata where available.
- Secret values must be displayed once only.
- Backend should store hashed secrets, not raw API keys.
- Rotation and revocation must emit audit events.
- Usage stats should come from backend counters or observability logs.

### Settings

- Account profile, security, notifications, payout, and billing/provider settings are server-synced or linked-service settings.
- Appearance, language, density, and motion preferences are local browser preferences unless a server profile field is intentionally added later.
- Settings UI should not imply persistence when a backend table/provider is not connected.

## Merge Conflict Avoidance

- Add release notes and gaps to docs instead of editing another workstream's task file.
- Link to existing pages instead of duplicating sensitive controls.
- Prefer page-local helpers for this slice; shared components require coordination.
- When a backend endpoint is unavailable, show an honest unavailable or local demo state rather than silent mock success.
