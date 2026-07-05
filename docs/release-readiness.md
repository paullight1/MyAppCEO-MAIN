# Release Readiness Checklist

This checklist tracks the production release gates for MyAppCEO without requiring every workstream to edit the same release file.

## Required Gates

| Gate | Owner | Required evidence | Status |
| --- | --- | --- | --- |
| Environment configuration | Release owner | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, payment, social, notification, and docs URLs are present for staging and production. | Pending |
| TypeScript | Frontend owner | `npm run typecheck` passes. | Pending |
| Production build | Frontend owner | `npm run build` passes and preview smoke test is completed. | Pending |
| Lint | Frontend owner | `npm run lint` passes or known legacy warnings are documented. | Pending |
| Unit/integration tests | QA owner | Critical workflows have passing tests or documented manual coverage. | Pending |
| End-to-end smoke | QA owner | Auth, browse, listing, campaign, escrow, settings, docs, and developer portal smoke checks pass in staging. | Pending |
| Database migrations | Backend owner | Migration verification command passes against staging before production. | Pending |
| Security scan | Security owner | Dependency vulnerability scan reviewed and release-blocking findings resolved. | Pending |
| Observability | Operations owner | Error reporting, source maps, uptime checks, and incident contacts are configured. | Pending |
| Rollback | Release owner | Previous deployment artifact and rollback command are known before deploy. | Pending |

## Workstream Scorecard

| Workstream | Release criteria | Completion |
| --- | --- | --- |
| Foundation, auth, app workspaces | Protected routes, account lifecycle, workspace ownership, and auth persistence are production-ready. | 0% |
| Marketplace, listings, offers, escrow, payments | Listings, offers, escrow, payments, and transfer states use real APIs or honest unavailable states. | 0% |
| Funding, ownership, finance, legal | Campaigns, investments, cap table, finance, and legal readiness are validated. | 0% |
| Idea-to-build AI lifecycle | Ideas, PRDs, generation, app import, and build workflow are validated. | 0% |
| Growth, community, notifications, support | Community, social, notifications, creator tools, and support workflows are validated. | 0% |
| Admin, operations, quality, release | Admin review, audit, notification composer, docs, settings, developer tools, and release gates are validated. | 0% |

## Staging Sign-off

- Confirm staging uses staging-only payment, social, notification, and API credentials.
- Confirm seed/demo data cannot leak into production user accounts.
- Confirm incomplete providers are behind feature flags or show honest unavailable states.
- Confirm admin-only routes are hidden from non-admin navigation and blocked at route/API levels.
- Confirm documentation links resolve through `VITE_DOCS_URL` or the in-app documentation center.

## Rollback Plan

1. Record the current production deployment ID before promotion.
2. Keep the previous known-good deployment available for immediate rollback.
3. Pause risky feature flags before rolling back database state.
4. Run post-rollback smoke checks for auth, marketplace browsing, settings, payouts, and docs.
5. Open an incident note with impact, root cause hypothesis, owner, and next update time.

## Incident Contacts

| Area | Primary | Backup |
| --- | --- | --- |
| Release command | TBD | TBD |
| Backend/API | TBD | TBD |
| Frontend | TBD | TBD |
| Payments/finance | TBD | TBD |
| Supabase/database | TBD | TBD |
| Support/customer comms | TBD | TBD |

## Acceptance Matrix

| Role | Minimum acceptance path |
| --- | --- |
| Browser | Browse public marketplace, docs, and support surfaces. |
| Seller | Create app context, draft listing, submit for review, view feedback. |
| Buyer | Browse listing, inspect diligence context, start offer or escrow flow. |
| Investor | Browse campaigns, inspect terms, start investment flow. |
| App owner | Review dashboard, finances, team, documents, and app settings. |
| Co-founder | Access shared app workspace with scoped permissions. |
| Shareholder | View ownership and portfolio state without owner-only controls. |
| Creator | Access creator/community growth workflow where enabled. |
| Moderator | Review reported content or see an honest unavailable state. |
| Admin | Review listings, inspect audit logs, and send notifications with real data. |
| Support agent | Find user/app context and escalate issues without admin-only finance powers. |

## Current Gaps For This Slice

- Developer API key persistence depends on backend endpoints for hashed secret storage, audit events, rotation, revocation, and usage counters.
- Billing is still represented as a linked-provider dependency until subscription data is connected.
- `/docs` route behavior is configured outside this slice; this slice documents and links the configured `VITE_DOCS_URL`.
- Release scorecard percentages need to be updated by each owning workstream after their focused checks pass.
