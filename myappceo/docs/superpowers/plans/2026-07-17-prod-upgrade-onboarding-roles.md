# Production Upgrade: Launch Blockers, First-Run Onboarding, Founder Journey, Role Dashboards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take MyAppCEO to production level: close the launch blockers (RLS, buckets, deploy config, mock data, CI), rework first-run onboarding so new users land on a blurred real dashboard with two clear entry actions ("Start a new idea" bold, "Upload an existing app"), add a four-stage founder-journey UI (Build → Team → Fund → Sell), and give investors/co-founders role-limited dashboards.

**Architecture:** The app is a Vite + React 19 SPA (`mvplab-marketplace`) backed by Supabase (direct reads under RLS) plus an external NestJS API (`/api/v1`, `apps/MVPLAB_BACKEND`). All UI work stays inside existing pages/components; new logic goes into small pure utils (`founderJourney.ts`, `navConfig.ts`) so it is unit-testable with the existing Vitest setup (no React Testing Library — test pure functions only). DB fixes ship as idempotent SQL migrations in `supabase/migrations/`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind (token-based), Supabase (Postgres + RLS + Storage), Vitest, lucide-react icons, react-router-dom.

## Global Constraints

- Cards use `bg-card border border-border rounded-2xl` and **no shadow** (shadows allowed only on overlays/dialogs — the flat card language).
- Never hardcode hex colors. Use tokens (`text-primary`, `bg-primary`, `bg-muted`, `text-muted-foreground`, `border-border`). Brand blue `#0071e3` **is** `--primary`.
- Dark mode is the `.dark` class on `<html>` (via `src/hooks/useTheme.ts`). NEVER wrap `.dark { }` token overrides in `@media (prefers-color-scheme: dark)`.
- Currency/date formatting via `src/utils/format.ts` (`formatCurrency` etc., default NGN). No inline `$${x.toLocaleString()}`.
- Modals use `src/components/ui/dialog.tsx`. Status pills use `components/ui/StatusBadge` / `utils/statusConfig.ts` — never hand-roll.
- `src/components/ui/index.ts` is an auto-regenerated barrel — don't fight it. `src/compiled.css` is a DEAD artifact — never edit it.
- Platform roles: `'ceo' | 'investor' | 'creator' | 'admin' | 'analyst'` (in `user_profiles.role`). Per-app roles: `'owner' | 'ceo' | 'cofounder' | 'shareholder' | 'prospective' | 'admin' | 'support'` (`src/hooks/useAppRole.ts`).
- Verification for every task: `npm run typecheck` (expect 0 new errors — note pre-existing baseline error in `src/hooks/usePayments.ts` is NOT yours) and `npm test` (Vitest).
- Live Supabase project: `lbsnlplgoobuwrghawix.supabase.co`. No service-role key exists locally — live-DB SQL must run in the Supabase SQL editor (Task 3).
- Commit after every task with a conventional message.

---

# Phase 1 — Production foundation (launch blockers)

### Task 1: RLS baseline migration for the 8 uncovered tables

The 8 tables below are queried directly from `src` but have **no RLS policy in any versioned migration** (their definitions live only in the untracked dump `supabase-complete-schema.sql`): `app_audit_log`, `app_coowners`, `app_members`, `app_documents`, `campaign_watchlists`, `application_documents`, `user_license_applications`, `design_generation_progress`.

Ownership columns (verified against the dump): `listings.seller_id` is the app owner; `app_coowners`/`app_members` have `app_id + user_id + status`; `app_documents.app_id`; `campaign_watchlists.user_id`; `user_license_applications.user_id`; `application_documents.application_id → user_license_applications`; `design_generation_progress.owner_id`.

**Files:**
- Create: `supabase/migrations/20260717_rls_baseline.sql`

**Interfaces:**
- Produces: `public.is_app_member(uuid)` SQL helper used by later policies; RLS + `authenticated` GRANTs on the 8 tables.

- [ ] **Step 1: Write the migration**

```sql
-- 20260717_rls_baseline.sql
-- Idempotent RLS + grants for tables queried directly by the SPA but
-- previously only defined in the untracked schema dump.

-- Helper: is the current user the owner or an active member of an app (listing)?
-- SECURITY DEFINER so membership checks don't recurse into RLS on the member tables.
CREATE OR REPLACE FUNCTION public.is_app_member(target_app UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM listings l WHERE l.id = target_app AND l.seller_id = auth.uid())
      OR EXISTS (SELECT 1 FROM app_coowners c WHERE c.app_id = target_app AND c.user_id = auth.uid() AND COALESCE(c.status, 'active') NOT IN ('removed', 'left'))
      OR EXISTS (SELECT 1 FROM app_members m WHERE m.app_id = target_app AND m.user_id = auth.uid() AND COALESCE(m.status, 'active') = 'active');
$$;

CREATE OR REPLACE FUNCTION public.is_app_owner(target_app UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM listings l WHERE l.id = target_app AND l.seller_id = auth.uid());
$$;

-- ============ app_audit_log ============
ALTER TABLE public.app_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_audit_log_select ON public.app_audit_log;
CREATE POLICY app_audit_log_select ON public.app_audit_log
  FOR SELECT TO authenticated USING (public.is_app_member(app_id));
DROP POLICY IF EXISTS app_audit_log_insert ON public.app_audit_log;
CREATE POLICY app_audit_log_insert ON public.app_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_app_member(app_id) AND (user_id IS NULL OR user_id = auth.uid()));

-- ============ app_coowners ============
ALTER TABLE public.app_coowners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_coowners_select ON public.app_coowners;
CREATE POLICY app_coowners_select ON public.app_coowners
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_app_member(app_id));
DROP POLICY IF EXISTS app_coowners_owner_write ON public.app_coowners;
CREATE POLICY app_coowners_owner_write ON public.app_coowners
  FOR ALL TO authenticated USING (public.is_app_owner(app_id)) WITH CHECK (public.is_app_owner(app_id));
DROP POLICY IF EXISTS app_coowners_self_update ON public.app_coowners;
CREATE POLICY app_coowners_self_update ON public.app_coowners
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ app_members ============
ALTER TABLE public.app_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_members_select ON public.app_members;
CREATE POLICY app_members_select ON public.app_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_app_member(app_id));
DROP POLICY IF EXISTS app_members_owner_write ON public.app_members;
CREATE POLICY app_members_owner_write ON public.app_members
  FOR ALL TO authenticated USING (public.is_app_owner(app_id)) WITH CHECK (public.is_app_owner(app_id));
DROP POLICY IF EXISTS app_members_self_update ON public.app_members;
CREATE POLICY app_members_self_update ON public.app_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ app_documents ============
ALTER TABLE public.app_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_documents_select ON public.app_documents;
CREATE POLICY app_documents_select ON public.app_documents
  FOR SELECT TO authenticated USING (public.is_app_member(app_id));
DROP POLICY IF EXISTS app_documents_write ON public.app_documents;
CREATE POLICY app_documents_write ON public.app_documents
  FOR ALL TO authenticated
  USING (public.is_app_owner(app_id) OR uploaded_by = auth.uid())
  WITH CHECK (public.is_app_member(app_id));

-- ============ campaign_watchlists (own rows only) ============
ALTER TABLE public.campaign_watchlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_watchlists_own ON public.campaign_watchlists;
CREATE POLICY campaign_watchlists_own ON public.campaign_watchlists
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ user_license_applications (own rows only) ============
ALTER TABLE public.user_license_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_license_applications_own ON public.user_license_applications;
CREATE POLICY user_license_applications_own ON public.user_license_applications
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ application_documents (via parent application) ============
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS application_documents_own ON public.application_documents;
CREATE POLICY application_documents_own ON public.application_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_license_applications a WHERE a.id = application_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_license_applications a WHERE a.id = application_id AND a.user_id = auth.uid()));

-- ============ design_generation_progress (own rows; realtime SELECT) ============
ALTER TABLE public.design_generation_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS design_generation_progress_own ON public.design_generation_progress;
CREATE POLICY design_generation_progress_own ON public.design_generation_progress
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ============ Grants (the 42501 lesson: RLS is useless without table privileges) ============
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.app_audit_log, public.app_coowners, public.app_members, public.app_documents,
  public.campaign_watchlists, public.user_license_applications, public.application_documents,
  public.design_generation_progress
TO authenticated;
```

