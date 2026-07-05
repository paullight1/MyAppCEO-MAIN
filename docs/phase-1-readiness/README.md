# MyAppCEO Phase 1 Production Readiness Review

Date: 2026-05-16

## Executive verdict

Overall readiness: **46 / 100**

Phase 1 should be treated as **not production-ready** until the app intake, ownership, co-founder, and investor paths are connected to one persisted data model. The product has a strong amount of UI coverage and many useful surfaces already exist, but the primary promise for launch is currently broken at the first critical step: a user can complete "Add My App" and see a success state without creating a managed app record.

## Phase 1 launch goal

The launch goal is:

1. A user signs in.
2. A user adds an existing app, live store app, website, SaaS, or in-progress product.
3. The app becomes a managed workspace.
4. The owner can invite founders and co-founders.
5. The owner can prepare ownership/cap-table data.
6. The owner can raise or receive investor interest.
7. Users can navigate the product without feeling lost.

## Scorecard

| Area | Score | Status | Reason |
| --- | ---: | --- | --- |
| Add existing app / app intake | 28 | Blocked | `AppOnboardingWizard` completes with a timer and no persistence. |
| Managed app workspace | 48 | Partial | `/apps`, `/apps/:id/dashboard`, team, cap table routes exist, but records depend on disconnected tables. |
| Founder/co-founder workflow | 42 | Partial | Multiple team models exist: `app_members`, `app_coowners`, and development `app_team_members`. |
| Investor/campaign workflow | 38 | Blocked | Campaign UI exists, but investment page calls a missing `invest` API and confirmed investment does not update campaign totals or membership. |
| App Store / Play Store import | 58 | Partial | Apple lookup works. Google Play requires a configured provider; frontend fallback is basic metadata only. |
| Dashboard UX and navigation | 62 | Partial | Dashboard has better shortcuts, but primary routes and user roles are not clearly separated. |
| API and backend readiness | 41 | High risk | Endpoint mismatches, ownership gaps, and backend availability/CORS failures need hardening. |
| Supabase/RLS/security | 39 | High risk | Many direct public-table calls need verified tables, grants, RLS policies, and ownership checks. |
| Test/build/release process | 44 | High risk | Build passes, lint is currently broken, no app-level test script exists, JS bundle is oversized. |

## Highest priority blockers

1. **Add My App does not persist.**
   `src/components/AppOnboardingWizard.tsx` only waits and sets success. It must create or attach an app/listing record and owner membership.

2. **No single ownership source of truth.**
   The code uses `app_members`, `app_coowners`, `app_team_members`, `cap_table_entries`, and `app_shareholder_*` as separate workflow islands.

3. **Investor flow is not executable.**
   `CampaignInvestPage` calls `invest`, but `useCrowdfundingSupabase` exposes `commitInvestment` and `confirmInvestment`. Confirming an investment does not update `funding_raised`, `current_investor_count`, app membership, or cap table entries.

4. **Listing ownership controls are incomplete.**
   Backend listing status and delete actions are authenticated but do not verify the current user owns the listing.

5. **Verification tooling is not launch-ready.**
   `npm run build` passes, but `npm run lint` fails because ESLint 9 expects `eslint.config.js`. The production bundle is about 1.95 MB minified JS, which needs route-level code splitting.

## Verification performed

| Command | Result |
| --- | --- |
| `npm run build` | Passed. Vite built 2779 modules. Main JS chunk is 1,947.79 kB minified, 490.76 kB gzip. |
| `npm run lint` | Failed before linting. ESLint 9.39.4 cannot find `eslint.config.(js|mjs|cjs)`. |
| Code search | Found mock/static data, localStorage-only persistence, direct Supabase table calls, missing app persistence, and investor API mismatch. |

## External references used

- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase sessions docs: https://supabase.com/docs/guides/auth/sessions
- Vite production build docs: https://vite.dev/guide/build
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

