ALTER TYPE idea_status ADD VALUE IF NOT EXISTS 'converted_to_app';
ALTER TYPE generation_job_type ADD VALUE IF NOT EXISTS 'design';
ALTER TYPE generated_artifact_type ADD VALUE IF NOT EXISTS 'design';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_ideas_title_length'
  ) THEN
    ALTER TABLE app_ideas
      ADD CONSTRAINT app_ideas_title_length CHECK (char_length(trim(title)) BETWEEN 3 AND 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_ideas_description_length'
  ) THEN
    ALTER TABLE app_ideas
      ADD CONSTRAINT app_ideas_description_length CHECK (char_length(trim(description)) BETWEEN 20 AND 5000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_ideas_timeline_positive'
  ) THEN
    ALTER TABLE app_ideas
      ADD CONSTRAINT app_ideas_timeline_positive CHECK (timeline_weeks IS NULL OR timeline_weeks > 0);
  END IF;
END $$;

ALTER TABLE generation_jobs
  ALTER COLUMN idempotency_key TYPE VARCHAR(180),
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50);

ALTER TABLE design_mockups
  ADD COLUMN IF NOT EXISTS node_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_design_mockups_node ON design_mockups(node_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_generation_jobs_owner_idempotency
  ON generation_jobs(owner_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS design_generation_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES app_ideas(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  error TEXT,
  prompt_version VARCHAR(80) NOT NULL DEFAULT 'design-prompt-v1',
  provider VARCHAR(50),
  model VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT design_generation_progress_status CHECK (status IN ('queued', 'pending', 'running', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT design_generation_progress_bounds CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_design_progress_idea ON design_generation_progress(idea_id);
CREATE INDEX IF NOT EXISTS idx_design_progress_owner ON design_generation_progress(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_design_progress_idea_node_prompt
  ON design_generation_progress(idea_id, node_id, prompt_version);

ALTER TABLE design_generation_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON design_generation_progress TO authenticated;

DROP POLICY IF EXISTS "Owners manage design progress" ON design_generation_progress;
CREATE POLICY "Owners manage design progress" ON design_generation_progress
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = owner_id);