- [ ] **Step 2: Sanity-check the SQL parses**

Run: `docker --version >/dev/null 2>&1 && echo docker || echo no-docker` — if a local Postgres is unavailable (expected: disk is ~92% full, docker Postgres is down), do a visual review pass instead: every `CREATE POLICY` is preceded by a matching `DROP POLICY IF EXISTS`, and every table name matches the list in the task intro.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260717_rls_baseline.sql
git commit -m "feat(db): versioned RLS baseline + grants for 8 dump-only tables"
```

---

### Task 2: Storage buckets migration (`app-documents`, `license-documents`)

`src` uses two buckets that are never created anywhere: `app-documents` (`src/pages/SettingsPage.tsx:277-281` — avatars via `getPublicUrl`, so the bucket must be **public**; also `src/hooks/useAppDocuments.ts:61-68`) and `license-documents` (`src/hooks/useLegalLicenses.ts:259` — KYC-adjacent, **private**). Only `kyc-documents` exists (created in `20260705_user_verifications.sql:137`).

**Files:**
- Create: `supabase/migrations/20260717_storage_buckets.sql`

**Interfaces:**
- Produces: storage buckets `app-documents` (public) and `license-documents` (private) with object policies.

- [ ] **Step 1: Write the migration**

```sql
-- 20260717_storage_buckets.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-documents', 'app-documents', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('license-documents', 'license-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- app-documents: world-readable (public bucket, avatars use getPublicUrl),
-- authenticated can upload; only the uploader can modify/delete their objects.
DROP POLICY IF EXISTS app_documents_bucket_read ON storage.objects;
CREATE POLICY app_documents_bucket_read ON storage.objects
  FOR SELECT USING (bucket_id = 'app-documents');
DROP POLICY IF EXISTS app_documents_bucket_insert ON storage.objects;
CREATE POLICY app_documents_bucket_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-documents');
DROP POLICY IF EXISTS app_documents_bucket_update ON storage.objects;
CREATE POLICY app_documents_bucket_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'app-documents' AND owner = auth.uid());
DROP POLICY IF EXISTS app_documents_bucket_delete ON storage.objects;
CREATE POLICY app_documents_bucket_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'app-documents' AND owner = auth.uid());

-- license-documents: private, uploader-only.
DROP POLICY IF EXISTS license_documents_bucket_rw ON storage.objects;
CREATE POLICY license_documents_bucket_rw ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'license-documents' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'license-documents' AND owner = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260717_storage_buckets.sql
git commit -m "feat(db): create app-documents and license-documents storage buckets"
```

---

### Task 3: Apply migrations to the live Supabase and verify

Three migrations are unapplied on `lbsnlplgoobuwrghawix.supabase.co`: `20260706_notifications_and_prefs.sql` (known-missing since 2026-07-06), plus Tasks 1–2. No service-role key/DB password exists locally, so this runs in the **Supabase SQL editor** (dashboard → SQL). This task is the one manual gate in the plan — if you are an agent without dashboard access, STOP and hand the three SQL files to the human with the verification commands below.

**Files:**
- Read: `supabase/migrations/20260706_notifications_and_prefs.sql`, `supabase/migrations/20260717_rls_baseline.sql`, `supabase/migrations/20260717_storage_buckets.sql`

- [ ] **Step 1: Apply in order** — paste and run each file's contents in the SQL editor: `20260706_notifications_and_prefs.sql` → `20260717_rls_baseline.sql` → `20260717_storage_buckets.sql`. Each must end "Success. No rows returned".

- [ ] **Step 2: Verify the 400 is gone (notification_preferences column exists)**

```bash
set -a; source .env; set +a
curl -s -o /dev/null -w "%{http_code}\n" \
  "$VITE_SUPABASE_URL/rest/v1/user_profiles?select=notification_preferences&limit=1" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```
Expected: `200` (was `400`).

- [ ] **Step 3: Verify buckets exist** — in the SQL editor run `SELECT id, public FROM storage.buckets ORDER BY id;`. Expected rows include `app-documents | true`, `kyc-documents | false`, `license-documents | false`.

- [ ] **Step 4: Verify notifications grant in-app** — `npm run dev`, sign in, open `/dashboard`; the browser console must show **no** `42501`/`permission denied for table notifications` errors. (The anon-key curl still gets 401 by design — the grant is `authenticated`-only.)

- [ ] **Step 5: Record** — add a line to `docs/phase-1-readiness/README.md` under a "2026-07-17" heading: `RLS baseline + buckets + notifications migrations applied to live DB.` Commit: `git add docs && git commit -m "docs: record live-DB migration apply"`.

---

### Task 4: Label AppDetailPage mock analytics as sample data

`src/pages/AppDetailPage.tsx:26` defines `const MOCK_ANALYTICS = [...]` used at lines ~256/439/458 as if it were real chart data — an audit blocker (fabricated data shown unlabeled to buyers). `AnalyticsPage` already solved this with a local `SampleBadge` (`src/pages/AnalyticsPage.tsx:90-95`). Promote that badge to a shared component and label every mock-driven surface.

**Files:**
- Create: `src/components/ui/SampleBadge.tsx`
- Modify: `src/pages/AnalyticsPage.tsx:90-95` (replace local def with import)
- Modify: `src/pages/AppDetailPage.tsx` (rename constant, add badges)

**Interfaces:**
- Produces: `SampleBadge: React.FC` exported from `src/components/ui/SampleBadge.tsx` (barrel `ui/index.ts` will pick it up automatically — don't hand-edit the barrel).

- [ ] **Step 1: Create the shared badge**

```tsx
// src/components/ui/SampleBadge.tsx
import React from 'react';

