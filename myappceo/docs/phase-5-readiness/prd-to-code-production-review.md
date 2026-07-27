# PRD-to-Code Production Readiness Review

Date: 2026-05-16

## Current State

MyAppCEO has three related but fragmented flows:

- App intake for existing products posts to `/apps/managed`, creates an app workspace, and now submits the generated listing to admin review.
- Idea creation can generate a PRD, designs, and cost estimate through `/ideas/:id/*`.
- Development tracking records manual phases, milestones, tasks, and deployments, but it does not generate a repository, codebase, pull request, build, test report, or deployable artifact from the PRD.

The core product gap is that "PRD generated" is treated as an end state for ideation instead of the contract for production work.

## Immediate Fixes Implemented

- Protected private idea, PRD, and design read endpoints with JWT auth.
- Added backend support for `PATCH /ideas/:id/prd`, matching the existing PRD mind-map autosave hook.
- Enforced idea ownership before standalone design generation writes to `design_mockups`.
- Added JWT auth before admin role checks on moderation endpoints.
- Removed user-editable Supabase `user_metadata.role` from the trusted admin role path.
- Normalized admin role checks so backend `admin` users can pass super-admin/moderator gates.
- Changed managed app intake listing status from `draft` to `pending_review` so submitted apps enter the admin queue.
- Fixed moderation queue filtering for comma-separated statuses.
- Added `/prd-mindmap/:id` route so PRD editing can persist against an idea.
- Fixed submission option routes for campaigns and developer handoff.
- Upgraded PRD generation from loose JSON mode to schema-constrained output and added missing code-readiness sections.
- Added generation pipeline tables for durable jobs, generated artifacts, repo links, quality reports, and review submissions.
- Added owner-scoped RLS policies for idea, PRD, design, generation, artifact, quality report, repo link, and review submission records.
- Added backend PRD-to-code endpoints for build-plan generation, code scaffold generation, artifact listing, job lookup, and admin-review submission.
- Added admin moderation support for `generated_code` and `app_submission` review item types.
- Added frontend Build tab and PRD editor handoff so users can create a build plan, generate a scaffold artifact, and submit it for review.
- Added focused backend tests for generation ownership, artifact creation, review submission, and moderation queue behavior.

## PRD Expansion Needed

The generated PRD should become the canonical build spec. Required sections:

- Product scope: goals, non-goals, personas, user journeys, constraints.
- Functional requirements: feature list, priorities, dependencies, acceptance criteria.
- UX architecture: routes/screens, components, states, empty/error/loading flows.
- Data model: entities, fields, ownership, retention, PII classification.
- API contracts: endpoints, auth mode, payload schema, error codes, rate limits.
- Permission model: owner, cofounder, shareholder, admin, reviewer capabilities.
- Technical architecture: frontend stack, backend services, storage, background jobs, integrations.
- Quality plan: unit/integration/E2E tests, accessibility, performance budgets, security checks.
- Launch checklist: environment variables, migrations, observability, rollback, legal/compliance.
- Admin review package: repository evidence, ownership proof, revenue/user proof, moderation checklist.

## PRD-to-Code Pipeline Implemented

The codebase now has an explicit production pipeline:

1. `prd_generated`
2. `build_plan_generated`
3. `code_generation_running`
4. `quality_report_created`
5. `submitted_for_admin_review`
6. `approved`, `rejected`, or `changes_requested`

Implemented backend primitives:

- `generation_jobs`: job status, model, prompt version, idempotency key, cost tokens, retries, owner.
- `generated_artifacts`: build plan, code scaffold, logs, screenshots, patches, deployment metadata.
- `repo_links`: provider, repo URL, branch, commit SHA, PR URL, installation/user permissions.
- `review_submissions`: submitted artifact bundle, reviewer, decision, reasons, timestamps.
- `quality_reports`: lint, typecheck, tests, security scan, accessibility, performance.

The remaining production step is to attach the pipeline to an isolated code-execution worker that can create branches, apply patches, run verification, and publish preview deployments.

## Admin Review Improvements

- Review apps, listings, generated code, and deployments as separate review item types.
- Store structured rejection reasons and allow resubmission against the same review item.
- Show repository URL, commit SHA, PR URL, build logs, screenshots, env requirements, and automated checks in the review modal.
- Require revenue/ownership evidence before marketplace approval.
- Send notifications for approval, rejection, changes requested, and stale submissions.

## Production Readiness Risks

- PRD/design/code generation is still request-bound and should move to an external durable worker with retry, cancellation, and progress events.
- There are no automated evals for PRD quality, schema completeness, or PRD-to-build-plan accuracy.
- No code-generation sandbox runner exists yet, so generated code artifacts are not automatically applied to a repository, built, tested, or preview-deployed.
- No hard cost/rate limits are attached to AI generation actions.
- The migration must be applied in Supabase and validated against current production extensions before launch.
- Review submission notifications are not yet sent for generated-code approval, rejection, or changes requested.
- Design provider selection remains misleading until backend provider routing supports non-OpenAI engines.

## Remaining Infrastructure Phase

Complete the production runner in this order:

1. Move build-plan and code generation execution from request handlers to a queue-backed worker.
2. Add a sandbox runner that can create a branch, apply generated patches, run lint/typecheck/tests, and store logs.
3. Connect `repo_links` to GitHub/Vercel so commit SHA, PR URL, preview URL, and deployment status are stored before admin review.
4. Add generation budgets and rate limits per user/workspace.
5. Add E2E tests for cross-user access, admin access, submission lifecycle, and rejection/resubmission.
