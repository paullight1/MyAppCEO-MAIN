-- MyAppCEO canonical app workspace model.
-- Extracted from supabase-complete-schema.sql SECTION 15B and hardened for
-- repeatable Supabase application with RLS-enabled Data API access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
REVOKE ALL ON SCHEMA app_private FROM anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.imported_store_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(30) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  external_app_id VARCHAR(255),
  bundle_id VARCHAR(255),
  package_name VARCHAR(255),
  store_url TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  developer VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  icon_url TEXT,
  artwork_url TEXT,
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating DECIMAL(3, 2),
  rating_count INTEGER,
  price_text VARCHAR(100),
  version VARCHAR(100),
  release_date DATE,
  store_updated_at TIMESTAMP WITH TIME ZONE,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT imported_store_apps_platform_check CHECK (platform IN ('ios', 'android')),
  CONSTRAINT imported_store_apps_provider_check CHECK (provider IN ('apple_app_store', 'google_play')),
  UNIQUE (owner_id, provider, external_app_id),
  UNIQUE (owner_id, store_url)
);

CREATE TABLE IF NOT EXISTS public.imported_store_app_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_store_app_id UUID NOT NULL REFERENCES public.imported_store_apps(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_version INTEGER NOT NULL,
  platform VARCHAR(30) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  external_app_id VARCHAR(255),
  store_url TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  developer VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  short_description TEXT,
  icon_url TEXT,
  artwork_url TEXT,
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating DECIMAL(3, 2),
  rating_count INTEGER,
  price_text VARCHAR(100),
  bundle_id VARCHAR(255),
  package_name VARCHAR(255),
  release_date DATE,
  store_updated_at TIMESTAMP WITH TIME ZONE,
  country VARCHAR(16),
  locale VARCHAR(32),
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_checksum TEXT,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT imported_store_app_snapshots_platform_check CHECK (platform IN ('ios', 'android')),
  CONSTRAINT imported_store_app_snapshots_provider_check CHECK (provider IN ('apple_app_store', 'google_play')),
  UNIQUE (imported_store_app_id, snapshot_version)
);

CREATE TABLE IF NOT EXISTS public.app_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  category VARCHAR(100),
  description TEXT,
  icon_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  source_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  listing_id UUID UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
  source_idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
  imported_store_app_id UUID REFERENCES public.imported_store_apps(id) ON DELETE SET NULL,
  setup_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT app_workspaces_status_check CHECK (status IN ('draft', 'setup', 'active', 'paused', 'archived', 'deleted')),
  CONSTRAINT app_workspaces_source_type_check CHECK (source_type IN ('manual', 'store_import', 'idea_generated', 'marketplace_listing'))
);