/** Small "not live" chip so sample sections are never misread as real data. */
export const SampleBadge: React.FC = () => (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Sample data
    </span>
);
```

- [ ] **Step 2: Swap AnalyticsPage to the import** — delete the local `SampleBadge` at `AnalyticsPage.tsx:90-95` and add `import { SampleBadge } from '../components/ui/SampleBadge';`. All existing `<SampleBadge />` usages keep working.

- [ ] **Step 3: Label AppDetailPage** — rename `MOCK_ANALYTICS` → `SAMPLE_ANALYTICS` (rename all ~4 references), import `SampleBadge`, and render `<SampleBadge />` inside the heading row of **each** section that renders `SAMPLE_ANALYTICS` (the chart around line 439 and the metrics block around line 458 — put the badge next to the existing section `<h2>/<h3>` text).

- [ ] **Step 4: Verify** — `npm run typecheck` (0 new errors) and `grep -n "MOCK_ANALYTICS" src/pages/AppDetailPage.tsx` (no matches).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SampleBadge.tsx src/pages/AnalyticsPage.tsx src/pages/AppDetailPage.tsx src/components/ui/index.ts
git commit -m "fix: label AppDetail sample analytics; share SampleBadge"
```

---

### Task 5: Deploy config, .env.example, and index.html metadata

