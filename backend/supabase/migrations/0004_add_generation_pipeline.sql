DO $$ BEGIN
  CREATE TYPE generation_job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE generation_job_type AS ENUM ('prd', 'build_plan', 'code', 'screen_spec', 'quality_report', 'deployment_package');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE generated_artifact_type AS ENUM ('prd', 'build_plan', 'screen_spec', 'code_scaffold', 'patch', 'quality_report', 'deployment_package');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_submission_status AS ENUM ('draft', 'pending_review', 'under_review', 'approved', 'changes_requested', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  job_type generation_job_type NOT NULL,
  status generation_job_status NOT NULL DEFAULT 'queued',
  idempotency_key VARCHAR(120),
  model VARCHAR(100),
  prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cost_units INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
  artifact_type generated_artifact_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repo_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'github',
  repo_url TEXT NOT NULL,
  branch VARCHAR(255),
  commit_sha VARCHAR(80),
  pull_request_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES generated_artifacts(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  lint_status VARCHAR(40) NOT NULL DEFAULT 'not_run',
  typecheck_status VARCHAR(40) NOT NULL DEFAULT 'not_run',
  test_status VARCHAR(40) NOT NULL DEFAULT 'not_run',
  security_status VARCHAR(40) NOT NULL DEFAULT 'not_run',
  accessibility_status VARCHAR(40) NOT NULL DEFAULT 'not_run',
  summary TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  artifact_id UUID REFERENCES generated_artifacts(id) ON DELETE SET NULL,
  quality_report_id UUID REFERENCES quality_reports(id) ON DELETE SET NULL,
  item_type VARCHAR(60) NOT NULL DEFAULT 'generated_code',
  status review_submission_status NOT NULL DEFAULT 'pending_review',
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_owner ON generation_jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_idea ON generation_jobs(idea_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_type ON generation_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_owner ON generated_artifacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_idea ON generated_artifacts(idea_id);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_job ON generated_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_type ON generated_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_repo_links_owner ON repo_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_repo_links_idea ON repo_links(idea_id);
CREATE INDEX IF NOT EXISTS idx_repo_links_app ON repo_links(app_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_owner ON quality_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_idea ON quality_reports(idea_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_artifact ON quality_reports(artifact_id);
CREATE INDEX IF NOT EXISTS idx_review_submissions_owner ON review_submissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_review_submissions_idea ON review_submissions(idea_id);
CREATE INDEX IF NOT EXISTS idx_review_submissions_status ON review_submissions(status);
CREATE INDEX IF NOT EXISTS idx_review_submissions_type ON review_submissions(item_type);

ALTER TABLE app_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_mockups ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON app_ideas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON design_mockups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prd_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON generation_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON generated_artifacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON repo_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quality_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON review_submissions TO authenticated;

DROP POLICY IF EXISTS "Owners manage app ideas" ON app_ideas;
CREATE POLICY "Owners manage app ideas" ON app_ideas
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners manage design mockups" ON design_mockups;
CREATE POLICY "Owners manage design mockups" ON design_mockups
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_ideas WHERE app_ideas.id = design_mockups.idea_id AND app_ideas.owner_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM app_ideas WHERE app_ideas.id = design_mockups.idea_id AND app_ideas.owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "Owners manage prd versions" ON prd_versions;
CREATE POLICY "Owners manage prd versions" ON prd_versions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_ideas WHERE app_ideas.id = prd_versions.idea_id AND app_ideas.owner_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM app_ideas WHERE app_ideas.id = prd_versions.idea_id AND app_ideas.owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "Owners manage generation jobs" ON generation_jobs;
CREATE POLICY "Owners manage generation jobs" ON generation_jobs
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners manage generated artifacts" ON generated_artifacts;
CREATE POLICY "Owners manage generated artifacts" ON generated_artifacts
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners manage repo links" ON repo_links;
CREATE POLICY "Owners manage repo links" ON repo_links
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners manage quality reports" ON quality_reports;
CREATE POLICY "Owners manage quality reports" ON quality_reports
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners manage review submissions" ON review_submissions;
CREATE POLICY "Owners manage review submissions" ON review_submissions
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);
