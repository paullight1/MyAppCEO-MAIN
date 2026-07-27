ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50);

ALTER TYPE generation_job_type ADD VALUE IF NOT EXISTS 'screen_spec';
ALTER TYPE generated_artifact_type ADD VALUE IF NOT EXISTS 'screen_spec';