No deploy manifest exists; `apiClient.ts` calls `/api/v1` relative (`VITE_API_BASE_URL` fallback), which 404s on static hosting without config. Target: Vercel static SPA. The NestJS backend (`apps/MVPLAB_BACKEND`) deploys separately (Railway/Render — out of this repo's scope); the SPA reaches it via `VITE_API_BASE_URL` set in Vercel env.

**Files:**
- Create: `vercel.json`
- Create: `.env.example`
- Modify: `index.html` (title + meta, currently just `<title>MVPLab Marketplace</title>`)

- [ ] **Step 1: Create `vercel.json`** (SPA rewrite; static assets are served before rewrites by default)

```json
{
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
        { "source": "/((?!api/).*)", "destination": "/index.html" }
    ]
}
```

- [ ] **Step 2: Create `.env.example`** (names only — never real values; note `.gitignore` already un-ignores `!.env.example`)

```bash
# Supabase (required)
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=

# Backend API (NestJS, apps/MVPLAB_BACKEND). In prod set the full deployed URL,
# e.g. https://api.myappceo.com/api/v1 — the code falls back to relative /api/v1.
VITE_API_BASE_URL=
# Dev-only: vite proxies /api -> this target (backend runs on 3001 locally)
VITE_API_PROXY_TARGET=http://localhost:3001
```

- [ ] **Step 3: Update `index.html` head** — replace the `<title>` line with:

```html
    <title>MyAppCEO — Build, fund, and sell your app</title>
    <meta name="description" content="MyAppCEO by MVPLabX: onboard as a founder, we build your app, bring in co-founders and investors, crowdfund your raise, and sell on the marketplace." />
    <meta property="og:title" content="MyAppCEO — Build, fund, and sell your app" />
    <meta property="og:description" content="Onboard as a founder, we build your app, raise from investors, and exit on the marketplace." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/logo.png" />
```

- [ ] **Step 4: Verify prod build** — `npm run build`. Expected: build succeeds, `dist/index.html` contains the new title.

- [ ] **Step 5: Commit**

```bash
git add vercel.json .env.example index.html
git commit -m "feat: Vercel SPA deploy config, env template, prod page metadata"
```

- [ ] **Step 6 (human, out-of-repo):** In Vercel, import the repo, framework preset Vite, and set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`. Deploy the NestJS backend separately and point `VITE_API_BASE_URL` at it.

---

### Task 6: Fix lint dependency and add CI

`npm run lint` is broken — the `lint: eslint .` script exists and `eslint.config.js` exists, but `eslint` is not in `package.json` devDependencies. There is also no CI anywhere (no `.github/` in the repo).

**Files:**
- Modify: `package.json` (devDependencies)
- Create: `<repo-root>/.github/workflows/ci.yml` (run `git rev-parse --show-toplevel` first — if the repo root is `apps/MyAppCEO` itself, that's where `.github/` goes; if it's the monorepo root, add `working-directory: apps/MyAppCEO` to every run step)

- [ ] **Step 1: Install eslint** — `npm install -D eslint`. Then run `npm run lint`. If it errors on missing plugins referenced by `eslint.config.js` (e.g. `typescript-eslint`, `eslint-plugin-react-hooks`), install exactly the ones the error names and re-run until it executes (warnings are fine; note the error count).

- [ ] **Step 2: Create the workflow**

```yaml
name: CI
on:
    push:
        branches: [main]
    pull_request:

jobs:
    checks:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
            - run: npm install
            - run: npm run typecheck
            - run: npm test
            - run: npm run build
              env:
                  VITE_SUPABASE_URL: https://ci-placeholder.supabase.co
                  VITE_SUPABASE_ANON_KEY: ci-placeholder
```

- [ ] **Step 3: Verify locally** — `npm run typecheck && npm test && npm run build` all pass (typecheck: only the pre-existing `usePayments.ts` baseline error, if it still exists, is tolerated — if CI would fail on it, fix it or scope `typecheck` to exclude nothing and fix the error properly).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .github/workflows/ci.yml
git commit -m "chore: fix eslint devDependency, add CI workflow"
```

---

# Phase 2 — First-run onboarding rework

### Task 7: Blurred dashboard + two-action welcome overlay

Today `DashboardPage.tsx:211-260` early-returns a full-screen 3-option "Choose the path" screen when `isFirstRun` (`totalApps === 0`, line 165) — new users never see the actual dashboard, and "start a new idea" isn't even offered. Rework: always render the real dashboard; when `isFirstRun`, blur it (non-interactive) and float a centered welcome card with exactly two actions — **Start a new idea** (bold primary → `/ideas/new`) and **Upload an existing app or service** (secondary → `/apps/new`).

**Files:**
- Create: `src/components/FirstRunOverlay.tsx`
- Modify: `src/pages/DashboardPage.tsx` (delete lines 167-195 `firstRunOptions` + lines 211-260 early return; wrap main return)

**Interfaces:**
- Produces: `FirstRunOverlay: React.FC<{ variant?: 'founder' | 'investor' }>` — Task 12 reuses the `investor` variant.
- Consumes: existing `isFirstRun` boolean (`DashboardPage.tsx:165`) — keep it.

- [ ] **Step 1: Create the overlay component**

```tsx
// src/components/FirstRunOverlay.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, UploadCloud, TrendingUp } from 'lucide-react';

interface FirstRunOverlayProps {
    variant?: 'founder' | 'investor';
}

/**
 * Floats over the (blurred) dashboard on first run. Founders choose between
 * starting a new idea (primary) or uploading an existing app; investors are
 * pointed at campaigns. Shadow is intentional — this is an overlay surface.
 */
export const FirstRunOverlay: React.FC<FirstRunOverlayProps> = ({ variant = 'founder' }) => (
    <div className="absolute inset-0 z-30 flex items-start justify-center px-4 pt-16 sm:pt-24">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-2xl sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Welcome to MyAppCEO</p>
            {variant === 'founder' ? (
                <>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Let&apos;s get your first app going.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Start from a brand-new idea and MVPLabX builds it with you — or bring an app or
                        service you already run. Your dashboard unlocks as soon as one is in place.
                    </p>
                    <div className="mt-8 grid gap-3">
                        <Link
                            to="/ideas/new"
                            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                            <Rocket size={20} /> Start a new idea
                        </Link>
                        <Link
                            to="/apps/new"
                            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                            <UploadCloud size={18} /> Upload an existing app or service
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Find your first investment.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Browse live campaigns from founders building with MVPLabX. Your portfolio
                        appears here once you back your first one.
                    </p>
                    <div className="mt-8 grid gap-3">
                        <Link
                            to="/campaigns"
                            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                            <TrendingUp size={20} /> Browse campaigns
                        </Link>
                    </div>
                </>
            )}
        </div>
    </div>
);
```

- [ ] **Step 2: Rework DashboardPage** — in `src/pages/DashboardPage.tsx`:
  1. Delete the `firstRunOptions` array (lines 167-195) and the whole `if (isFirstRun) { return (...) }` block (lines 211-260). Keep `isFirstRun` (line 165) and the loading return (lines 197-209).
  2. Remove now-unused imports (`WorkspaceStartGrid`, `WorkspaceStartOption`, and any icons only used by `firstRunOptions` — check with typecheck/lint).
  3. Add `import { FirstRunOverlay } from '../components/FirstRunOverlay';`.
  4. In the main `return`, wrap the page content (the direct child of `<DashboardLayout>`) like this:

```tsx
    return (
        <DashboardLayout>
            <div className="relative">
                <div
                    className={isFirstRun ? 'pointer-events-none select-none blur-md' : undefined}
                    aria-hidden={isFirstRun || undefined}
                >
                    {/* ...ALL existing dashboard content stays here unchanged... */}
                </div>
                {isFirstRun && <FirstRunOverlay />}
            </div>
        </DashboardLayout>
    );
```

- [ ] **Step 3: Verify** — `npm run typecheck` (0 new errors), then `npm run dev` and check `/dashboard` with a zero-app account (or temporarily hardcode `const isFirstRun = true` — REVERT before commit): dashboard cards render blurred behind a centered card with the bold "Start a new idea" button on top and "Upload an existing app or service" below; sidebar still clickable; both links navigate.

- [ ] **Step 4: Commit**

```bash
git add src/components/FirstRunOverlay.tsx src/pages/DashboardPage.tsx
git commit -m "feat: first-run dashboard shows blurred preview with idea/upload entry actions"
```

---

# Phase 3 — Founder-journey (lifecycle) UI

### Task 8: `founderJourney` util (TDD)

Pure derivation of the four lifecycle stages (Build → Team → Fund → Sell) from booleans the dashboard already knows. Pure function ⇒ unit-testable with the existing plain-Vitest setup.

**Files:**
- Create: `src/utils/founderJourney.ts`
- Test: `tests/founderJourney.test.ts`

**Interfaces:**
- Produces: `getFounderJourney(inputs: JourneyInputs): JourneyStage[]` with types `JourneyInputs { hasApp; hasIdea; hasTeam; hasCampaign; hasListing; firstAppId?: string | null }`, `JourneyStage { key: 'build'|'team'|'fund'|'sell'; label: string; description: string; state: 'complete'|'current'|'upcoming'; href: string }`. Task 9 consumes both.

- [ ] **Step 1: Write the failing test**

```ts
// tests/founderJourney.test.ts
import { describe, expect, it } from 'vitest';
import { getFounderJourney } from '../src/utils/founderJourney';

const base = { hasApp: false, hasIdea: false, hasTeam: false, hasCampaign: false, hasListing: false, firstAppId: null };

describe('getFounderJourney', () => {
    it('brand-new user: build is current, rest upcoming, build links to new idea', () => {
        const stages = getFounderJourney(base);
        expect(stages.map(s => s.state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
        expect(stages[0].href).toBe('/ideas/new');
    });

    it('idea in flight but no app: build still current, links to my-ideas', () => {
        const stages = getFounderJourney({ ...base, hasIdea: true });
        expect(stages[0].state).toBe('current');
        expect(stages[0].href).toBe('/my-ideas');
    });

    it('app + team done: fund is current', () => {
        const stages = getFounderJourney({ ...base, hasApp: true, hasTeam: true });
        expect(stages.map(s => s.state)).toEqual(['complete', 'complete', 'current', 'upcoming']);
    });

    it('team stage deep-links to the first owned app', () => {
        const stages = getFounderJourney({ ...base, hasApp: true, firstAppId: 'abc-123' });
        expect(stages[1].href).toBe('/apps/abc-123/team');
    });

    it('everything done: all complete, none current', () => {
        const stages = getFounderJourney({ hasApp: true, hasIdea: true, hasTeam: true, hasCampaign: true, hasListing: true, firstAppId: 'x' });
        expect(stages.every(s => s.state === 'complete')).toBe(true);
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/founderJourney.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/utils/founderJourney.ts
export type JourneyStageKey = 'build' | 'team' | 'fund' | 'sell';
export type JourneyStageState = 'complete' | 'current' | 'upcoming';

export interface JourneyInputs {
    hasApp: boolean;
    hasIdea: boolean;
    hasTeam: boolean;
    hasCampaign: boolean;
    hasListing: boolean;
    firstAppId?: string | null;
}

export interface JourneyStage {
    key: JourneyStageKey;
    label: string;
    description: string;
    state: JourneyStageState;
    href: string;
}

/**
 * The MyAppCEO founder lifecycle: MVPLabX builds your app, you assemble the
 * team, crowdfund the raise, then exit on the marketplace.
 */
export function getFounderJourney(inputs: JourneyInputs): JourneyStage[] {
    const defs: Array<Omit<JourneyStage, 'state'> & { complete: boolean }> = [
        {
            key: 'build',
            label: 'Build',
            complete: inputs.hasApp,
            description: inputs.hasApp
                ? 'Your app is live in your workspace.'
                : inputs.hasIdea
                  ? 'Your idea is in the pipeline — take it through to an app.'
                  : 'Start a new idea or bring an existing app.',
            href: inputs.hasApp ? '/apps' : inputs.hasIdea ? '/my-ideas' : '/ideas/new',
        },
        {
            key: 'team',
            label: 'Team',
            complete: inputs.hasTeam,
            description: 'Invite co-founders and assign roles and equity.',
            href: inputs.firstAppId ? `/apps/${inputs.firstAppId}/team` : '/apps',
        },
        {
            key: 'fund',
            label: 'Fund',
            complete: inputs.hasCampaign,
            description: 'Raise from investors with a crowdfunding campaign.',
            href: '/campaigns/new',
        },
        {
            key: 'sell',
            label: 'Sell',
            complete: inputs.hasListing,
            description: 'List your app on the marketplace when you are ready to exit.',
            href: '/listings/new',
        },
    ];
    const firstIncomplete = defs.findIndex(d => !d.complete);
    return defs.map(({ complete, ...d }, i) => ({
        ...d,
        state: complete ? 'complete' : i === firstIncomplete ? 'current' : 'upcoming',
    }));
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run tests/founderJourney.test.ts`. Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/founderJourney.ts tests/founderJourney.test.ts
git commit -m "feat: founder journey stage derivation (build/team/fund/sell)"
```

---

### Task 9: `FounderJourneyCard` on the dashboard

Render the four-stage journey as a card between the dashboard header and the priority-goals card, so every founder sees where they are in the lifecycle. Data comes from state DashboardPage already holds, plus one new lightweight count (listings) and one derived boolean (team).

**Files:**
- Create: `src/components/FounderJourneyCard.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `getFounderJourney`, `JourneyStage` from `src/utils/founderJourney` (Task 8).
- Produces: `FounderJourneyCard: React.FC<{ stages: JourneyStage[] }>`.

- [ ] **Step 1: Create the card component**

```tsx
// src/components/FounderJourneyCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { JourneyStage } from '../utils/founderJourney';

export const FounderJourneyCard: React.FC<{ stages: JourneyStage[] }> = ({ stages }) => {
    const completeCount = stages.filter(s => s.state === 'complete').length;
    return (
        <section aria-label="Founder journey" className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Your founder journey
                </h2>
                <span className="text-xs text-muted-foreground">
                    {completeCount}/{stages.length} complete
                </span>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stages.map((stage, i) => (
                    <li key={stage.key}>
                        <Link
                            to={stage.href}
                            className={`block h-full rounded-xl border p-4 transition-colors ${
                                stage.state === 'current'
                                    ? 'border-primary bg-primary/5'
                                    : stage.state === 'complete'
                                      ? 'border-border bg-muted/50'
                                      : 'border-border opacity-60 hover:opacity-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        stage.state === 'complete'
                                            ? 'bg-primary text-primary-foreground'
                                            : stage.state === 'current'
                                              ? 'bg-primary/15 text-primary'
                                              : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {stage.state === 'complete' ? <Check size={14} /> : i + 1}
                                </span>
                                <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{stage.description}</p>
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
};
```

- [ ] **Step 2: Wire into DashboardPage** — in `src/pages/DashboardPage.tsx`:
  1. Imports: `import { FounderJourneyCard } from '../components/FounderJourneyCard';` and `import { getFounderJourney } from '../utils/founderJourney';`.
  2. Add a `listingsCount` state alongside the other counts, loaded in the existing data `useEffect` (lines 82-160) with a head-count query (the `listings` table is already RLS-covered):

```ts
    const [listingsCount, setListingsCount] = useState(0);
    // inside the existing load effect, alongside the other fetches:
    supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .then(({ count }) => setListingsCount(count ?? 0));
```

  3. Derive `hasTeam` the same way the existing "build team" priority goal does (find the goal derivation in the goals block, lines ~289-523, and reuse the same expression — typically "any owned app has co-owners/members"; if the goal computes a `done` boolean, lift that expression into a `const hasTeam = ...` above both usages so goal and journey agree).
  4. Compute and render (place directly ABOVE the priority-goals card in the JSX):

```tsx
    const journeyStages = getFounderJourney({
        hasApp: totalApps > 0,
        hasIdea: ideasCount > 0,
        hasTeam,
        hasCampaign: campaignsCount > 0,
        hasListing: listingsCount > 0,
        firstAppId: ownedApps[0]?.app_id ?? null,
    });
    // in JSX:
    <FounderJourneyCard stages={journeyStages} />
```

- [ ] **Step 3: Verify** — `npm run typecheck` + `npm test` pass; `npm run dev` → `/dashboard` shows the journey card with the correct current stage highlighted; each stage navigates to its href.

- [ ] **Step 4: Commit**

```bash
git add src/components/FounderJourneyCard.tsx src/pages/DashboardPage.tsx
git commit -m "feat: founder journey card on dashboard (build/team/fund/sell)"
```

---

### Task 10: Wire PipelineStepper into IdeaDetailPage

`src/components/PipelineStepper.tsx` (props: `{ status: string; variant?: 'default' | 'compact'; className?: string; onStageClick?: (stageKey: string) => void }`, fed by `getPipelineStageStates` in `src/utils/ideaLifecycle.ts`) is built but imported nowhere. Wire the compact variant into the idea detail header so the idea-level pipeline mirrors the dashboard-level journey.

**Files:**
- Modify: `src/pages/IdeaDetailPage.tsx`

**Interfaces:**
- Consumes: `PipelineStepper` from `src/components/PipelineStepper`; the page's existing `idea.status` value.

- [ ] **Step 1: Wire it** — in `IdeaDetailPage.tsx`, add `import { PipelineStepper } from '../components/PipelineStepper';` and render directly beneath the page's title/status header block (immediately after the element that shows the idea's name + status badge):

```tsx
    <PipelineStepper status={idea.status} variant="compact" className="mt-4" />
```

  The page already has a 3-step completion meter from `getIdeaCompletion` — keep whichever reads better in context, but do not show BOTH meters in the same header: if the 3-step meter sits in the same header block, replace it with the stepper (it is a strict superset: 6 lifecycle stages vs 3 generic steps).

- [ ] **Step 2: Verify** — `npm run typecheck`; `npm run dev` → open any idea at `/ideas/:id`: the stepper renders, current stage matches the status badge, and no duplicate meter shows in the header.

- [ ] **Step 3: Commit**

```bash
git add src/pages/IdeaDetailPage.tsx
git commit -m "feat: wire PipelineStepper into idea detail header"
```

---

# Phase 4 — Role-scoped dashboards (investors / co-founders limited)

### Task 11: Role-aware navigation (`navConfig` + filter, TDD)

The sidebar (`src/components/DashboardLayout.tsx:59-115` `NAV_SECTIONS`) is identical for every platform role except Admin. Move nav config into its own module, add a `roles` field, and filter by the user's platform role (`user_profiles.role` via `useUserStatus`). Investors lose founder-only build/promote entries and gain "My Investments" (route `/my-investments` exists but is linked from nowhere today).

Visibility matrix (platform roles; `roles` omitted = visible to all):
- `Start New Idea`, `My Ideas`, `My Campaigns`, `Promote`, `Legal & Licenses`: `['ceo', 'creator', 'admin', 'analyst']` (hidden from `investor`)
- NEW `My Investments` (`/my-investments`, icon `Briefcase`): all roles
- Everything else (Overview, Browse Campaigns, Portfolio, Stakes, My Apps, Finances, Analytics, Marketplace, Connections, Settings): all roles
- Admin section: unchanged (`adminOnly` + `adminPermission` logic preserved)

**Files:**
- Create: `src/components/navConfig.ts`
- Modify: `src/components/DashboardLayout.tsx` (delete inline `NAV_SECTIONS`/types, import from navConfig, filter with role)
- Test: `tests/navConfig.test.ts`

**Interfaces:**
- Produces: `PlatformRole` type, `NavItem { icon; label; path; adminOnly?; adminPermission?; roles?: PlatformRole[] }`, `NavSection { title; items }`, `NAV_SECTIONS`, `filterNavSections(sections, ctx: { role: PlatformRole | null; isAdmin: boolean; hasAdminPermission: (p: string) => boolean }): NavSection[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/navConfig.test.ts
import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS, filterNavSections } from '../src/components/navConfig';

const ctx = (role: string | null, isAdmin = false) => ({
    role: role as never,
    isAdmin,
    hasAdminPermission: () => true,
});
const labels = (sections: ReturnType<typeof filterNavSections>) =>
    sections.flatMap(s => s.items.map(i => i.label));

describe('filterNavSections', () => {
    it('ceo sees Build section and no Admin section', () => {
        const out = labels(filterNavSections(NAV_SECTIONS, ctx('ceo')));
        expect(out).toContain('Start New Idea');
        expect(out).toContain('My Investments');
        expect(out).not.toContain('Review Queue');
    });

    it('investor loses founder-only items but keeps investing + core items', () => {
        const out = labels(filterNavSections(NAV_SECTIONS, ctx('investor')));
        expect(out).not.toContain('Start New Idea');
        expect(out).not.toContain('My Ideas');
        expect(out).not.toContain('My Campaigns');
        expect(out).not.toContain('Promote');
        expect(out).not.toContain('Legal & Licenses');
        expect(out).toContain('My Investments');
        expect(out).toContain('Portfolio');
        expect(out).toContain('My Apps');
        expect(out).toContain('Settings');
    });

    it('investor: empty sections are dropped entirely', () => {
        const out = filterNavSections(NAV_SECTIONS, ctx('investor'));
        expect(out.find(s => s.title === 'Build')).toBeUndefined();
    });

    it('unknown/unloaded role sees all non-admin items (no nav flash)', () => {
        const out = labels(filterNavSections(NAV_SECTIONS, ctx(null)));
        expect(out).toContain('Start New Idea');
        expect(out).not.toContain('Review Queue');
    });

    it('admin with permission sees admin items', () => {
        const out = labels(filterNavSections(NAV_SECTIONS, ctx('admin', true)));
        expect(out).toContain('Review Queue');
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/navConfig.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/navConfig.ts`** — move the existing `NavItem`/`NavSection` interfaces and the whole `NAV_SECTIONS` array out of `DashboardLayout.tsx` verbatim (icons imported from `lucide-react` exactly as they are today), then apply the matrix:

```ts
// src/components/navConfig.ts
import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard, Rocket, Lightbulb, Target, TrendingUp, PieChart, Percent,
    FolderKanban, Wallet, Scale, BarChart2, Store, Megaphone, Plug, Settings,
    ClipboardList, ShieldCheck, Bell, Newspaper, History, Briefcase,
} from 'lucide-react';

export type PlatformRole = 'ceo' | 'investor' | 'creator' | 'admin' | 'analyst';

export interface NavItem {
    icon: LucideIcon;
    label: string;
    path: string;
    adminOnly?: boolean;
    adminPermission?: string;
    /** Platform roles that see this item. Omitted = everyone. */
    roles?: PlatformRole[];
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

const FOUNDER_ROLES: PlatformRole[] = ['ceo', 'creator', 'admin', 'analyst'];

export const NAV_SECTIONS: NavSection[] = [
    { title: 'Home', items: [{ icon: LayoutDashboard, label: 'Overview', path: '/dashboard' }] },
    {
        title: 'Build',
        items: [
            { icon: Rocket, label: 'Start New Idea', path: '/ideas/new', roles: FOUNDER_ROLES },
            { icon: Lightbulb, label: 'My Ideas', path: '/my-ideas', roles: FOUNDER_ROLES },
            { icon: Target, label: 'My Campaigns', path: '/my-campaigns', roles: FOUNDER_ROLES },
        ],
    },
    {
        title: 'Invest',
        items: [
            { icon: TrendingUp, label: 'Browse Campaigns', path: '/campaigns' },
            { icon: Briefcase, label: 'My Investments', path: '/my-investments' },
            { icon: PieChart, label: 'Portfolio', path: '/portfolio' },
            { icon: Percent, label: 'Stakes & Ownership', path: '/stakes' },
        ],
    },
    {
        title: 'Manage',
        items: [
            { icon: FolderKanban, label: 'My Apps', path: '/apps' },
            { icon: Wallet, label: 'Finances', path: '/finances' },
            { icon: Scale, label: 'Legal & Licenses', path: '/legal', roles: FOUNDER_ROLES },
        ],
    },
    {
        title: 'Grow',
        items: [
            { icon: BarChart2, label: 'Analytics', path: '/analytics' },
            { icon: Store, label: 'Marketplace', path: '/marketplace' },
            { icon: Megaphone, label: 'Promote', path: '/promote', roles: FOUNDER_ROLES },
        ],
    },
    {
        title: 'Account',
        items: [
            { icon: Plug, label: 'Connections', path: '/connections' },
            { icon: Settings, label: 'Settings', path: '/settings' },
        ],
    },
    {
        title: 'Admin',
        items: [
            { icon: ClipboardList, label: 'Review Queue', path: '/admin/review', adminOnly: true, adminPermission: 'review_queue' },
            { icon: ShieldCheck, label: 'Verifications', path: '/admin/verifications', adminOnly: true, adminPermission: 'identity_verification' },
            { icon: Bell, label: 'Notifications', path: '/admin/notifications', adminOnly: true, adminPermission: 'notifications' },
            { icon: Newspaper, label: 'Blog', path: '/admin/blog', adminOnly: true, adminPermission: 'content_management' },
            { icon: History, label: 'Audit Log', path: '/audit-log', adminOnly: true, adminPermission: 'audit_log' },
        ],
    },
];

export function filterNavSections(
    sections: NavSection[],
    ctx: { role: PlatformRole | null; isAdmin: boolean; hasAdminPermission: (permission: string) => boolean },
): NavSection[] {
    return sections
        .map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (item.adminOnly) {
                    if (!ctx.isAdmin) return false;
                    return item.adminPermission ? ctx.hasAdminPermission(item.adminPermission) : true;
                }
                // Role not loaded yet: show the default (full) nav rather than flashing a reduced one.
                if (item.roles && ctx.role) return item.roles.includes(ctx.role);
                return true;
            }),
        }))
        .filter(section => section.items.length > 0);
}
```

- [ ] **Step 4: Run to verify tests pass** — `npx vitest run tests/navConfig.test.ts`. Expected: 5 passed.

- [ ] **Step 5: Wire DashboardLayout** — in `DashboardLayout.tsx`: delete the local `NavItem`/`NavSection` interfaces and `NAV_SECTIONS` (lines ~50-115) plus their now-unused icon imports; add `import { NAV_SECTIONS, filterNavSections, type PlatformRole } from './navConfig';`. Replace the inline filter (lines 181-187) with:

```tsx
    const sections = filterNavSections(NAV_SECTIONS, {
        role: (profile?.role as PlatformRole) ?? null,
        isAdmin,
        hasAdminPermission: (permission) => hasAdminPermission(user, profile?.role, permission),
    });
    // then in JSX: {sections.map((section) => ( ...existing section rendering,
    // using section.items directly instead of visibleItems... ))}
