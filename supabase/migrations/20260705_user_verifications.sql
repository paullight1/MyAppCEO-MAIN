-- Identity (KYC) verification submissions.
--
-- Users submit identity/business details for review; a reviewer (admin/support/
-- compliance) approves or rejects. The canonical trust flag continues to live on
-- `user_profiles.kyc_status` (read by useUserStatus) — this table is the audit
-- trail + submission surface, and a trigger keeps `user_profiles.kyc_status` /
-- `account_status` in sync with the latest decision.

CREATE TABLE IF NOT EXISTS public.user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References user_profiles (not auth.users) so PostgREST can embed the
  -- submitter for the admin review queue. user_profiles.id === auth.users.id.
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL DEFAULT 'individual',
  status TEXT NOT NULL DEFAULT 'pending',
  legal_name TEXT NOT NULL,
  date_of_birth DATE,
  country TEXT NOT NULL,
  address_line TEXT,
  city TEXT,
  postal_code TEXT,
  document_type TEXT,
  document_number TEXT,
  -- Path (not public URL) inside the private `kyc-documents` bucket.
  document_path TEXT,
  business_name TEXT,
  business_registration_number TEXT,
  reviewer_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT user_verifications_type_check
    CHECK (verification_type IN ('individual', 'business')),
  CONSTRAINT user_verifications_status_check
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_more_info')),
  CONSTRAINT user_verifications_document_type_check
    CHECK (document_type IS NULL OR document_type IN ('passport', 'national_id', 'drivers_license'))
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_submitted
  ON public.user_verifications(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status
  ON public.user_verifications(status);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Reviewer predicate (mirrors app_private.is_blog_editor()).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.is_kyc_reviewer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'support', 'support_agent', 'compliance')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION app_private.is_kyc_reviewer() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_kyc_reviewer() FROM anon;
GRANT EXECUTE ON FUNCTION app_private.is_kyc_reviewer() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_kyc_reviewer() TO service_role;

-- ---------------------------------------------------------------------------
-- Keep user_profiles.kyc_status / account_status in sync with the latest row.
-- SECURITY DEFINER so it can write user_profiles regardless of the caller's RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
    SET kyc_status = NEW.status,
        account_status = CASE
          WHEN NEW.status = 'approved' THEN 'active'
          WHEN NEW.status = 'rejected' THEN 'active'
          WHEN NEW.status IN ('pending', 'in_review', 'needs_more_info') THEN 'pending_verification'
          ELSE account_status
        END,
        updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_user_verifications_updated_at ON public.user_verifications;
CREATE TRIGGER trg_user_verifications_updated_at
BEFORE UPDATE ON public.user_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_user_verifications_sync_profile ON public.user_verifications;
CREATE TRIGGER trg_user_verifications_sync_profile
AFTER INSERT OR UPDATE OF status ON public.user_verifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_verification_status();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_verifications_select_own_or_reviewer ON public.user_verifications;
CREATE POLICY user_verifications_select_own_or_reviewer
  ON public.user_verifications
  FOR SELECT
  USING (user_id = auth.uid() OR app_private.is_kyc_reviewer());

DROP POLICY IF EXISTS user_verifications_insert_own ON public.user_verifications;
CREATE POLICY user_verifications_insert_own
  ON public.user_verifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Owner may edit only while still awaiting/needing info (before a final decision);
-- reviewers may update any row (to set approved/rejected + reviewer_note).
DROP POLICY IF EXISTS user_verifications_update_own_pending ON public.user_verifications;
CREATE POLICY user_verifications_update_own_pending
  ON public.user_verifications
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND status IN ('pending', 'needs_more_info'))
    OR app_private.is_kyc_reviewer()
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('pending', 'needs_more_info'))
    OR app_private.is_kyc_reviewer()
  );

-- ---------------------------------------------------------------------------
-- Private storage bucket for identity documents (NOT public — read via signed
-- URLs only). Users read/write only their own <uid>/ prefix; reviewers read all.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS kyc_documents_rw_own ON storage.objects;
CREATE POLICY kyc_documents_rw_own
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR app_private.is_kyc_reviewer()
    )
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
