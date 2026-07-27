-- ═══════════════════════════════════════════════════════════════
-- Fix: notifications 401 (permission denied / 42501) and
--      user_profiles.notification_preferences 400 (column missing)
--
-- Symptoms observed in the browser console:
--   GET /rest/v1/user_profiles?select=notification_preferences -> 400
--   GET /rest/v1/notifications?... -> 401 "permission denied for table notifications"
--
-- Root cause: the definitions in supabase-complete-schema.sql were never
-- applied to this project. `user_profiles` is missing the
-- `notification_preferences` column, and `notifications` was created without
-- table-level GRANTs to the `authenticated` role (42501 is a GRANT gap, not an
-- RLS denial). The app hook (useNotifications.ts) also relies on an
-- `archived_at` column that the original schema omitted.
--
-- This migration is fully idempotent — safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. user_profiles.notification_preferences (fixes the 400) ──────────────
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB
    DEFAULT '{"emailOffers": true, "emailUpdates": true, "emailReports": false, "pushOffers": true, "pushUpdates": false, "pushReports": true}'::jsonb;

-- ── 2. notifications table (create if it was never applied) ────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- archived_at is used by useNotifications.ts (.is('archived_at', null) + archive
-- action). Add it defensively in case an older notifications table exists.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- ── 3. Row Level Security ──────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Inserts are performed by the service_role (admin broadcasts), which bypasses
-- RLS, so no INSERT policy is granted to end users.

-- ── 4. Table GRANTs (THE actual fix for the 42501 / 401) ──────────────────
-- RLS policies are meaningless without the underlying table privilege. This is
-- what was missing: the `authenticated` role had no SELECT/UPDATE/DELETE grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
-- anon must NOT read other users' notifications; no grant to anon.

-- ── 5. Realtime (useNotifications subscribes to postgres_changes) ──────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;
