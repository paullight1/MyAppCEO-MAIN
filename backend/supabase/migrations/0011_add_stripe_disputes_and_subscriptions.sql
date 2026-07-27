-- Persist Stripe dispute and subscription webhook events.
-- Both tables are keyed by the Stripe object id so webhook handlers can upsert
-- idempotently (Stripe delivers events at least once and can reorder them).

CREATE TABLE IF NOT EXISTS public.stripe_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_dispute_id varchar(255) NOT NULL UNIQUE,
  stripe_charge_id varchar(255),
  stripe_payment_intent_id varchar(255),
  connected_account_id varchar(255),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  app_id uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  currency varchar(10) NOT NULL,
  reason varchar(100),
  status varchar(50) NOT NULL,
  evidence_due_by timestamp,
  raw_event jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_disputes_user ON public.stripe_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_app ON public.stripe_disputes(app_id);
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_account ON public.stripe_disputes(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_status ON public.stripe_disputes(status);

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id varchar(255) NOT NULL UNIQUE,
  stripe_customer_id varchar(255),
  connected_account_id varchar(255),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  app_id uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  status varchar(50) NOT NULL,
  price_id varchar(255),
  product_id varchar(255),
  currency varchar(10),
  unit_amount integer,
  interval varchar(20),
  interval_count integer DEFAULT 1,
  quantity integer DEFAULT 1,
  mrr_amount integer NOT NULL DEFAULT 0,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamp,
  current_period_end timestamp,
  canceled_at timestamp,
  raw_event jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user ON public.stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_app ON public.stripe_subscriptions(app_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_account ON public.stripe_subscriptions(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON public.stripe_subscriptions(status);
