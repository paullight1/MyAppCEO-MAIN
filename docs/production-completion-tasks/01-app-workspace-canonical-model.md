# App Workspace Canonical Model

This note records the platform-foundation persistence decision for app workspaces.

## Canonical Records

- `app_workspaces` is the canonical app/workspace identity. It represents the private product workspace a founder, cofounder, shareholder, prospect, support user, or admin can access.
- `app_workspace_members` is the canonical workspace access and role table. It owns app workspace membership for owner, cofounder, shareholder, prospective, admin, and support access.
- `app_coowners` remains a legacy cofounder/equity workflow table for listing-oriented ownership flows.
- `app_members` remains a legacy shareholder/listing compatibility table used by existing documents, cap-table, and shareholder screens until those surfaces are migrated to `app_workspace_members`.

## Related App Surfaces

- Marketplace listing: `listings` is a public marketplace publication. A workspace can link to at most one listing through `app_workspaces.listing_id`; a listing can exist while legacy flows are being migrated.
- Imported store app: `imported_store_apps` stores App Store or Google Play metadata captured during import. A workspace created from an import uses `source_type = 'store_import'` and `imported_store_app_id`.
- Imported store snapshot: `imported_store_app_snapshots` stores immutable versions of imported store metadata, media, and raw payloads so the UI can preserve exact provider snapshots over time.
- Idea-generated app: `ideas` remains the product-idea source. A workspace generated from an idea uses `source_type = 'idea_generated'` and `source_idea_id`.
- Manual app: a workspace created without a listing, import, or idea uses `source_type = 'manual'`.

## Persistence Guarantees

- Workspace creation inserts the owner membership row through a database trigger.
- Workspace setup state is persisted in `app_workspace_setup`.
- Repeated create/import submits use `app_workspace_idempotency_keys` keyed by user, operation, and idempotency key.
- Workspace creation, app import, member role changes, member status changes, and onboarding completion are recorded in `app_workspace_audit_log`.
- RLS is centered on `app_workspace_members`, with helper functions for active workspace membership and manager access.

## Migration Artifact

- Canonical workspace persistence now lives in `supabase/migrations/20260531_app_workspace_canonical_model.sql`.
- The migration is intended to run after the base marketplace/idea/profile schema because it references `listings`, `ideas`, and `user_profiles`.
- RLS helper functions are scoped to `app_private` and granted only as needed for authenticated Data API access. They do not authorize from user metadata claims.
- The only `SECURITY DEFINER` functions are private-schema membership/staff helpers and trigger functions needed to avoid RLS recursion and to create the first owner membership/setup/audit rows during workspace creation.
