# Funding, Ownership, Finance, And Legal

## Parallel Ownership Boundary

Owned areas:
- `src/hooks/useCrowdfundingSupabase.ts`
- `src/hooks/useCampaigns.ts`
- `src/hooks/useCapTable.ts`
- `src/hooks/useEquitySplit.ts`
- `src/hooks/useShareholderSystem.ts`
- `src/hooks/useLegalEntity.ts`
- `src/hooks/useLegalLicenses.ts`
- `src/hooks/useFinances.ts`
- `src/components/CapTableChart.tsx`
- `src/components/CapTableList.tsx`
- `src/components/CreateShareholderOffer.tsx`
- `src/components/DilutionCalculator.tsx`
- `src/components/EquitySplitCard.tsx`
- `src/components/LegalEntityWizard.tsx`
- `src/components/ShareholderApplicationForm.tsx`
- `src/components/VestingProgress.tsx`
- `src/pages/BrowseCampaignsPage.tsx`
- `src/pages/CreateCampaignPage.tsx`
- `src/pages/CampaignDetailPage.tsx`
- `src/pages/CampaignInvestPage.tsx`
- `src/pages/MyCampaignsPage.tsx`
- `src/pages/MyInvestmentsPage.tsx`
- `src/pages/InvestorPortfolioPage.tsx`
- `src/pages/CapTablePage.tsx`
- `src/pages/EquitySplitPage.tsx`
- `src/pages/TeamPage.tsx`
- `src/pages/LegalPage.tsx`
- `src/pages/FinancesPage.tsx`
- Funding and ownership tables: `crowdfunding_campaigns`, `investment_commitments`, `campaign_updates`, `campaign_share_links`, `app_coowners`, `equity_splits`, `share_classes`, `cap_table_entries`, `option_pool`, `legal_entities`, `founder_agreements`, `app_shareholder_offers`, `app_shareholder_requests`, `app_documents`, `license_types`, `user_license_applications`, `application_documents`, `admin_license_fees`

Avoid editing:
- Listing sales/escrow implementation, social growth, community, PRD/generation, app onboarding, admin notification composition, and marketplace search internals.

## Goal

Make investment campaigns, ownership records, legal setup, cap tables, equity workflows, and finance dashboards accurate, persisted, auditable, and ready for real users.

## Tasks

- [ ] Define the production relationship between campaigns, apps, listings, ideas, and investors.
- [ ] Ensure campaign creation can link to an owned app without permitting cross-user app funding.
- [ ] Ensure campaign creation can link to an idea only if the user owns the idea.
- [ ] Add campaign status rules for draft, pending review, active, funded, cancelled, expired, and rejected.
- [ ] Add server-side validation for funding goal, minimum investment, maximum investment, valuation, equity offered, max investors, start date, and end date.
- [ ] Add campaign publish checks for legal readiness, payout readiness, ownership readiness, and required disclosures.
- [ ] Persist campaign watchlists server-side instead of localStorage-only.
- [ ] Add migration for existing campaign watchlist localStorage data after login.
- [ ] Add campaign filtering by category, funding type, status, valuation, min investment, and ending soon.
- [ ] Add public campaign cards using real campaign data only.
- [ ] Add campaign detail investor list visibility rules.
- [ ] Add private owner analytics for campaign views, shares, and conversion.
- [ ] Add campaign updates with public/private visibility enforcement.
- [ ] Add campaign cancellation reason capture.
- [ ] Add campaign share links with expiration and max-use enforcement.
- [ ] Add investment commitment idempotency.
- [ ] Add payment provider confirmation handling for investment commitments.
- [ ] Ensure confirmed investment updates campaign totals transactionally.
- [ ] Ensure confirmed investment creates or updates shareholder/co-owner ownership records transactionally.
- [ ] Ensure confirmed investment creates or updates cap table entries transactionally.
- [ ] Add prevention for overfunding, over-allocation of equity, and max investor count breaches.
- [ ] Add refund or failed payment handling for commitments.
- [ ] Add investor portfolio from real commitments and shareholder records.
- [ ] Add investment history, current stake, invested amount, valuation at commitment, and dividends if available.
- [ ] Add cap table row-level permissions for owners, co-founders, shareholders, and admins.
- [ ] Add cap table entry validation for shares, price per share, equity percent, and owner type.
- [ ] Add share class creation validation.
- [ ] Add option pool update validation and audit trail.
- [ ] Add dilution calculator tests for common financing scenarios.
- [ ] Add equity split proposal permissions.
- [ ] Add equity split accept, decline, counter, expiry, and audit events.
- [ ] Add vesting schedule calculations with cliff and monthly vesting.
- [ ] Add co-founder invite acceptance path that writes membership, ownership, and audit records consistently.
- [ ] Reconcile `app_coowners`, `app_members`, and `cap_table_entries` into a consistent ownership model.
- [ ] Add shareholder request workflow for prospective investors.
- [ ] Add shareholder offer workflow for owner-issued offers.
- [ ] Add approval and rejection paths for shareholder applications.
- [ ] Add app document persistence with visibility enforcement.
- [ ] Add upload validation for app legal/financial/shareholder documents.
- [ ] Replace `LicenseApplicationModal` localStorage persistence with Supabase/backend persistence.
- [ ] Add legal entity creation and update permissions.
- [ ] Add legal entity status and document requirements.
- [ ] Add license application draft, submit, review, approval, rejection, expiration, and resubmission states.
- [ ] Add country/category filtering for licenses.
- [ ] Add document upload checks for application requirements.
- [ ] Add admin fee calculation data reads without building admin fee management UI in this workstream.
- [ ] Add finance dashboard from real transactions, investments, stakes, revenue, expenses, and payout records.
- [ ] Replace any finance mock data with empty states or real provider data.
- [ ] Add date range filters for finance dashboard.
- [ ] Add currency formatting and multi-currency groundwork.
- [ ] Add export-ready finance summaries if product requires it.
- [ ] Add audit logs for campaign publish, investment confirmation, ownership changes, legal entity changes, license application changes, and finance data sync.
- [ ] Add unit tests for stake calculation, dilution calculation, vesting, and campaign validation.
- [ ] Add integration tests for investment confirmation and cap table updates.
- [ ] Add end-to-end tests for campaign creation, investing, portfolio view, equity invite, legal application, and finance dashboard.
- [ ] Add responsive QA for campaign, portfolio, cap table, team, legal, equity, and finance pages.
- [ ] Add accessibility checks for investment forms, tables, charts, legal forms, and document uploads.

## Production Acceptance Criteria

- [ ] Campaign funding cannot over-raise or over-allocate equity.
- [ ] Every confirmed investment is reflected in commitments, campaign totals, ownership records, and cap table records.
- [ ] Legal applications and documents persist outside localStorage.
- [ ] Cap table, equity split, legal, and finance views respect user roles.
- [ ] Finance dashboards show real data or honest empty states only.
- [ ] Funding and ownership flows pass transactional, permission, UI, and end-to-end tests.

