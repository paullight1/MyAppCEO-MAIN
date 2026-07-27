CREATE TABLE IF NOT EXISTS app_coowners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'co_founder',
  equity_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  vesting_start TIMESTAMP,
  cliff_date TIMESTAMP,
  vesting_months INTEGER NOT NULL DEFAULT 48,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP NOT NULL DEFAULT now(),
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  ip_assigned BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_app_coowners_app ON app_coowners(app_id);
CREATE INDEX IF NOT EXISTS idx_app_coowners_user ON app_coowners(user_id);
CREATE INDEX IF NOT EXISTS idx_app_coowners_email ON app_coowners(email);