```

- [ ] **Step 6: Verify** — `npm run typecheck` + `npm test`; `npm run dev`: with your normal (ceo) account the sidebar is unchanged except a new "My Investments" entry; temporarily hardcode `role: 'investor'` in the `filterNavSections` call to see the reduced nav (Build gone, Promote gone) — REVERT before commit.

- [ ] **Step 7: Commit**

```bash
git add src/components/navConfig.ts src/components/DashboardLayout.tsx tests/navConfig.test.ts
git commit -m "feat: role-aware sidebar navigation with My Investments entry"
```

---

### Task 12: Investor dashboard variant

Same `/dashboard` route, feature-flagged by platform role: investors keep the shell but lose founder-only blocks (priority-goals checklist, journey card, New idea CTA) and get an invest-focused header + first-run. Per-app pages are already role-guarded (`ProtectedRoute` + `useAppRole`), so this task only touches DashboardPage.

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `profile?.role` from the page's existing `useUserStatus()`; `FirstRunOverlay` `variant` prop (Task 7); journey rendering (Task 9).

- [ ] **Step 1: Add the feature map** — near the top of the DashboardPage component file (module scope):

```ts
interface DashboardFeatures {
    journey: boolean;      // FounderJourneyCard
    goals: boolean;        // priority-goals checklist card
    founderCtas: boolean;  // "New idea" / "Add app" header buttons
}

