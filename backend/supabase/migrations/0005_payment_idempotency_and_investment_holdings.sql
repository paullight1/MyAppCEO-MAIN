ALTER TABLE "investment_commitments"
  ADD COLUMN IF NOT EXISTS "payment_provider" varchar(50),
  ADD COLUMN IF NOT EXISTS "payment_reference" varchar(255),
  ADD COLUMN IF NOT EXISTS "provider_transaction_id" varchar(255),
  ADD COLUMN IF NOT EXISTS "payment_currency" varchar(10),
  ADD COLUMN IF NOT EXISTS "payment_verified_at" timestamp,
  ADD COLUMN IF NOT EXISTS "payment_finalized_at" timestamp,
  ADD COLUMN IF NOT EXISTS "payment_metadata" jsonb DEFAULT '{}'::jsonb;

UPDATE "investment_commitments"
SET
  "payment_provider" = COALESCE("payment_provider", CASE
    WHEN "stripe_payment_intent_id" LIKE 'MCEO-%' THEN 'paystack'
    WHEN "stripe_payment_intent_id" LIKE 'simulated_%' THEN 'simulated'
    WHEN "stripe_payment_intent_id" IS NOT NULL THEN 'stripe'
    ELSE NULL
  END),
  "payment_reference" = COALESCE("payment_reference", "stripe_payment_intent_id"),
  "provider_transaction_id" = COALESCE("provider_transaction_id", "stripe_charge_id"),
  "payment_currency" = COALESCE("payment_currency", CASE
    WHEN "stripe_payment_intent_id" IS NOT NULL THEN 'NGN'
    ELSE NULL
  END),
  "payment_finalized_at" = COALESCE("payment_finalized_at", "paid_at")
WHERE "payment_reference" IS NULL
  AND "stripe_payment_intent_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_commitments_payment_reference"
  ON "investment_commitments" ("payment_provider", "payment_reference")
  WHERE "payment_reference" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_app_coowners_app_user"
  ON "app_coowners" ("app_id", "user_id")
  WHERE "user_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "app_investment_holdings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL REFERENCES "apps"("id") ON DELETE cascade,
  "campaign_id" uuid NOT NULL REFERENCES "crowdfunding_campaigns"("id") ON DELETE cascade,
  "commitment_id" uuid NOT NULL REFERENCES "investment_commitments"("id") ON DELETE cascade,
  "investor_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "amount" numeric(14, 2) NOT NULL,
  "stake_pct" numeric(5, 4) NOT NULL,
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "acquired_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_app_investment_holdings_commitment"
  ON "app_investment_holdings" ("commitment_id");

CREATE INDEX IF NOT EXISTS "idx_app_investment_holdings_app"
  ON "app_investment_holdings" ("app_id");

CREATE INDEX IF NOT EXISTS "idx_app_investment_holdings_investor"
  ON "app_investment_holdings" ("investor_id");
