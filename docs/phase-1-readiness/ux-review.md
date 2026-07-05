# UX Review: Phase 1 First-Run Experience

UX readiness: **62 / 100**

The dashboard has moved in the right direction: users can see Add My App, Start New Idea, Browse Campaigns, workspace links, and app summaries. The main UX problem is not visual polish. It is trust and continuity: users can complete actions that do not create lasting records, and core concepts are split across overlapping routes.

## Recommended first-run path

1. **Welcome**
   - One primary action: Add Existing App.
   - Secondary action: Start New Idea.
   - Investor action: Browse Campaigns.

2. **Add Existing App**
   - Import from App Store / Google Play / website / repository.
   - Show imported metadata preview.
   - Ask for ownership confirmation.
   - Submit to real backend.

3. **App Created**
   - Navigate to `/apps/:id/dashboard`.
   - Show a compact setup checklist:
     - Add co-founder
     - Complete legal setup
     - Add cap table
     - Connect store analytics
     - Raise funding

4. **Invite Co-founder**
   - User enters email, role, equity proposal, vesting note.
   - Invite remains pending until accepted.
   - Accepted invite creates membership and optionally a cap-table entry.

5. **Find Investors / Raise Funding**
   - Owner creates a campaign from the app dashboard.
   - Campaign inherits app details and owner/cap-table context.
   - Investor views campaign and commits.

## Information architecture changes

- Make `/apps` the canonical workspace.
- Add `/apps/new` or a route-backed modal state for Add My App.
- Use `/apps/:id/dashboard`, `/apps/:id/team`, `/apps/:id/cap-table`, `/apps/:id/legal`, `/apps/:id/equity` for owner workflows.
- Use `/listings/:id` for public marketplace listings.
- Remove or de-emphasize `/app/:id` if it mixes public and private behavior.
- Hide admin routes from non-admin users.

## Dashboard improvements

- Keep three role-aware primary actions:
  - Founder with no app: Add Existing App, Start New Idea, Browse Campaigns.
  - Founder with app: Open App, Invite Co-founder, Raise Funding.
  - Investor: Browse Campaigns, Portfolio, Watchlist.

- Add a "My apps" strip with the user's real apps and a subtle Add App button.
- Add "Continue setup" only when there is an incomplete app checklist.
- Keep legal, finances, promote, analytics, connections, and documentation as secondary quick links.

## Copy and state improvements

- Replace "App profile added" with a database-backed success message only after persistence succeeds.
- If store import is partial, say exactly what was imported and what still needs review.
- Use empty states instead of mock data for new users.
- Make error states actionable: "Backend API unavailable", "No permission for notifications", "Google Play provider not configured".

## UX acceptance criteria

- A new founder can add an app and land on its dashboard in under 2 minutes.
- A new founder can invite a co-founder from the app dashboard in under 30 seconds.
- A new founder can find the raise-funding action from dashboard or app dashboard in under 5 seconds.
- A new investor can find campaigns and portfolio in under 5 seconds.
- No user-facing success state appears before data is saved.
- No user-facing dashboard card displays hardcoded demo business data for an empty account.