const ROLE_DASHBOARD: Record<string, DashboardFeatures> = {
    ceo: { journey: true, goals: true, founderCtas: true },
    creator: { journey: true, goals: true, founderCtas: true },
    admin: { journey: true, goals: true, founderCtas: true },
    analyst: { journey: false, goals: false, founderCtas: false },
    investor: { journey: false, goals: false, founderCtas: false },
};
```

- [ ] **Step 2: Apply the flags** — inside the component:

```ts
    const features = ROLE_DASHBOARD[profile?.role ?? ''] ?? ROLE_DASHBOARD.ceo;
    const isInvestor = profile?.role === 'investor';
```

  1. Wrap the journey card (Task 9): `{features.journey && <FounderJourneyCard stages={journeyStages} />}`.
  2. Wrap the priority-goals card (lines ~289-523 block): `{features.goals && ( ...existing goals JSX... )}`.
  3. Header buttons (lines ~414-432): render the existing "New idea"/"Add app" buttons only when `features.founderCtas`; for investors render instead:

```tsx
    <Link to="/campaigns" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
        <TrendingUp size={16} /> Browse campaigns
    </Link>
```

  4. First-run overlay (Task 7): `{isFirstRun && <FirstRunOverlay variant={isInvestor ? 'investor' : 'founder'} />}`. For investors, ALSO relax the blur trigger: an investor with zero apps but existing investments is not "first-run" — change the overlay condition to `isFirstRun && (!isInvestor || investmentsCount === 0)` where `investmentsCount` comes from a new state filled in the existing load effect via `useCrowdfunding().getMyInvestments` (the hook is already imported on this page; store `res.length` — match how MyInvestmentsPage consumes the same call).

- [ ] **Step 3: Verify** — `npm run typecheck` + `npm test`; `npm run dev`: normal account unchanged; temporarily hardcode `const features = ROLE_DASHBOARD.investor; const isInvestor = true;` to confirm goals/journey/CTAs disappear and "Browse campaigns" appears — REVERT before commit.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: investor-limited dashboard variant"
```

