-- Blog CMS for public editorial posts and admin-created updates.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Update',
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  author_name TEXT NOT NULL DEFAULT 'MVPLAB Editorial',
  author_title TEXT,
  cover_image_url TEXT,
  cover_image_alt TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  reading_time_minutes INTEGER NOT NULL DEFAULT 4,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  CONSTRAINT blog_posts_reading_time_check CHECK (reading_time_minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON public.blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category
  ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured
  ON public.blog_posts(featured)
  WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
  ON public.blog_posts(created_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sync_blog_post_publish_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app_private.is_blog_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'support', 'content_reviewer')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION app_private.is_blog_editor() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_blog_editor() FROM anon;
GRANT EXECUTE ON FUNCTION app_private.is_blog_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_blog_editor() TO service_role;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_blog_posts_publish_timestamp ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_publish_timestamp
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.sync_blog_post_publish_timestamp();

DROP POLICY IF EXISTS blog_posts_select_public ON public.blog_posts;
CREATE POLICY blog_posts_select_public
  ON public.blog_posts
  FOR SELECT
  USING (
    status = 'published'
    OR app_private.is_blog_editor()
  );

DROP POLICY IF EXISTS blog_posts_insert_staff ON public.blog_posts;
CREATE POLICY blog_posts_insert_staff
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (app_private.is_blog_editor());

DROP POLICY IF EXISTS blog_posts_update_staff ON public.blog_posts;
CREATE POLICY blog_posts_update_staff
  ON public.blog_posts
  FOR UPDATE
  USING (app_private.is_blog_editor())
  WITH CHECK (app_private.is_blog_editor());

DROP POLICY IF EXISTS blog_posts_delete_staff ON public.blog_posts;
CREATE POLICY blog_posts_delete_staff
  ON public.blog_posts
  FOR DELETE
  USING (app_private.is_blog_editor());

INSERT INTO public.blog_posts (
  slug,
  title,
  excerpt,
  body,
  category,
  status,
  featured,
  author_name,
  author_title,
  cover_image_url,
  cover_image_alt,
  tags,
  reading_time_minutes,
  published_at
)
VALUES
  (
    'why-we-rebuilt-the-marketplace-homepage',
    'Why we rebuilt the marketplace homepage around better decisions',
    'The homepage now does less, but it tells buyers more. That tradeoff is deliberate.',
    E'The marketplace homepage is the first filter most people use before they read a listing in detail. That means the design has to do three jobs at once: make the inventory feel real, surface the most relevant opportunities quickly, and keep trust signals visible without turning the page into a spreadsheet.\n\n## What changed\n\n- We put comparison context closer to the top of the page.\n- We simplified the number of competing calls to action.\n- We made the layout easier to scan on mobile.\n\n## Why it matters\n\nA stronger homepage does not just look cleaner. It reduces decision fatigue, which means more listings get considered and fewer people bounce before they understand the asset.',
    'Product',
    'published',
    TRUE,
    'MVPLAB Editorial',
    'Product team',
    NULL,
    NULL,
    ARRAY['product', 'marketplace', 'ux'],
    3,
    NOW() - INTERVAL '7 days'
  ),
  (
    'what-makes-a-listing-trustworthy',
    'What makes a listing trustworthy in the first 30 seconds',
    'Buyers do not read every detail. They scan for proof, clarity, and a believable next step.',
    E'Trust is not a single badge or a single paragraph. It is the sum of the first few things a buyer sees: a clear description, consistent numbers, realistic pricing, and enough context to understand the transfer.\n\n## The first scan\n\nWe look for the details that answer the obvious questions immediately.\n\n- What is the asset?\n- Why is it being sold?\n- What proof is available?\n- What does the buyer receive after closing?\n\n## The practical test\n\nIf a listing cannot answer those questions quickly, it is not ready yet. The best listings remove uncertainty before the buyer has to ask for more context.',
    'Guides',
    'published',
    FALSE,
    'MVPLAB Editorial',
    'Marketplace team',
    NULL,
    NULL,
    ARRAY['marketplace', 'trust', 'sales'],
    4,
    NOW() - INTERVAL '5 days'
  ),
  (
    'a-cleaner-path-from-submission-to-publication',
    'A cleaner path from submission to publication',
    'The admin workflow is getting sharper: one queue, one source of truth, and fewer manual handoffs.',
    E'Publishing is easy when content is short. Publishing becomes operational work when posts need review, scheduling, and a consistent format. The new blog workflow makes that path explicit so the admin can create a draft, review the preview, publish when ready, and keep a record of what changed.\n\n## The operating rule\n\nEvery post should be easy to write, easy to review, and easy to update later. If a draft needs hidden state or extra coordination, the process is too heavy.\n\n## What this unlocks\n\n- Faster product notes.\n- Better launch updates.\n- Fewer stale pages.\n- A clearer editorial cadence.',
    'Operations',
    'published',
    FALSE,
    'MVPLAB Editorial',
    'Operations team',
    NULL,
    NULL,
    ARRAY['operations', 'publishing', 'workflow'],
    4,
    NOW() - INTERVAL '3 days'
  ),
  (
    'how-we-think-about-product-updates',
    'How we think about product updates that earn attention',
    'Good updates are not louder than the product. They are more precise about what changed and why.',
    E'The best product updates are useful to readers even if they never click through to the product. They tell a small, specific story: the problem, the change, and the effect on the experience.\n\n## Our standard\n\nWe keep updates short enough to read quickly, but concrete enough to explain the tradeoff behind the work.\n\n- Start with what changed.\n- Explain the user impact.\n- Close with the next step.\n\nThat structure keeps the blog aligned with the product. It also makes the archive feel coherent instead of random.',
    'Company',
    'published',
    FALSE,
    'MVPLAB Editorial',
    'Company team',
    NULL,
    NULL,
    ARRAY['company', 'updates', 'product'],
    3,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (slug) DO NOTHING;
