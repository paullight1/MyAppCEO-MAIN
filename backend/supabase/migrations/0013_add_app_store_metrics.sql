-- Daily App Store metrics snapshots, pulled from the App Store Connect API
-- (downloads/proceeds from SALES reports) and the public iTunes lookup
-- (ratings). One row per (our app, Apple app, day); re-syncs upsert the day.

CREATE TABLE IF NOT EXISTS public.app_store_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  apple_app_id varchar(64) NOT NULL,
  apple_app_name varchar(255),
  bundle_id varchar(255),
  metric_date date NOT NULL,
  downloads integer,
  proceeds_amount numeric(14,2),
  proceeds_currency varchar(10),
  rating_average numeric(3,2),
  rating_count integer,
  raw jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- One snapshot per Apple app per day (re-syncs upsert on this key).
CREATE UNIQUE INDEX IF NOT EXISTS ux_app_store_metrics_app_apple_date
  ON public.app_store_metrics(app_id, apple_app_id, metric_date);

CREATE INDEX IF NOT EXISTS idx_app_store_metrics_app
  ON public.app_store_metrics(app_id);