---

### Task 13: Permission-filter AppDashboard core actions for co-founders/shareholders

The per-app hub (`src/pages/AppDashboardPage.tsx`, `coreActions` array ~line 141) links team/cap-table/equity/formation/legal for everyone with page access, but routes are permission-gated in `ProtectedRoute.tsx:24-34` (team→`manage_team`, cap-table→`view_cap_table`, equity→`change_equity_splits`, legal→`view_legal_agreements`, formation→owner/cofounder) — so shareholders see actions that 403 on click. Filter the actions by the same permission matrix so limited roles see a limited hub.

**Files:**
- Modify: `src/hooks/useAppRole.ts` (export a pure permission checker if not already exported)
- Modify: `src/pages/AppDashboardPage.tsx`
- Test: `tests/appRolePermissions.test.ts`

**Interfaces:**
- Produces: `roleCan(role: string | null, permission: string): boolean` exported from `src/hooks/useAppRole.ts`, backed by the existing `ROLE_PERMISSIONS` matrix (lines 56-183). If the hook already returns an equivalent checker (e.g. `hasPermission`), export/reuse THAT instead of adding a duplicate — check the hook's return value first.

- [ ] **Step 1: Write the failing test**

```ts
// tests/appRolePermissions.test.ts
import { describe, expect, it } from 'vitest';
import { roleCan } from '../src/hooks/useAppRole';

describe('roleCan', () => {
    it('owner can manage team and change equity', () => {
        expect(roleCan('owner', 'manage_team')).toBe(true);
        expect(roleCan('owner', 'change_equity_splits')).toBe(true);
    });
    it('shareholder can view cap table but not manage team', () => {
        expect(roleCan('shareholder', 'view_cap_table')).toBe(true);
        expect(roleCan('shareholder', 'manage_team')).toBe(false);
    });
    it('null/unknown role can do nothing', () => {
        expect(roleCan(null, 'manage_team')).toBe(false);
        expect(roleCan('bogus', 'view_cap_table')).toBe(false);
    });
});
```

