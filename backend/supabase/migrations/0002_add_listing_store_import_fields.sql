ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS screenshots TEXT[],
  ADD COLUMN IF NOT EXISTS demo_video_url TEXT,
  ADD COLUMN IF NOT EXISTS tech_stack TEXT[],
  ADD COLUMN IF NOT EXISTS repository_url TEXT,
  ADD COLUMN IF NOT EXISTS documentation_url TEXT,
  ADD COLUMN IF NOT EXISTS app_store_url TEXT,
  ADD COLUMN IF NOT EXISTS play_store_url TEXT,
  ADD COLUMN IF NOT EXISTS store_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_users INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS age_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS traffic_metrics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unit_economics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS handover_readiness JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_listings_app_store_url ON listings(app_store_url);
CREATE INDEX IF NOT EXISTS idx_listings_play_store_url ON listings(play_store_url);
