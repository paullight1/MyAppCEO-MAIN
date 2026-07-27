# Idea-To-Build, PRD, Design, Generation, And Lifecycle

## Parallel Ownership Boundary

Owned areas:
- `src/hooks/useIdeas.ts`
- `src/hooks/usePRD.ts`
- `src/hooks/useAI.ts`
- `src/hooks/useAISuggestions.ts`
- `src/hooks/useGenerationProgress.ts`
- `src/hooks/useGenerationArtifacts.ts`
- `src/hooks/useGoogleStitch.ts`
- `src/hooks/useDevelopment.ts`
- `src/components/prd/*`
- `src/components/idea/*`
- `src/components/AIChat.tsx`
- `src/components/modals/DesignLightbox.tsx`
- `src/components/modals/PostUpdateModal.tsx`
- `src/pages/CreateIdeaPage.tsx`
- `src/pages/MyIdeasPage.tsx`
- `src/pages/IdeaDetailPage.tsx`
- `src/pages/PRDMindMapPage.tsx`
- `src/pages/DesignStudioPage.tsx`
- `src/pages/DesignStudioPage/*`
- `src/pages/PhaseDetailPage.tsx`
- `src/pages/CreateDeploymentPage.tsx`
- Generation and lifecycle backend/tables: ideas/app ideas, PRD versions, PRD graph, design mockups, design generation progress, generation jobs, generated artifacts, quality reports, review submissions, development phases, milestones, tasks, progress updates, deployments

Avoid editing:
- Marketplace sales, payment/escrow, campaign investment, ownership/legal/finance, social/community/admin notification features, except for read-only links from generated app artifacts.

## Goal

Make the idea-to-build pipeline production-grade: real idea persistence, PRD generation and editing, design generation, build-plan/code generation, review workflows, development lifecycle tracking, deployment records, progress updates, and investor-visible build status.

## Tasks

- [ ] Confirm canonical table and API naming for ideas versus app ideas.
- [ ] Remove fallback behavior that silently writes to a different table unless explicitly documented and tested.
- [ ] Add ownership checks to idea create, read, update, delete, PRD generation, design generation, cost estimate, build plan, code generation, and review submission.
- [ ] Add idea status transition rules from draft to PRD ready, designs ready, estimated, ready for funding, campaign active, archived, or converted to app.
- [ ] Add server-side validation for idea title, description, category, platform, audience, and feature list.
- [ ] Add duplicate idea handling or user confirmation.
- [ ] Add robust empty and loading states for My Ideas and Idea Detail.
- [ ] Add delete/archive confirmation for ideas.
- [ ] Add idea-to-app conversion path or explicitly mark it as out of scope.
- [ ] Add idea-to-campaign handoff only after required PRD, estimate, and ownership checks are complete.
- [ ] Add PRD generation idempotency.
- [ ] Add PRD generation job state for queued, running, completed, failed, and cancelled.
- [ ] Add PRD version history display and restore flow.
- [ ] Add PRD autosave conflict handling.
- [ ] Add PRD graph validation with actionable messages.
- [ ] Add PRD node edit permissions and optimistic update rollback.
- [ ] Add AI expand, refine, and validate error states.
- [ ] Add PRD export if required by product.
- [ ] Add PRD mind map keyboard navigation and canvas accessibility alternatives.
- [ ] Add design generation requirements from PRD nodes.
- [ ] Add device type support for phone, tablet, and web designs.
- [ ] Add design generation idempotency by node and prompt version.
- [ ] Add real-time design progress persistence and recovery after refresh.
- [ ] Add generated design gallery with filters by device, status, and PRD node.
- [ ] Add design regenerate flow with preserved version history.
- [ ] Add generated design quality review state.
- [ ] Add design lightbox download/open/share actions if supported.
- [ ] Add AI design assistant messages backed by real job state, not hardcoded-only guidance.
- [ ] Add build-plan generation from approved PRD/design artifacts.
- [ ] Add code scaffold generation from approved build plan.
- [ ] Add quality report display for lint, typecheck, tests, security, and accessibility.
- [ ] Add review submission workflow for generated artifacts.
- [ ] Add retry and cancellation controls for generation jobs.
- [ ] Add cost tracking metadata for generation jobs.
- [ ] Add model/provider metadata for generation jobs.
- [ ] Add prompt versioning to generated artifacts.
- [ ] Add generated artifact version history.
- [ ] Add artifact diff or at least version comparison metadata.
- [ ] Add development phase initialization from generated build plan.
- [ ] Add phase start, complete, skip, and block flows.
- [ ] Add milestone create, edit, complete, approve, reject, and reorder flows.
- [ ] Add task create, assign, update, complete, and block flows.
- [ ] Add progress update posting with owner-only, investors, and public visibility rules.
- [ ] Add attachments to progress updates if required.
- [ ] Add investor notification creation for investor-visible progress updates.
- [ ] Add deployment record creation with platform, version, build number, URLs, and status.
- [ ] Add deployment status transition rules for preparing, submitted, in review, approved, rejected, and live.
- [ ] Add deployment rejection reason capture.
- [ ] Add build/lifecycle audit log entries.
- [ ] Add unit tests for idea status transitions and PRD node operations.
- [ ] Add integration tests for PRD generation, design generation, artifact generation, and lifecycle APIs.
- [ ] Add end-to-end tests for create idea, generate PRD, edit mind map, generate design, create build plan, generate code, submit review, and track a phase.
- [ ] Add responsive QA for idea creation, My Ideas, Idea Detail, PRD Mind Map, Design Studio, Phase Detail, and Create Deployment.
- [ ] Add accessibility checks for mind map controls, canvas controls, generation progress, design cards, modals, and lifecycle task forms.

## Production Acceptance Criteria

- [ ] Every idea, PRD, design, generated artifact, lifecycle phase, milestone, task, deployment, and progress update is persisted and permission-checked.
- [ ] Generation jobs can recover from page refresh and show honest queued/running/failed/completed states.
- [ ] Generated artifacts keep version, provider, prompt, quality, and review metadata.
- [ ] Investors only see progress updates intended for them.
- [ ] No critical idea-to-build workflow depends on hardcoded demo states.
- [ ] Idea-to-build flows pass API, job-state, UI, and end-to-end tests.

