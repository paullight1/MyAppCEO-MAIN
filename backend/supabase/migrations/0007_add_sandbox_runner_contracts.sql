ALTER TYPE generation_job_type ADD VALUE IF NOT EXISTS 'sandbox_run';

ALTER TYPE generated_artifact_type ADD VALUE IF NOT EXISTS 'sandbox_report';

ALTER TABLE quality_reports
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
