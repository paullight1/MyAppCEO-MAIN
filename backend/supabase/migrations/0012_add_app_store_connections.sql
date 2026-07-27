-- App Store Connect integration: one API key per app.
-- The private key (.p8 PKCS#8 PEM) is stored encrypted at rest via
-- TokenCryptoService (AES-256-GCM) and never returned to clients. Auth uses the
-- App Store Connect API (ES256 JWT), not OAuth. Mirrors the frontend
-- useAppStoreConnect / app-store NestJS module.

CREATE TABLE IF NOT EXISTS public.app_store_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  issuer_id varchar(255) NOT NULL,
  key_id varchar(20) NOT NULL,
  -- AES-256-GCM ciphertext of the .p8 PEM (see TokenCryptoService).
  private_key text NOT NULL,
  vendor_number varchar(50),
  team_name varchar(255),
  -- 'connected' | 'invalid' | 'expired'
  status varchar(20) NOT NULL DEFAULT 'connected',
  app_count integer,
  last_synced_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- At most one App Store Connect key per app.
CREATE UNIQUE INDEX IF NOT EXISTS ux_app_store_connections_app_id
  ON public.app_store_connections(app_id);