CREATE TABLE IF NOT EXISTS public.app_workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.app_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'shareholder',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT app_workspace_members_role_check CHECK (role IN ('owner', 'cofounder', 'shareholder', 'prospective', 'admin', 'support')),
  CONSTRAINT app_workspace_members_status_check CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.app_workspace_setup (
  workspace_id UUID PRIMARY KEY REFERENCES public.app_workspaces(id) ON DELETE CASCADE,
  profile_completed_at TIMESTAMP WITH TIME ZONE,
  import_completed_at TIMESTAMP WITH TIME ZONE,
  listing_connected_at TIMESTAMP WITH TIME ZONE,
  idea_connected_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_workspace_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash TEXT,
  workspace_id UUID REFERENCES public.app_workspaces(id) ON DELETE SET NULL,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT app_workspace_idempotency_status_check CHECK (status IN ('started', 'succeeded', 'failed')),
  UNIQUE (user_id, operation, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.app_workspace_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.app_workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  subject_type VARCHAR(80),
  subject_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imported_store_apps_owner ON public.imported_store_apps(owner_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_apps_provider_external ON public.imported_store_apps(provider, external_app_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_apps_bundle ON public.imported_store_apps(bundle_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_apps_package ON public.imported_store_apps(package_name);
CREATE INDEX IF NOT EXISTS idx_imported_store_app_snapshots_owner ON public.imported_store_app_snapshots(owner_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_app_snapshots_imported_app ON public.imported_store_app_snapshots(imported_store_app_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_app_snapshots_provider_external ON public.imported_store_app_snapshots(provider, external_app_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_app_snapshots_checksum ON public.imported_store_app_snapshots(source_checksum);
CREATE INDEX IF NOT EXISTS idx_imported_store_app_snapshots_captured_at ON public.imported_store_app_snapshots(captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_workspaces_owner ON public.app_workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_status ON public.app_workspaces(status);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_listing ON public.app_workspaces(listing_id);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_source_idea ON public.app_workspaces(source_idea_id);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_imported_store_app ON public.app_workspaces(imported_store_app_id);

CREATE INDEX IF NOT EXISTS idx_app_workspace_members_workspace ON public.app_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_user ON public.app_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_role ON public.app_workspace_members(role);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_status ON public.app_workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_active_lookup
  ON public.app_workspace_members(workspace_id, user_id, role)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_app_workspace_idempotency_user_operation ON public.app_workspace_idempotency_keys(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_app_workspace_idempotency_workspace ON public.app_workspace_idempotency_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_idempotency_expires ON public.app_workspace_idempotency_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_workspace ON public.app_workspace_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_actor ON public.app_workspace_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_action ON public.app_workspace_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_created ON public.app_workspace_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION app_private.is_platform_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'support')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- These helpers are SECURITY DEFINER because RLS policies would otherwise
-- recurse on app_workspace_members. They live outside public and only return
-- booleans derived from persisted profile/member rows, never user metadata.
CREATE OR REPLACE FUNCTION app_private.is_app_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(target_workspace_id IS NOT NULL, FALSE)
    AND (
      EXISTS (
        SELECT 1
        FROM public.app_workspace_members
        WHERE workspace_id = target_workspace_id
          AND user_id = auth.uid()
          AND status = 'active'
      )
      OR app_private.is_platform_staff()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION app_private.can_manage_app_workspace(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(target_workspace_id IS NOT NULL, FALSE)
    AND (
      EXISTS (
        SELECT 1
        FROM public.app_workspace_members
        WHERE workspace_id = target_workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'cofounder', 'admin')
          AND status = 'active'
      )
      OR app_private.is_platform_staff()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION app_private.is_platform_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_platform_staff() FROM anon;
GRANT EXECUTE ON FUNCTION app_private.is_platform_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_platform_staff() TO service_role;

REVOKE ALL ON FUNCTION app_private.is_app_workspace_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_app_workspace_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION app_private.is_app_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_app_workspace_member(UUID) TO service_role;

REVOKE ALL ON FUNCTION app_private.can_manage_app_workspace(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.can_manage_app_workspace(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION app_private.can_manage_app_workspace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_manage_app_workspace(UUID) TO service_role;

ALTER TABLE public.app_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_store_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_store_app_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_workspace_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_workspace_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_workspace_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view workspaces" ON public.app_workspaces;
CREATE POLICY "Workspace members can view workspaces"
  ON public.app_workspaces FOR SELECT
  TO authenticated
  USING (app_private.is_app_workspace_member(id));

DROP POLICY IF EXISTS "Users can create owned workspaces" ON public.app_workspaces;
CREATE POLICY "Users can create owned workspaces"
  ON public.app_workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Workspace managers can update workspaces" ON public.app_workspaces;
CREATE POLICY "Workspace managers can update workspaces"
  ON public.app_workspaces FOR UPDATE
  TO authenticated
  USING (app_private.can_manage_app_workspace(id))
  WITH CHECK (app_private.can_manage_app_workspace(id));

DROP POLICY IF EXISTS "Workspace owners can archive workspaces" ON public.app_workspaces;
CREATE POLICY "Workspace owners can archive workspaces"
  ON public.app_workspaces FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.app_workspace_members
      WHERE workspace_id = app_workspaces.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND status = 'active'
    )
    OR app_private.is_platform_staff()
  );

DROP POLICY IF EXISTS "Users can manage their imported store apps" ON public.imported_store_apps;
CREATE POLICY "Users can manage their imported store apps"
  ON public.imported_store_apps FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id OR app_private.is_platform_staff())
  WITH CHECK (auth.uid() = owner_id OR app_private.is_platform_staff());

DROP POLICY IF EXISTS "Users can manage their imported store app snapshots" ON public.imported_store_app_snapshots;
CREATE POLICY "Users can manage their imported store app snapshots"
  ON public.imported_store_app_snapshots FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id OR app_private.is_platform_staff())
  WITH CHECK (auth.uid() = owner_id OR app_private.is_platform_staff());

DROP POLICY IF EXISTS "Workspace members can view membership" ON public.app_workspace_members;
CREATE POLICY "Workspace members can view membership"
  ON public.app_workspace_members FOR SELECT
  TO authenticated
  USING (app_private.is_app_workspace_member(workspace_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Workspace managers can insert members" ON public.app_workspace_members;
CREATE POLICY "Workspace managers can insert members"
  ON public.app_workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (app_private.can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can update members" ON public.app_workspace_members;
CREATE POLICY "Workspace managers can update members"
  ON public.app_workspace_members FOR UPDATE
  TO authenticated
  USING (app_private.can_manage_app_workspace(workspace_id))
  WITH CHECK (app_private.can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can remove members" ON public.app_workspace_members;
CREATE POLICY "Workspace managers can remove members"
  ON public.app_workspace_members FOR DELETE
  TO authenticated
  USING (app_private.can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Workspace members can view setup" ON public.app_workspace_setup;
CREATE POLICY "Workspace members can view setup"
  ON public.app_workspace_setup FOR SELECT
  TO authenticated
  USING (app_private.is_app_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can manage setup" ON public.app_workspace_setup;
CREATE POLICY "Workspace managers can manage setup"
  ON public.app_workspace_setup FOR ALL
  TO authenticated
  USING (app_private.can_manage_app_workspace(workspace_id))
  WITH CHECK (app_private.can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Users can manage their idempotency keys" ON public.app_workspace_idempotency_keys;
CREATE POLICY "Users can manage their idempotency keys"
  ON public.app_workspace_idempotency_keys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR app_private.is_platform_staff())
  WITH CHECK (auth.uid() = user_id OR app_private.is_platform_staff());

DROP POLICY IF EXISTS "Workspace members can view workspace audit log" ON public.app_workspace_audit_log;
CREATE POLICY "Workspace members can view workspace audit log"
  ON public.app_workspace_audit_log FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND app_private.is_app_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Workspace managers can insert workspace audit log" ON public.app_workspace_audit_log;
CREATE POLICY "Workspace managers can insert workspace audit log"
  ON public.app_workspace_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    app_private.can_manage_app_workspace(workspace_id)
    OR app_private.is_platform_staff()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_store_apps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_store_app_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_workspace_setup TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_workspace_idempotency_keys TO authenticated;
GRANT SELECT, INSERT ON public.app_workspace_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION app_private.create_workspace_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_workspace_members (workspace_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW())
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner',
      status = 'active',
      removed_at = NULL,
      updated_at = NOW();

  INSERT INTO public.app_workspace_setup (workspace_id, updated_by)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
  VALUES (
    NEW.id,
    NEW.created_by,
    'workspace_created',
    'app_workspace',
    NEW.id,
    jsonb_build_object('source_type', NEW.source_type, 'listing_id', NEW.listing_id, 'source_idea_id', NEW.source_idea_id)
  );

  IF NEW.imported_store_app_id IS NOT NULL THEN
    INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
    VALUES (
      NEW.id,
      NEW.created_by,
      'app_imported',
      'imported_store_app',
      NEW.imported_store_app_id,
      jsonb_build_object('source_type', NEW.source_type)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION app_private.log_workspace_member_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
    VALUES (NEW.workspace_id, COALESCE(NEW.invited_by, auth.uid(), NEW.user_id), 'member_added', 'app_workspace_member', NEW.id, jsonb_build_object('role', NEW.role, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
      VALUES (NEW.workspace_id, auth.uid(), 'role_changed', 'app_workspace_member', NEW.id, jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
      VALUES (NEW.workspace_id, auth.uid(), 'member_status_changed', 'app_workspace_member', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
    VALUES (OLD.workspace_id, auth.uid(), 'member_removed', 'app_workspace_member', OLD.id, jsonb_build_object('role', OLD.role, 'status', OLD.status));
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION app_private.log_workspace_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.onboarding_completed_at IS NULL AND NEW.onboarding_completed_at IS NOT NULL THEN
    INSERT INTO public.app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
    VALUES (NEW.id, auth.uid(), 'onboarding_completed', 'app_workspace', NEW.id, jsonb_build_object('completed_at', NEW.onboarding_completed_at));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION app_private.update_app_workspace_setup_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION app_private.create_workspace_owner_membership() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.log_workspace_member_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.log_workspace_onboarding_completion() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.update_app_workspace_setup_timestamp() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_create_workspace_owner_membership ON public.app_workspaces;
CREATE TRIGGER trigger_create_workspace_owner_membership
  AFTER INSERT ON public.app_workspaces
  FOR EACH ROW EXECUTE FUNCTION app_private.create_workspace_owner_membership();

DROP TRIGGER IF EXISTS trigger_log_workspace_member_change ON public.app_workspace_members;
CREATE TRIGGER trigger_log_workspace_member_change
  AFTER INSERT OR UPDATE OR DELETE ON public.app_workspace_members
  FOR EACH ROW EXECUTE FUNCTION app_private.log_workspace_member_change();

DROP TRIGGER IF EXISTS trigger_log_workspace_onboarding_completion ON public.app_workspaces;
CREATE TRIGGER trigger_log_workspace_onboarding_completion
  AFTER UPDATE OF onboarding_completed_at ON public.app_workspaces
  FOR EACH ROW EXECUTE FUNCTION app_private.log_workspace_onboarding_completion();

DROP TRIGGER IF EXISTS trigger_app_workspaces_updated_at ON public.app_workspaces;
CREATE TRIGGER trigger_app_workspaces_updated_at
  BEFORE UPDATE ON public.app_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_imported_store_apps_updated_at ON public.imported_store_apps;
CREATE TRIGGER trigger_imported_store_apps_updated_at
  BEFORE UPDATE ON public.imported_store_apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_app_workspace_members_updated_at ON public.app_workspace_members;
CREATE TRIGGER trigger_app_workspace_members_updated_at
  BEFORE UPDATE ON public.app_workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_app_workspace_setup_updated_at ON public.app_workspace_setup;
CREATE TRIGGER trigger_app_workspace_setup_updated_at
  BEFORE UPDATE ON public.app_workspace_setup
  FOR EACH ROW EXECUTE FUNCTION app_private.update_app_workspace_setup_timestamp();

DROP TRIGGER IF EXISTS trigger_app_workspace_idempotency_updated_at ON public.app_workspace_idempotency_keys;
CREATE TRIGGER trigger_app_workspace_idempotency_updated_at
  BEFORE UPDATE ON public.app_workspace_idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP FUNCTION IF EXISTS public.is_platform_staff();
DROP FUNCTION IF EXISTS public.is_app_workspace_member(UUID);
DROP FUNCTION IF EXISTS public.can_manage_app_workspace(UUID);
DROP FUNCTION IF EXISTS public.create_workspace_owner_membership();
DROP FUNCTION IF EXISTS public.log_workspace_member_change();
DROP FUNCTION IF EXISTS public.log_workspace_onboarding_completion();
DROP FUNCTION IF EXISTS public.update_app_workspace_setup_timestamp();

DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'app_workspaces',
      'app_workspace_members',
      'app_workspace_setup',
      'app_workspace_audit_log'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