Note: if `ROLE_PERMISSIONS`' shareholder entry differs from these expectations (read `useAppRole.ts:56-183` first), adjust the test to assert the matrix's ACTUAL values — the test pins the matrix, it does not redesign it.

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/appRolePermissions.test.ts`. Expected: FAIL (`roleCan` not exported).

- [ ] **Step 3: Export the checker** — in `src/hooks/useAppRole.ts`, next to `ROLE_PERMISSIONS`:

```ts
/** Pure permission check against the ROLE_PERMISSIONS matrix (null-safe). */
export function roleCan(role: string | null, permission: string): boolean {
    if (!role) return false;
    const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (!perms) return false;
    return Boolean((perms as Record<string, boolean>)[permission]);
}
```

If the hook body already computes permissions this way, refactor it to call `roleCan` so there is one source of truth.

- [ ] **Step 4: Run to verify it passes** — `npx vitest run tests/appRolePermissions.test.ts`. Expected: 3 passed.

- [ ] **Step 5: Filter coreActions** — in `AppDashboardPage.tsx`: the page already knows the viewer's role (it uses `useAppRole` — find the existing call). Tag each entry in `coreActions` (~line 141) with the SAME permission `ProtectedRoute` requires for its target route: team → `'manage_team'`, cap table → `'view_cap_table'`, equity → `'change_equity_splits'`, formation/legal-entity → `'manage_legal_entity'` if that key exists in the matrix, else omit and gate on role `owner`/`cofounder` like ProtectedRoute does, legal → `'view_legal_agreements'`. Then:

```ts
    const visibleActions = coreActions.filter(
        action => !action.permission || roleCan(role, action.permission),
    );
```

and render `visibleActions` where `coreActions` was rendered. (`role` = the role string from the existing `useAppRole` call; `admin` per-app role passes everything in the matrix already.)

- [ ] **Step 6: Verify** — `npm run typecheck` + `npm test`; `npm run dev` → open an app you own at `/apps/:id/dashboard`: all actions visible. (Shareholder view needs a second account — if unavailable, temporarily hardcode the role var to `'shareholder'` and confirm team/equity/formation actions disappear — REVERT before commit.)

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useAppRole.ts src/pages/AppDashboardPage.tsx tests/appRolePermissions.test.ts
git commit -m "feat: permission-filter app hub actions for limited roles"
```

---

## Execution order & independence

- Phase 1 tasks 1→2→3 are sequential (3 applies 1+2). Tasks 4, 5, 6 are independent of everything.
- Phase 2 (task 7) is independent. Phase 3: 8→9 sequential, 10 independent. Phase 4: 11 and 13 independent; 12 depends on 7 and 9.
- Safe parallel lanes for subagents: {1,2,3}, {4}, {5}, {6}, {7→12}, {8→9}, {10}, {11}, {13} — 12 last among the UI lane.

## Final verification (after all tasks)

1. `npm run typecheck && npm test && npm run build` — all green.
2. `npm run dev` walk-through: fresh account → blurred dashboard + two CTAs → "Start a new idea" reaches the idea form; existing account → journey card shows correct stage; idea detail shows the pipeline stepper; sidebar shows My Investments.
3. Live DB probes from Task 3 all return expected codes.
