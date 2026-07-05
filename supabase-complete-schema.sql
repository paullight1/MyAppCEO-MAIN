-- ═══════════════════════════════════════════════════════════════
-- MVPLABX Complete Database Schema
-- MyAppCEO Marketplace + Crowdfunding + Notifications
-- ═══════════════════════════════════════════════════════════════
-- Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: CORE MARKETPLACE
-- ═══════════════════════════════════════════════════════════════

-- Listings Table (main marketplace listings)
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    short_description TEXT,
    long_description TEXT,
    image_url TEXT,
    asking_price DECIMAL(15, 2),
    target_raise DECIMAL(15, 2),
    equity_available DECIMAL(5, 2),
    monthly_revenue DECIMAL(15, 2),
    revenue_verified BOOLEAN DEFAULT FALSE,
    listing_type VARCHAR(50) DEFAULT 'sale', -- 'sale', 'investment', 'both'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'paused', 'sold'
    approval_stage VARCHAR(50) DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_monthly_revenue ON listings(monthly_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_listings_asking_price ON listings(asking_price DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings"
    ON listings FOR SELECT
    USING (status IN ('active'));

CREATE POLICY "Users can insert their own listings"
    ON listings FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own listings"
    ON listings FOR UPDATE
    USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own listings"
    ON listings FOR DELETE
    USING (auth.uid() = seller_id);

-- Listing Views (track each view for analytics)
CREATE TABLE IF NOT EXISTS listing_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referrer TEXT,
    device_type VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_viewed_at ON listing_views(viewed_at DESC);

-- Favorites / Watchlist
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'withdrawn', 'countered'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their offers"
    ON offers FOR SELECT
    USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view offers on their listings"
    ON offers FOR SELECT
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id));

CREATE POLICY "Users can create offers"
    ON offers FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Listing owners can update offer status"
    ON offers FOR UPDATE
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id));

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(10),
    color VARCHAR(20),
    listing_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO categories (name, slug, icon, color) VALUES
    ('SaaS', 'saas', '⚡', '#3b82f6'),
    ('AI Tool', 'ai-tool', '🤖', '#8b5cf6'),
    ('Game', 'game', '🎮', '#f97316'),
    ('Web App', 'web-app', '🌍', '#10b981'),
    ('Mobile', 'mobile', '📱', '#ec4899')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON categories FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: CROWDFUNDING & CO-OWNERSHIP
-- ═══════════════════════════════════════════════════════════════

-- Crowdfunding Campaigns
-- Two types: (1) Fund a product idea before it exists
--            (2) Pool funds to acquire an existing product together
CREATE TABLE IF NOT EXISTS crowdfunding_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL, -- NULL if starting from idea
    idea_id UUID, -- reference to an idea if created from one
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    long_description TEXT,
    cover_image_url TEXT,
    video_url TEXT,
    funding_goal DECIMAL(15, 2) NOT NULL, -- total amount needed
    funding_raised DECIMAL(15, 2) DEFAULT 0,
    min_investment DECIMAL(15, 2) NOT NULL, -- minimum amount per investor
    max_investment DECIMAL(15, 2), -- NULL = unlimited
    equity_offered_pct DECIMAL(5, 2) NOT NULL, -- percentage of equity offered
    pre_money_valuation DECIMAL(15, 2) NOT NULL,
    platform_fee_pct DECIMAL(5, 2) DEFAULT 5.00, -- platform cut percentage
    funding_type VARCHAR(20) DEFAULT 'all_or_nothing', -- 'all_or_nothing' or 'keep_what_you_raise'
    campaign_type VARCHAR(20) DEFAULT 'build', -- 'build' (new product) or 'acquire' (buy existing)
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'funded', 'cancelled', 'expired'
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    funded_at TIMESTAMP WITH TIME ZONE,
    max_investors INTEGER DEFAULT 100, -- 0 = unlimited
    current_investor_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON crowdfunding_campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON crowdfunding_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON crowdfunding_campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON crowdfunding_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_funding_type ON crowdfunding_campaigns(funding_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type ON crowdfunding_campaigns(campaign_type);

ALTER TABLE crowdfunding_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public campaigns"
    ON crowdfunding_campaigns FOR SELECT
    USING (is_public = TRUE AND status IN ('active', 'funded', 'paused'));

CREATE POLICY "Owners can view all their campaigns"
    ON crowdfunding_campaigns FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create campaigns"
    ON crowdfunding_campaigns FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their campaigns"
    ON crowdfunding_campaigns FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their campaigns"
    ON crowdfunding_campaigns FOR DELETE
    USING (auth.uid() = owner_id);

-- Investment Commitments (pledges to a campaign)
CREATE TABLE IF NOT EXISTS investment_commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    stake_pct DECIMAL(5, 4) NOT NULL, -- percentage of company this investor owns
    valuation_at_commitment DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'paid', 'refunded', 'cancelled'
    stripe_payment_intent_id VARCHAR(255),
    stripe_setup_intent_id VARCHAR(255),
    committed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_commitments_campaign ON investment_commitments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_commitments_investor ON investment_commitments(investor_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON investment_commitments(status);
CREATE INDEX IF NOT EXISTS idx_commitments_paid ON investment_commitments(paid_at);

ALTER TABLE investment_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view their commitments"
    ON investment_commitments FOR SELECT
    USING (auth.uid() = investor_id);

CREATE POLICY "Campaign owners can view commitments on their campaigns"
    ON investment_commitments FOR SELECT
    USING (
        auth.uid() IN (
            SELECT owner_id FROM crowdfunding_campaigns WHERE id = investment_commitments.campaign_id
        )
    );

CREATE POLICY "Users can create commitments"
    ON investment_commitments FOR INSERT
    WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Users can update their own commitments"
    ON investment_commitments FOR UPDATE
    USING (auth.uid() = investor_id);

-- Campaign Updates (owner posts progress updates to investors)
CREATE TABLE IF NOT EXISTS campaign_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    update_type VARCHAR(50) DEFAULT 'general', -- 'milestone', 'financial', 'general', 'alert'
    is_public BOOLEAN DEFAULT FALSE, -- public = visible to anyone, false = investors only
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_campaign ON campaign_updates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_updates_created ON campaign_updates(created_at DESC);

ALTER TABLE campaign_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public updates"
    ON campaign_updates FOR SELECT
    USING (is_public = TRUE);

CREATE POLICY "Investors can view updates on campaigns they backed"
    ON campaign_updates FOR SELECT
    USING (
        auth.uid() IN (
            SELECT investor_id FROM investment_commitments
            WHERE campaign_id = campaign_updates.campaign_id AND status IN ('confirmed', 'paid')
        )
    );

CREATE POLICY "Campaign owners can create updates"
    ON campaign_updates FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- Campaign Share Links (for referral tracking)
CREATE TABLE IF NOT EXISTS campaign_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    uses INTEGER DEFAULT 0,
    max_uses INTEGER, -- NULL = unlimited
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON campaign_share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_share_links_campaign ON campaign_share_links(campaign_id);

ALTER TABLE campaign_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view share links"
    ON campaign_share_links FOR SELECT USING (true);

CREATE POLICY "Campaign owners can create share links"
    ON campaign_share_links FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT owner_id FROM crowdfunding_campaigns WHERE id = campaign_share_links.campaign_id)
    );

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: USER PROFILES & ROLES
-- ═══════════════════════════════════════════════════════════════

-- Extended user profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'ceo', -- 'ceo', 'creator', 'investor', 'admin'
    bio TEXT,
    company_name VARCHAR(255),
    website TEXT,
    stripe_account_id VARCHAR(255),
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    notification_preferences JSONB DEFAULT '{"emailOffers": true, "emailUpdates": true, "emailReports": false, "pushOffers": true, "pushUpdates": false, "pushReports": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON user_profiles(role);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
    ON user_profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'ceo');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'announcement', 'system', 'promotional', 'alert', 'feature', 'offer', 'investment'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can insert notifications (for admin broadcasts)
-- No RLS policy needed -- service_role bypasses RLS

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: ESCROW
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS escrow_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'funding', -- 'funding', 'inspection', 'approval', 'releasing', 'completed', 'disputed'
    stage INTEGER DEFAULT 1, -- 1-5 progress
    time_left INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON escrow_deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_deals(status);

ALTER TABLE escrow_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their escrow deals"
    ON escrow_deals FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Parties can update their escrow deals"
    ON escrow_deals FOR UPDATE
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Escrow milestones
CREATE TABLE IF NOT EXISTS escrow_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES escrow_deals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'disputed'
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_deal ON escrow_milestones(deal_id);

ALTER TABLE escrow_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view milestones"
    ON escrow_milestones FOR SELECT
    USING (
        auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
        OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
    );

-- Transfer items (what gets handed over)
CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES escrow_deals(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'source_code', 'domain', 'social_accounts', 'customer_data', 'documentation', 'hosting'
    label VARCHAR(255) NOT NULL,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_deal ON transfer_items(deal_id);

ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view transfer items"
    ON transfer_items FOR SELECT
    USING (
        auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id)
        OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id)
    );

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: IDEAS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'other',
    platform VARCHAR(100) DEFAULT 'mobile',
    target_audience TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft',
    prd_document JSONB,
    design_mockups JSONB DEFAULT '[]'::jsonb,
    cost_estimate JSONB,
    cost_breakdown JSONB,
    timeline_weeks INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ideas_title_length CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
    CONSTRAINT ideas_description_length CHECK (char_length(trim(description)) BETWEEN 20 AND 5000),
    CONSTRAINT ideas_category_valid CHECK (category IN ('mobile_app', 'web_app', 'saas', 'marketplace', 'social', 'ai_product', 'game', 'productivity', 'other')),
    CONSTRAINT ideas_platform_valid CHECK (platform IN ('mobile', 'web', 'desktop', 'cross_platform')),
    CONSTRAINT ideas_status_valid CHECK (status IN ('draft', 'prd_generating', 'prd_generated', 'designing', 'design_complete', 'estimating', 'ready_for_funding', 'submitted_for_funding', 'archived', 'converted_to_app')),
    CONSTRAINT ideas_timeline_positive CHECK (timeline_weeks IS NULL OR timeline_weeks > 0)
);

CREATE INDEX IF NOT EXISTS idx_ideas_owner ON ideas(owner_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_slug ON ideas(slug);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public ideas"
    ON ideas FOR SELECT
    USING (status IN ('ready', 'active'));

CREATE POLICY "Owners can view all their ideas"
    ON ideas FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create ideas"
    ON ideas FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their ideas"
    ON ideas FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their ideas"
    ON ideas FOR DELETE
    USING (auth.uid() = owner_id);

-- PRD versions and graph snapshots
CREATE TABLE IF NOT EXISTS prd_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation JSONB,
    generated_by VARCHAR(50) DEFAULT 'user',
    restored_from_version INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (idea_id, version)
);

CREATE INDEX IF NOT EXISTS idx_prd_versions_idea ON prd_versions(idea_id, version DESC);
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage PRD versions"
    ON prd_versions FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Design progress rows are intentionally resumable after refresh.
CREATE TABLE IF NOT EXISTS design_generation_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    job_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    error TEXT,
    prompt_version TEXT DEFAULT 'design-prompt-v1',
    provider TEXT,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT design_progress_status_valid CHECK (status IN ('queued', 'pending', 'running', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT design_progress_bounds CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_design_progress_idea ON design_generation_progress(idea_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_design_progress_unique_node_job ON design_generation_progress(idea_id, node_id, prompt_version);
ALTER TABLE design_generation_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage design progress"
    ON design_generation_progress FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    app_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    idempotency_key TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    prompt_version TEXT DEFAULT 'v1',
    input JSONB DEFAULT '{}'::jsonb,
    output JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    cost_units NUMERIC(12, 4) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT generation_jobs_type_valid CHECK (job_type IN ('prd', 'design', 'build_plan', 'code', 'screen_spec')),
    CONSTRAINT generation_jobs_status_valid CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    UNIQUE (owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_idea ON generation_jobs(idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage generation jobs"
    ON generation_jobs FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS generated_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    app_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
    artifact_type VARCHAR(50) NOT NULL,
    name TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    prompt_version TEXT DEFAULT 'v1',
    provider TEXT,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT generated_artifacts_type_valid CHECK (artifact_type IN ('prd', 'design', 'build_plan', 'screen_spec', 'code_scaffold', 'test_plan', 'deployment_plan'))
);

CREATE INDEX IF NOT EXISTS idx_generated_artifacts_idea ON generated_artifacts(idea_id, artifact_type, version DESC);
ALTER TABLE generated_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage generated artifacts"
    ON generated_artifacts FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS quality_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID REFERENCES generated_artifacts(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    lint_status VARCHAR(50) DEFAULT 'pending',
    typecheck_status VARCHAR(50) DEFAULT 'pending',
    test_status VARCHAR(50) DEFAULT 'pending',
    security_status VARCHAR(50) DEFAULT 'pending',
    accessibility_status VARCHAR(50) DEFAULT 'pending',
    summary TEXT,
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE quality_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage quality reports"
    ON quality_reports FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS review_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES generated_artifacts(id) ON DELETE SET NULL,
    quality_report_id UUID REFERENCES quality_reports(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'generated_artifact',
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT review_submissions_status_valid CHECK (status IN ('submitted', 'in_review', 'approved', 'changes_requested', 'rejected'))
);

ALTER TABLE review_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage review submissions"
    ON review_submissions FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 7: TRIGGERS & FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_campaigns_updated_at
    BEFORE UPDATE ON crowdfunding_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_escrow_updated_at
    BEFORE UPDATE ON escrow_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- Production Marketplace Hardening
-- Mirrors the marketplace schema additions for listing review,
-- watchlists, offers, escrow, payout readiness, and audit trails.
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE listings ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS minimum_offer DECIMAL(15, 2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS app_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS store_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS app_age_months INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS terms_policy_version VARCHAR(100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revenue_evidence_path TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revenue_evidence_review_status VARCHAR(50) DEFAULT 'not_submitted';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revenue_evidence_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revenue_evidence_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS screenshot_count INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS media_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_payout_status VARCHAR(50) DEFAULT 'not_started';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_payout_account_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_payout_ready_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_status_check') THEN
        ALTER TABLE listings ADD CONSTRAINT listings_status_check
        CHECK (status IN ('draft', 'pending_review', 'under_review', 'active', 'paused', 'sold', 'rejected', 'archived')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_listing_type_check') THEN
        ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
        CHECK (listing_type IN ('sale', 'investment', 'both')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_revenue_evidence_status_check') THEN
        ALTER TABLE listings ADD CONSTRAINT listings_revenue_evidence_status_check
        CHECK (revenue_evidence_review_status IN ('not_submitted', 'pending', 'approved', 'rejected')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_seller_payout_status_check') THEN
        ALTER TABLE listings ADD CONSTRAINT listings_seller_payout_status_check
        CHECK (seller_payout_status IN ('not_started', 'pending', 'restricted', 'ready', 'disconnected')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_nonnegative_financials_check') THEN
        ALTER TABLE listings ADD CONSTRAINT listings_nonnegative_financials_check
        CHECK (
            COALESCE(asking_price, 0) >= 0
            AND COALESCE(minimum_offer, 0) >= 0
            AND COALESCE(target_raise, 0) >= 0
            AND COALESCE(monthly_revenue, 0) >= 0
            AND COALESCE(app_age_months, 0) >= 0
            AND COALESCE(equity_available, 0) >= 0
            AND COALESCE(equity_available, 0) <= 100
        ) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_review_status ON listings(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_verified_revenue ON listings(revenue_verified) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_risk_level ON listings(risk_level);
CREATE INDEX IF NOT EXISTS idx_listings_name_trgm ON listings USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_short_description_trgm ON listings USING gin (short_description gin_trgm_ops);

DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;
DROP POLICY IF EXISTS "Public listings are viewable by everyone" ON listings;
DROP POLICY IF EXISTS "Users can insert their own listings" ON listings;
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON listings;
DROP POLICY IF EXISTS "Public can view active and sold listings" ON listings;
DROP POLICY IF EXISTS "Sellers can view own listings in any status" ON listings;
DROP POLICY IF EXISTS "Sellers can create draft or review listings" ON listings;
DROP POLICY IF EXISTS "Sellers can mutate editable own listings" ON listings;
DROP POLICY IF EXISTS "Sellers can delete draft or rejected listings" ON listings;

CREATE POLICY "Public can view active and sold listings"
    ON listings FOR SELECT
    USING (status IN ('active', 'sold'));

CREATE POLICY "Sellers can view own listings in any status"
    ON listings FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create draft or review listings"
    ON listings FOR INSERT
    WITH CHECK (auth.uid() = seller_id AND status IN ('draft', 'pending_review'));

CREATE POLICY "Sellers can mutate editable own listings"
    ON listings FOR UPDATE
    USING (auth.uid() = seller_id AND status IN ('draft', 'pending_review', 'active', 'paused', 'rejected'))
    WITH CHECK (auth.uid() = seller_id AND status IN ('draft', 'pending_review', 'under_review', 'active', 'paused', 'sold', 'rejected', 'archived'));

CREATE POLICY "Sellers can delete draft or rejected listings"
    ON listings FOR DELETE
    USING (auth.uid() = seller_id AND status IN ('draft', 'rejected'));

CREATE TABLE IF NOT EXISTS listing_terms_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_version VARCHAR(100) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    UNIQUE (listing_id, user_id, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_listing_terms_listing ON listing_terms_acceptances(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_terms_user ON listing_terms_acceptances(user_id);
ALTER TABLE listing_terms_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Listing owners manage terms acceptances" ON listing_terms_acceptances;
CREATE POLICY "Listing owners manage terms acceptances" ON listing_terms_acceptances FOR ALL
    USING (auth.uid() = user_id AND auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_terms_acceptances.listing_id))
    WITH CHECK (auth.uid() = user_id AND auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_terms_acceptances.listing_id));

CREATE TABLE IF NOT EXISTS listing_activity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_activity_listing ON listing_activity_history(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_activity_actor ON listing_activity_history(actor_id);
ALTER TABLE listing_activity_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Listing owners can view activity" ON listing_activity_history;
DROP POLICY IF EXISTS "Listing owners can insert activity" ON listing_activity_history;
CREATE POLICY "Listing owners can view activity" ON listing_activity_history FOR SELECT
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_activity_history.listing_id));
CREATE POLICY "Listing owners can insert activity" ON listing_activity_history FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_activity_history.listing_id));

CREATE TABLE IF NOT EXISTS listing_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (listing_id, storage_path)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_media_type_check') THEN
        ALTER TABLE listing_media ADD CONSTRAINT listing_media_type_check
        CHECK (media_type IN ('cover', 'screenshot', 'demo_video', 'document')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listing_media_listing ON listing_media(listing_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_listing_media_type ON listing_media(media_type);
ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view approved listing media" ON listing_media;
DROP POLICY IF EXISTS "Listing owners manage media" ON listing_media;
CREATE POLICY "Public can view approved listing media" ON listing_media FOR SELECT
    USING (
        media_type IN ('cover', 'screenshot', 'demo_video')
        AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_media.listing_id AND listings.status IN ('active', 'sold'))
    );
CREATE POLICY "Listing owners manage media" ON listing_media FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_media.listing_id))
    WITH CHECK (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_media.listing_id));

CREATE TABLE IF NOT EXISTS listing_revenue_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    private_storage_path TEXT NOT NULL,
    file_name TEXT,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    review_status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_revenue_evidence_status_check') THEN
        ALTER TABLE listing_revenue_evidence ADD CONSTRAINT listing_revenue_evidence_status_check
        CHECK (review_status IN ('pending', 'approved', 'rejected')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_revenue_evidence_listing ON listing_revenue_evidence(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_evidence_status ON listing_revenue_evidence(review_status);
ALTER TABLE listing_revenue_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Listing owners manage revenue evidence" ON listing_revenue_evidence;
CREATE POLICY "Listing owners manage revenue evidence" ON listing_revenue_evidence FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_revenue_evidence.listing_id))
    WITH CHECK (auth.uid() = uploaded_by AND auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_revenue_evidence.listing_id));

ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_once_per_user ON listing_views(listing_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_once_per_session ON listing_views(listing_id, session_id) WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_once_per_visitor ON listing_views(listing_id, visitor_id) WHERE visitor_id IS NOT NULL AND session_id IS NULL;

ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can record listing views" ON listing_views;
DROP POLICY IF EXISTS "Listing owners can view listing analytics" ON listing_views;
CREATE POLICY "Public can record listing views" ON listing_views FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_views.listing_id AND listings.status IN ('active', 'sold')));
CREATE POLICY "Listing owners can view listing analytics" ON listing_views FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_views.listing_id));

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_status_check') THEN
        ALTER TABLE favorites ADD CONSTRAINT favorites_status_check
        CHECK (status IN ('active', 'archived')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_favorites_user_status ON favorites(user_id, status, updated_at DESC);
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON favorites;
DROP POLICY IF EXISTS "Users can update own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorites" ON favorites FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS seller_payout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'stripe',
    provider_account_id TEXT NOT NULL,
    account_status VARCHAR(50) DEFAULT 'pending',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    requirements_due JSONB DEFAULT '[]'::jsonb,
    last_provider_event_id TEXT,
    ready_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (provider, provider_account_id),
    UNIQUE (seller_id, provider)
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS payout_account_status VARCHAR(50) DEFAULT 'not_started';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS payout_ready_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seller_payout_accounts_status_check') THEN
        ALTER TABLE seller_payout_accounts ADD CONSTRAINT seller_payout_accounts_status_check
        CHECK (account_status IN ('pending', 'restricted', 'ready', 'disconnected')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_seller ON seller_payout_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_status ON seller_payout_accounts(account_status);
ALTER TABLE seller_payout_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers can view own payout account" ON seller_payout_accounts;
CREATE POLICY "Sellers can view own payout account" ON seller_payout_accounts FOR SELECT USING (auth.uid() = seller_id);

ALTER TABLE offers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS countered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_amount DECIMAL(15, 2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_message TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS counter_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS countered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS buyer_responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS last_action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE offers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_status_check') THEN
        ALTER TABLE offers ADD CONSTRAINT offers_status_check
        CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'countered', 'counter_accepted', 'counter_rejected', 'expired')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_amount_positive_check') THEN
        ALTER TABLE offers ADD CONSTRAINT offers_amount_positive_check
        CHECK (amount > 0 AND COALESCE(counter_amount, 0) >= 0) NOT VALID;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_one_pending_per_buyer_listing ON offers(listing_id, buyer_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_idempotency_key ON offers(buyer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_listing_status ON offers(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_parent ON offers(parent_offer_id);

DROP POLICY IF EXISTS "Buyers can view their offers" ON offers;
DROP POLICY IF EXISTS "Sellers can view offers on their listings" ON offers;
DROP POLICY IF EXISTS "Users can create offers" ON offers;
DROP POLICY IF EXISTS "Listing owners can update offer status" ON offers;
DROP POLICY IF EXISTS "Offer participants can view offers" ON offers;
DROP POLICY IF EXISTS "Buyers can create offers on active listings" ON offers;
DROP POLICY IF EXISTS "Offer participants can update offers" ON offers;
CREATE POLICY "Offer participants can view offers" ON offers FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id));
CREATE POLICY "Buyers can create offers on active listings" ON offers FOR INSERT
    WITH CHECK (
        auth.uid() = buyer_id
        AND EXISTS (SELECT 1 FROM listings WHERE listings.id = offers.listing_id AND listings.status = 'active' AND listings.seller_id <> auth.uid())
    );
CREATE POLICY "Offer participants can update offers" ON offers FOR UPDATE
    USING (auth.uid() = buyer_id OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id))
    WITH CHECK (auth.uid() = buyer_id OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id));

CREATE TABLE IF NOT EXISTS offer_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    before_data JSONB,
    after_data JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_audit_offer ON offer_audit_logs(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_audit_actor ON offer_audit_logs(actor_id);
ALTER TABLE offer_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Offer participants can view audit logs" ON offer_audit_logs;
DROP POLICY IF EXISTS "Offer participants can insert audit logs" ON offer_audit_logs;
CREATE POLICY "Offer participants can view audit logs" ON offer_audit_logs FOR SELECT
    USING (
        auth.uid() IN (SELECT buyer_id FROM offers WHERE offers.id = offer_audit_logs.offer_id)
        OR auth.uid() IN (
            SELECT listings.seller_id
            FROM offers
            JOIN listings ON listings.id = offers.listing_id
            WHERE offers.id = offer_audit_logs.offer_id
        )
    );
CREATE POLICY "Offer participants can insert audit logs" ON offer_audit_logs FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT buyer_id FROM offers WHERE offers.id = offer_audit_logs.offer_id)
        OR auth.uid() IN (
            SELECT listings.seller_id
            FROM offers
            JOIN listings ON listings.id = offers.listing_id
            WHERE offers.id = offer_audit_logs.offer_id
        )
    );

ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS inspection_period_hours INTEGER DEFAULT 72;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS inspection_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS inspection_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS funded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS admin_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe';
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS provider_charge_id TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS provider_transfer_id TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS provider_refund_id TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS provider_release_id TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS provider_status VARCHAR(100);
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS release_idempotency_key TEXT;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE escrow_deals ADD COLUMN IF NOT EXISTS audit_metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrow_deals_status_check') THEN
        ALTER TABLE escrow_deals ADD CONSTRAINT escrow_deals_status_check
        CHECK (status IN ('created', 'funding', 'funded', 'source_handoff', 'domain_handoff', 'inspection', 'approval', 'releasing', 'completed', 'disputed', 'refunded', 'cancelled')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrow_deals_amount_positive_check') THEN
        ALTER TABLE escrow_deals ADD CONSTRAINT escrow_deals_amount_positive_check
        CHECK (amount > 0) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_escrow_listing ON escrow_deals(listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_offer_unique ON escrow_deals(offer_id) WHERE offer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_idempotency_key ON escrow_deals(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_release_idempotency_key ON escrow_deals(release_idempotency_key) WHERE release_idempotency_key IS NOT NULL;

DROP POLICY IF EXISTS "Parties can view their escrow deals" ON escrow_deals;
DROP POLICY IF EXISTS "Parties can update their escrow deals" ON escrow_deals;
DROP POLICY IF EXISTS "Escrow participants can view deals" ON escrow_deals;
DROP POLICY IF EXISTS "Escrow participants can create deals" ON escrow_deals;
DROP POLICY IF EXISTS "Escrow participants can update deals" ON escrow_deals;
CREATE POLICY "Escrow participants can view deals" ON escrow_deals FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Escrow participants can create deals" ON escrow_deals FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Escrow participants can update deals" ON escrow_deals FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id) WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

ALTER TABLE escrow_milestones ADD COLUMN IF NOT EXISTS milestone_type VARCHAR(50) DEFAULT 'custom';
ALTER TABLE escrow_milestones ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE escrow_milestones ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_milestones ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escrow_milestones ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE escrow_milestones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrow_milestones_status_check') THEN
        ALTER TABLE escrow_milestones ADD CONSTRAINT escrow_milestones_status_check
        CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed', 'blocked')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_milestones_deal_order ON escrow_milestones(deal_id, sort_order);
DROP POLICY IF EXISTS "Parties can view milestones" ON escrow_milestones;
DROP POLICY IF EXISTS "Escrow participants can view milestones" ON escrow_milestones;
DROP POLICY IF EXISTS "Escrow participants can update milestones" ON escrow_milestones;
CREATE POLICY "Escrow participants can view milestones" ON escrow_milestones FOR SELECT
    USING (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id));
CREATE POLICY "Escrow participants can update milestones" ON escrow_milestones FOR UPDATE
    USING (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id))
    WITH CHECK (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id));

ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS seller_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS handoff_notes TEXT;
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS evidence_path TEXT;
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transfer_items_status_check') THEN
        ALTER TABLE transfer_items ADD CONSTRAINT transfer_items_status_check
        CHECK (status IN ('pending', 'seller_ready', 'buyer_reviewing', 'confirmed', 'rejected', 'disputed')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transfer_items_status ON transfer_items(deal_id, status);
DROP POLICY IF EXISTS "Parties can view transfer items" ON transfer_items;
DROP POLICY IF EXISTS "Escrow participants can view transfer items" ON transfer_items;
DROP POLICY IF EXISTS "Escrow participants can update transfer items" ON transfer_items;
CREATE POLICY "Escrow participants can view transfer items" ON transfer_items FOR SELECT
    USING (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id));
CREATE POLICY "Escrow participants can update transfer items" ON transfer_items FOR UPDATE
    USING (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id))
    WITH CHECK (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id));

CREATE TABLE IF NOT EXISTS escrow_dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES escrow_deals(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    evidence_path TEXT,
    evidence_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_dispute_evidence_deal ON escrow_dispute_evidence(deal_id, created_at DESC);
ALTER TABLE escrow_dispute_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Escrow participants manage dispute evidence" ON escrow_dispute_evidence;
CREATE POLICY "Escrow participants manage dispute evidence" ON escrow_dispute_evidence FOR ALL
    USING (
        auth.uid() = submitted_by
        OR auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_dispute_evidence.deal_id)
        OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_dispute_evidence.deal_id)
    )
    WITH CHECK (
        auth.uid() = submitted_by
        AND (
            auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_dispute_evidence.deal_id)
            OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_dispute_evidence.deal_id)
        )
    );

CREATE TABLE IF NOT EXISTS escrow_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES escrow_deals(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    before_data JSONB,
    after_data JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_audit_deal ON escrow_audit_logs(deal_id, created_at DESC);
ALTER TABLE escrow_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Escrow participants can view audit logs" ON escrow_audit_logs;
DROP POLICY IF EXISTS "Escrow participants can insert audit logs" ON escrow_audit_logs;
CREATE POLICY "Escrow participants can view audit logs" ON escrow_audit_logs FOR SELECT
    USING (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id));
CREATE POLICY "Escrow participants can insert audit logs" ON escrow_audit_logs FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id) OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id));

CREATE TABLE IF NOT EXISTS marketplace_payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escrow_deal_id UUID REFERENCES escrow_deals(id) ON DELETE SET NULL,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    provider VARCHAR(50) DEFAULT 'stripe',
    provider_event_id TEXT,
    provider_object_id TEXT,
    event_type VARCHAR(100) NOT NULL,
    idempotency_key TEXT,
    status VARCHAR(50),
    amount DECIMAL(15, 2),
    currency VARCHAR(3),
    payload JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_payment_provider_event ON marketplace_payment_audit_logs(provider, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_payment_idempotency ON marketplace_payment_audit_logs(provider, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_payment_escrow ON marketplace_payment_audit_logs(escrow_deal_id, created_at DESC);
ALTER TABLE marketplace_payment_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Escrow participants can view payment audit logs" ON marketplace_payment_audit_logs;
CREATE POLICY "Escrow participants can view payment audit logs" ON marketplace_payment_audit_logs FOR SELECT
    USING (
        auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = marketplace_payment_audit_logs.escrow_deal_id)
        OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = marketplace_payment_audit_logs.escrow_deal_id)
    );

CREATE OR REPLACE FUNCTION log_listing_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO listing_activity_history (listing_id, actor_id, action, to_status)
        VALUES (NEW.id, COALESCE(auth.uid(), NEW.seller_id), 'created', NEW.status);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO listing_activity_history (listing_id, actor_id, action, from_status, to_status)
        VALUES (NEW.id, COALESCE(auth.uid(), NEW.seller_id), 'status_changed', OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listing_activity ON listings;
CREATE TRIGGER trigger_listing_activity AFTER INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION log_listing_activity();

CREATE OR REPLACE FUNCTION enforce_listing_screenshot_limit()
RETURNS TRIGGER AS $$
DECLARE
    existing_screenshots INTEGER;
BEGIN
    IF NEW.media_type = 'screenshot' THEN
        SELECT COUNT(*) INTO existing_screenshots
        FROM listing_media
        WHERE listing_id = NEW.listing_id AND media_type = 'screenshot' AND id <> NEW.id;

        IF existing_screenshots >= 8 THEN
            RAISE EXCEPTION 'Listings support a maximum of 8 screenshots';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listing_screenshot_limit ON listing_media;
CREATE TRIGGER trigger_listing_screenshot_limit BEFORE INSERT OR UPDATE ON listing_media FOR EACH ROW EXECUTE FUNCTION enforce_listing_screenshot_limit();

CREATE OR REPLACE FUNCTION refresh_listing_media_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_listing_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_listing_id := OLD.listing_id;
    ELSE
        target_listing_id := NEW.listing_id;
    END IF;

    UPDATE listings
    SET screenshot_count = (
        SELECT COUNT(*) FROM listing_media WHERE listing_id = target_listing_id AND media_type = 'screenshot'
    )
    WHERE id = target_listing_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listing_media_counts ON listing_media;
CREATE TRIGGER trigger_listing_media_counts AFTER INSERT OR UPDATE OR DELETE ON listing_media FOR EACH ROW EXECUTE FUNCTION refresh_listing_media_counts();

CREATE OR REPLACE FUNCTION increment_listing_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings SET views = COALESCE(views, 0) + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_listing_view_count ON listing_views;
CREATE TRIGGER trigger_increment_listing_view_count AFTER INSERT ON listing_views FOR EACH ROW EXECUTE FUNCTION increment_listing_view_count();

CREATE OR REPLACE FUNCTION refresh_listing_favorite_count()
RETURNS TRIGGER AS $$
DECLARE
    target_listing_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_listing_id := OLD.listing_id;
    ELSE
        target_listing_id := NEW.listing_id;
    END IF;

    UPDATE listings
    SET favorites = (
        SELECT COUNT(*) FROM favorites WHERE listing_id = target_listing_id AND status = 'active'
    )
    WHERE id = target_listing_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refresh_listing_favorite_count ON favorites;
CREATE TRIGGER trigger_refresh_listing_favorite_count AFTER INSERT OR UPDATE OR DELETE ON favorites FOR EACH ROW EXECUTE FUNCTION refresh_listing_favorite_count();

CREATE OR REPLACE FUNCTION log_offer_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO offer_audit_logs (offer_id, actor_id, action, to_status, after_data)
        VALUES (NEW.id, COALESCE(auth.uid(), NEW.buyer_id), 'created', NEW.status, to_jsonb(NEW));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO offer_audit_logs (offer_id, actor_id, action, from_status, to_status, before_data, after_data)
        VALUES (NEW.id, COALESCE(auth.uid(), NEW.last_action_by), 'status_changed', OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offer_audit ON offers;
CREATE TRIGGER trigger_offer_audit AFTER INSERT OR UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION log_offer_audit();

CREATE OR REPLACE FUNCTION log_escrow_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO escrow_audit_logs (deal_id, actor_id, action, to_status, after_data)
        VALUES (NEW.id, auth.uid(), 'created', NEW.status, to_jsonb(NEW));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO escrow_audit_logs (deal_id, actor_id, action, from_status, to_status, before_data, after_data)
        VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_escrow_audit ON escrow_deals;
CREATE TRIGGER trigger_escrow_audit AFTER INSERT OR UPDATE ON escrow_deals FOR EACH ROW EXECUTE FUNCTION log_escrow_audit();

DROP TRIGGER IF EXISTS trigger_favorites_updated_at ON favorites;
CREATE TRIGGER trigger_favorites_updated_at BEFORE UPDATE ON favorites FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trigger_listing_media_updated_at ON listing_media;
CREATE TRIGGER trigger_listing_media_updated_at BEFORE UPDATE ON listing_media FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trigger_revenue_evidence_updated_at ON listing_revenue_evidence;
CREATE TRIGGER trigger_revenue_evidence_updated_at BEFORE UPDATE ON listing_revenue_evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trigger_seller_payout_updated_at ON seller_payout_accounts;
CREATE TRIGGER trigger_seller_payout_updated_at BEFORE UPDATE ON seller_payout_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trigger_escrow_milestones_updated_at ON escrow_milestones;
CREATE TRIGGER trigger_escrow_milestones_updated_at BEFORE UPDATE ON escrow_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trigger_transfer_items_updated_at ON transfer_items;
CREATE TRIGGER trigger_transfer_items_updated_at BEFORE UPDATE ON transfer_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_ideas_updated_at
    BEFORE UPDATE ON ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_design_generation_progress_updated_at
    BEFORE UPDATE ON design_generation_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_generation_jobs_updated_at
    BEFORE UPDATE ON generation_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_review_submissions_updated_at
    BEFORE UPDATE ON review_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update campaign funding_raised when commitment is paid
CREATE OR REPLACE FUNCTION update_campaign_funding()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE crowdfunding_campaigns
        SET
            funding_raised = funding_raised + NEW.amount,
            current_investor_count = current_investor_count + 1
        WHERE id = NEW.campaign_id;
    ELSIF NEW.status = 'refunded' AND OLD.status = 'paid' THEN
        UPDATE crowdfunding_campaigns
        SET
            funding_raised = GREATEST(0, funding_raised - NEW.amount),
            current_investor_count = GREATEST(0, current_investor_count - 1)
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_funding
    AFTER UPDATE OF status ON investment_commitments
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_funding();

-- Auto-set funded_at when campaign reaches goal
CREATE OR REPLACE FUNCTION check_campaign_funded()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.funding_raised >= NEW.funding_goal AND NEW.status = 'active' THEN
        NEW.status = 'funded';
        NEW.funded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_campaign_funded
    BEFORE UPDATE OF funding_raised ON crowdfunding_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION check_campaign_funded();

-- Generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_token IS NULL THEN
        NEW.share_token = encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_share_token
    BEFORE INSERT ON crowdfunding_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION generate_share_token();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 8: REALTIME PUBLICATIONS
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE crowdfunding_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE investment_commitments;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 9: HELPER VIEWS
-- ═══════════════════════════════════════════════════════════════

-- Campaign with investor count and funding progress
CREATE OR REPLACE VIEW campaign_overview AS
SELECT
    c.*,
    ROUND(CASE
        WHEN c.funding_goal > 0 THEN (c.funding_raised / c.funding_goal * 100)
        ELSE 0
    END, 2) as funding_progress_pct,
    (c.funding_goal - c.funding_raised) as funding_remaining,
    CASE
        WHEN c.end_date < NOW() AND c.status = 'active' THEN 'expired'
        ELSE c.status
    END as display_status
FROM crowdfunding_campaigns c;

-- Investor portfolio summary
CREATE OR REPLACE VIEW investor_portfolio AS
SELECT
    ic.investor_id,
    COUNT(DISTINCT ic.campaign_id) as total_investments,
    SUM(ic.amount) as total_invested,
    SUM(ic.stake_pct) as total_equity_pct,
    COUNT(CASE WHEN ic.status = 'paid' THEN 1 END) as paid_investments,
    COUNT(CASE WHEN ic.status = 'pending' THEN 1 END) as pending_investments
FROM investment_commitments ic
WHERE ic.investor_id = auth.uid()
GROUP BY ic.investor_id;

-- Campaign with owner info
CREATE OR REPLACE VIEW campaign_details AS
SELECT
    c.*,
    up.full_name as owner_name,
    up.avatar_url as owner_avatar,
    (SELECT COUNT(*) FROM investment_commitments WHERE campaign_id = c.id AND status = 'paid') as paid_investor_count,
    (SELECT COALESCE(SUM(amount), 0) FROM investment_commitments WHERE campaign_id = c.id AND status = 'paid') as total_paid
FROM crowdfunding_campaigns c
LEFT JOIN user_profiles up ON c.owner_id = up.id;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 10: COFOUNDERS & TEAM OWNERSHIP
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_coowners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'co_founder',
    equity_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    vesting_start TIMESTAMP WITH TIME ZONE,
    cliff_date TIMESTAMP WITH TIME ZONE,
    vesting_months INTEGER DEFAULT 48,
    status VARCHAR(50) DEFAULT 'pending',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    ip_assigned BOOLEAN DEFAULT FALSE,
    UNIQUE(app_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coowners_app ON app_coowners(app_id);
CREATE INDEX IF NOT EXISTS idx_coowners_user ON app_coowners(user_id);
CREATE INDEX IF NOT EXISTS idx_coowners_status ON app_coowners(status);

ALTER TABLE app_coowners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners manage coowners" ON app_coowners FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_coowners.app_id));

CREATE POLICY "Co-owners can view apps they co-own" ON app_coowners FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Public can view accepted coowners" ON app_coowners FOR SELECT
    USING (status = 'accepted');

CREATE TABLE IF NOT EXISTS equity_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proposed_pct DECIMAL(5,2) NOT NULL,
    role_offered VARCHAR(50) DEFAULT 'co_founder',
    vesting_terms VARCHAR(100) DEFAULT 'standard_4yr_1yr',
    status VARCHAR(50) DEFAULT 'proposed',
    counter_pct DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_equity_splits_app ON equity_splits(app_id);
CREATE INDEX IF NOT EXISTS idx_equity_splits_user ON equity_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_equity_splits_status ON equity_splits(status);

ALTER TABLE equity_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners create equity splits" ON equity_splits FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = equity_splits.app_id));

CREATE POLICY "Users view offers made to them" ON equity_splits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Target users respond to offers" ON equity_splits FOR UPDATE
    USING (auth.uid() = user_id AND status = 'proposed');

-- ═══════════════════════════════════════════════════════════════
-- SECTION 11: CAP TABLE & EQUITY LEDGER
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS share_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    class_type VARCHAR(50) NOT NULL DEFAULT 'common',
    total_shares DECIMAL(15,2) NOT NULL DEFAULT 10000000,
    issued_shares DECIMAL(15,2) DEFAULT 0,
    voting_rights VARCHAR(50) DEFAULT 'full',
    dividend_rights VARCHAR(50) DEFAULT 'equal',
    liquidation_preference VARCHAR(50) DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, class_name)
);

CREATE INDEX IF NOT EXISTS idx_share_classes_app ON share_classes(app_id);

ALTER TABLE share_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners manage share classes" ON share_classes FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = share_classes.app_id));

CREATE POLICY "Co-owners and investors view share classes" ON share_classes FOR SELECT
    USING (
        auth.uid() IN (SELECT seller_id FROM listings WHERE id = share_classes.app_id)
        OR auth.uid() IN (SELECT user_id FROM app_coowners WHERE app_id = share_classes.app_id AND status = 'accepted')
    );

CREATE TABLE IF NOT EXISTS cap_table_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_type VARCHAR(50) NOT NULL,
    share_class_id UUID REFERENCES share_classes(id) ON DELETE SET NULL,
    shares_count DECIMAL(15,2) NOT NULL,
    equity_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    price_per_share DECIMAL(15,4) DEFAULT 0,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (shares_count * price_per_share) STORED,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    diluted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_cap_table_app ON cap_table_entries(app_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_owner ON cap_table_entries(owner_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_type ON cap_table_entries(owner_type);

ALTER TABLE cap_table_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners manage cap table" ON cap_table_entries FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = cap_table_entries.app_id));

CREATE POLICY "Co-owners and investors view cap table" ON cap_table_entries FOR SELECT
    USING (
        auth.uid() IN (SELECT seller_id FROM listings WHERE id = cap_table_entries.app_id)
        OR auth.uid() IN (SELECT user_id FROM app_coowners WHERE app_id = cap_table_entries.app_id AND status = 'accepted')
        OR auth.uid() = owner_id
    );

CREATE TABLE IF NOT EXISTS option_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    total_options DECIMAL(15,2) NOT NULL DEFAULT 0,
    granted_options DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id)
);

CREATE INDEX IF NOT EXISTS idx_option_pool_app ON option_pool(app_id);

ALTER TABLE option_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners manage option pool" ON option_pool FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = option_pool.app_id));

CREATE POLICY "Co-owners view option pool" ON option_pool FOR SELECT
    USING (
        auth.uid() IN (SELECT seller_id FROM listings WHERE id = option_pool.app_id)
        OR auth.uid() IN (SELECT user_id FROM app_coowners WHERE app_id = option_pool.app_id AND status = 'accepted')
    );

-- ═══════════════════════════════════════════════════════════════
-- SECTION 12: LEGAL ENTITIES & FOUNDER AGREEMENTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legal_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    jurisdiction VARCHAR(100),
    entity_name VARCHAR(255),
    registration_number VARCHAR(100),
    ein VARCHAR(20),
    formed_at DATE,
    registered_agent VARCHAR(255),
    operating_agreement_signed BOOLEAN DEFAULT FALSE,
    bylaws_adopted BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'not_formed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_app ON legal_entities(app_id);
CREATE INDEX IF NOT EXISTS idx_legal_entities_status ON legal_entities(status);

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners manage legal entity" ON legal_entities FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = legal_entities.app_id));

CREATE POLICY "Co-owners view legal entity" ON legal_entities FOR SELECT
    USING (
        auth.uid() IN (SELECT seller_id FROM listings WHERE id = legal_entities.app_id)
        OR auth.uid() IN (SELECT user_id FROM app_coowners WHERE app_id = legal_entities.app_id AND status = 'accepted')
    );

CREATE TABLE IF NOT EXISTS founder_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    vesting_schedule VARCHAR(50) DEFAULT 'standard_4yr_1yr',
    cliff_months INTEGER DEFAULT 12,
    acceleration_clause VARCHAR(50) DEFAULT 'single_trigger',
    ip_assignment BOOLEAN DEFAULT TRUE,
    non_compete BOOLEAN DEFAULT FALSE,
    decision_making VARCHAR(50) DEFAULT 'equal',
    dispute_resolution VARCHAR(50) DEFAULT 'mediation',
    signed_by_founder BOOLEAN DEFAULT FALSE,
    signed_by_all BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id)
);

CREATE INDEX IF NOT EXISTS idx_founder_agreements_app ON founder_agreements(app_id);

ALTER TABLE founder_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App owners manage founder agreement" ON founder_agreements FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = founder_agreements.app_id));

CREATE POLICY "Co-owners view founder agreement" ON founder_agreements FOR SELECT
    USING (
        auth.uid() IN (SELECT seller_id FROM listings WHERE id = founder_agreements.app_id)
        OR auth.uid() IN (SELECT user_id FROM app_coowners WHERE app_id = founder_agreements.app_id AND status = 'accepted')
    );

-- ═══════════════════════════════════════════════════════════════
-- SECTION 13: EXTENDED TRIGGERS & FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trigger_legal_entities_updated_at
    BEFORE UPDATE ON legal_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_founder_agreements_updated_at
    BEFORE UPDATE ON founder_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION set_cofounder_joined_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        NEW.joined_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cofounder_joined_at
    BEFORE UPDATE OF status ON app_coowners
    FOR EACH ROW EXECUTE FUNCTION set_cofounder_joined_at();

CREATE OR REPLACE FUNCTION create_cofounder_from_split()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'proposed' THEN
        INSERT INTO app_coowners (app_id, user_id, role, equity_pct, status, invited_by, joined_at)
        VALUES (NEW.app_id, NEW.user_id, NEW.role_offered, NEW.proposed_pct, 'accepted', NEW.offered_by, NOW())
        ON CONFLICT (app_id, user_id) DO UPDATE
        SET equity_pct = EXCLUDED.equity_pct, status = 'accepted', joined_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cofounder_from_split
    AFTER UPDATE OF status ON equity_splits
    FOR EACH ROW EXECUTE FUNCTION create_cofounder_from_split();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 14: EXTENDED HELPER VIEWS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW app_ownership_summary AS
SELECT
    l.id as app_id,
    l.name as app_name,
    l.seller_id as founder_id,
    up.full_name as founder_name,
    (SELECT COUNT(*) FROM app_coowners WHERE app_id = l.id AND status = 'accepted') as cofounder_count,
    (SELECT COALESCE(SUM(equity_pct), 0) FROM app_coowners WHERE app_id = l.id AND status = 'accepted') as cofounder_equity_total,
    (SELECT COUNT(*) FROM equity_splits WHERE app_id = l.id AND status = 'proposed') as pending_offers,
    le.entity_type as legal_entity_type,
    le.status as legal_entity_status
FROM listings l
LEFT JOIN user_profiles up ON l.seller_id = up.id
LEFT JOIN legal_entities le ON l.id = le.app_id;

CREATE OR REPLACE VIEW user_equity_portfolio AS
SELECT
    cte.owner_id as user_id,
    cte.app_id,
    l.name as app_name,
    l.category as app_category,
    cte.owner_type,
    cte.equity_pct,
    cte.shares_count,
    cte.total_value,
    sc.class_name as share_class,
    aco.role as cofounder_role,
    aco.status as cofounder_status,
    aco.vesting_start,
    aco.cliff_date,
    aco.vesting_months,
    CASE
        WHEN aco.vesting_start IS NOT NULL AND aco.cliff_date IS NOT NULL AND NOW() < aco.cliff_date THEN 0
        WHEN aco.vesting_start IS NOT NULL AND aco.vesting_months > 0 THEN
            LEAST(100, ROUND(EXTRACT(EPOCH FROM (NOW() - aco.vesting_start)) / (aco.vesting_months * 30.44 * 24 * 3600) * 100, 2))
        ELSE 100
    END as vested_pct
FROM cap_table_entries cte
LEFT JOIN listings l ON cte.app_id = l.id
LEFT JOIN share_classes sc ON cte.share_class_id = sc.id
LEFT JOIN app_coowners aco ON cte.app_id = aco.app_id AND cte.owner_id = aco.user_id
WHERE cte.owner_id = auth.uid();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 15: ROLE-BASED ACCESS & SHAREHOLDER SYSTEM
-- ═══════════════════════════════════════════════════════════════

-- App members (who has access to which app with what role)
CREATE TABLE IF NOT EXISTS app_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'shareholder',
    equity_pct DECIMAL(5,2) DEFAULT 0,
    shares_owned DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    removed_at TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '{}'::jsonb,
    UNIQUE(app_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_app_members_app ON app_members(app_id);
CREATE INDEX IF NOT EXISTS idx_app_members_user ON app_members(user_id);
CREATE INDEX IF NOT EXISTS idx_app_members_role ON app_members(role);
CREATE INDEX IF NOT EXISTS idx_app_members_status ON app_members(status);

ALTER TABLE app_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view apps they are members of" ON app_members FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_members.app_id));

CREATE POLICY "App owners can manage members" ON app_members FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_members.app_id));

CREATE POLICY "Users can view their own membership" ON app_members FOR SELECT
    USING (auth.uid() = user_id);

-- App shareholder offers
CREATE TABLE IF NOT EXISTS app_shareholder_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    price_per_share DECIMAL(15,4) NOT NULL,
    min_shares INTEGER DEFAULT 1,
    max_shares INTEGER,
    total_available INTEGER,
    conditions TEXT,
    terms_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shareholder_offers_app ON app_shareholder_offers(app_id);
CREATE INDEX IF NOT EXISTS idx_shareholder_offers_active ON app_shareholder_offers(is_active);

ALTER TABLE app_shareholder_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers" ON app_shareholder_offers FOR SELECT
    USING (is_active = true);

CREATE POLICY "App owners manage offers" ON app_shareholder_offers FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_shareholder_offers.app_id));

-- App documents (legal agreements, uploaded once)
CREATE TABLE IF NOT EXISTS app_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_confidential BOOLEAN DEFAULT false,
    visible_to VARCHAR(50) DEFAULT 'all',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_documents_app ON app_documents(app_id);
CREATE INDEX IF NOT EXISTS idx_app_documents_visible ON app_documents(visible_to);

ALTER TABLE app_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public documents" ON app_documents FOR SELECT
    USING (visible_to = 'all');

CREATE POLICY "Members can view shareholder documents" ON app_documents FOR SELECT
    USING (visible_to = 'shareholders_only' AND auth.uid() IN (SELECT user_id FROM app_members WHERE app_id = app_documents.app_id AND status = 'active'));

CREATE POLICY "App owners manage documents" ON app_documents FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_documents.app_id));

-- Shareholder requests/applications
CREATE TABLE IF NOT EXISTS app_shareholder_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES app_shareholder_offers(id) ON DELETE SET NULL,
    shares_requested INTEGER NOT NULL,
    total_investment DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending',
    message TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shareholder_requests_app ON app_shareholder_requests(app_id);
CREATE INDEX IF NOT EXISTS idx_shareholder_requests_user ON app_shareholder_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_shareholder_requests_status ON app_shareholder_requests(status);

ALTER TABLE app_shareholder_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON app_shareholder_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "App owners can view all requests" ON app_shareholder_requests FOR SELECT
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_shareholder_requests.app_id));

CREATE POLICY "Users can create requests" ON app_shareholder_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "App owners can update requests" ON app_shareholder_requests FOR UPDATE
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = app_shareholder_requests.app_id));

-- Audit log for app activities
CREATE TABLE IF NOT EXISTS app_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_app ON app_audit_log(app_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON app_audit_log(created_at DESC);

ALTER TABLE app_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view audit log" ON app_audit_log FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM app_members WHERE app_id = app_audit_log.app_id AND status = 'active'));

-- Auto-create owner membership when listing is created
CREATE OR REPLACE FUNCTION create_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO app_members (app_id, user_id, role, equity_pct, status)
    VALUES (NEW.id, NEW.seller_id, 'owner', 100, 'active')
    ON CONFLICT (app_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_owner_membership ON listings;
CREATE TRIGGER trigger_create_owner_membership
    AFTER INSERT ON listings
    FOR EACH ROW EXECUTE FUNCTION create_owner_membership();

-- Auto-log member changes
CREATE OR REPLACE FUNCTION log_member_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO app_audit_log (app_id, user_id, action, details)
        VALUES (NEW.app_id, NEW.user_id, 'member_added', jsonb_build_object('role', NEW.role, 'equity_pct', NEW.equity_pct));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO app_audit_log (app_id, user_id, action, details)
            VALUES (NEW.app_id, NEW.user_id, 'member_status_changed', jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        END IF;
        IF OLD.equity_pct != NEW.equity_pct THEN
            INSERT INTO app_audit_log (app_id, NEW.user_id, action, details)
            VALUES (NEW.app_id, NEW.user_id, 'equity_changed', jsonb_build_object('old_pct', OLD.equity_pct, 'new_pct', NEW.equity_pct));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO app_audit_log (app_id, OLD.user_id, action, details)
        VALUES (OLD.app_id, OLD.user_id, 'member_removed', jsonb_build_object('role', OLD.role));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_member_change ON app_members;
CREATE TRIGGER trigger_log_member_change
    AFTER INSERT OR UPDATE OR DELETE ON app_members
    FOR EACH ROW EXECUTE FUNCTION log_member_change();

-- Update owner equity when new members are added
CREATE OR REPLACE FUNCTION update_owner_equity()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    remaining_equity DECIMAL(5,2);
BEGIN
    SELECT seller_id INTO owner_id FROM listings WHERE id = NEW.app_id;
    
    SELECT COALESCE(SUM(equity_pct), 0) INTO remaining_equity
    FROM app_members 
    WHERE app_id = NEW.app_id AND user_id != owner_id AND status = 'active';
    
    UPDATE app_members 
    SET equity_pct = GREATEST(0, 100 - remaining_equity)
    WHERE app_id = NEW.app_id AND user_id = owner_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_owner_equity ON app_members;
CREATE TRIGGER trigger_update_owner_equity
    AFTER INSERT OR UPDATE OF equity_pct ON app_members
    FOR EACH ROW EXECUTE FUNCTION update_owner_equity();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 15B: CANONICAL APP WORKSPACES
-- ═══════════════════════════════════════════════════════════════
-- app_workspaces is the canonical application/workspace record.
-- app_workspace_members is the canonical workspace access table.
-- listings are optional marketplace publications of a workspace.
-- app_members and app_coowners remain legacy listing/shareholder/cofounder
-- compatibility tables until product flows are migrated.

CREATE TABLE IF NOT EXISTS app_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    category VARCHAR(100),
    description TEXT,
    icon_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    source_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    listing_id UUID UNIQUE REFERENCES listings(id) ON DELETE SET NULL,
    source_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
    imported_store_app_id UUID,
    setup_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT app_workspaces_status_check CHECK (status IN ('draft', 'setup', 'active', 'paused', 'archived', 'deleted')),
    CONSTRAINT app_workspaces_source_type_check CHECK (source_type IN ('manual', 'store_import', 'idea_generated', 'marketplace_listing'))
);

CREATE INDEX IF NOT EXISTS idx_app_workspaces_owner ON app_workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_status ON app_workspaces(status);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_listing ON app_workspaces(listing_id);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_source_idea ON app_workspaces(source_idea_id);
CREATE INDEX IF NOT EXISTS idx_app_workspaces_imported_store_app ON app_workspaces(imported_store_app_id);

CREATE TABLE IF NOT EXISTS imported_store_apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    rating DECIMAL(3,2),
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
    UNIQUE(owner_id, provider, external_app_id),
    UNIQUE(owner_id, store_url)
);

CREATE INDEX IF NOT EXISTS idx_imported_store_apps_owner ON imported_store_apps(owner_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_apps_provider_external ON imported_store_apps(provider, external_app_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_apps_bundle ON imported_store_apps(bundle_id);
CREATE INDEX IF NOT EXISTS idx_imported_store_apps_package ON imported_store_apps(package_name);

ALTER TABLE app_workspaces
    DROP CONSTRAINT IF EXISTS app_workspaces_imported_store_app_id_fkey;

ALTER TABLE app_workspaces
    ADD CONSTRAINT app_workspaces_imported_store_app_id_fkey
    FOREIGN KEY (imported_store_app_id) REFERENCES imported_store_apps(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS app_workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES app_workspaces(id) ON DELETE CASCADE,
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
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_app_workspace_members_workspace ON app_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_user ON app_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_role ON app_workspace_members(role);
CREATE INDEX IF NOT EXISTS idx_app_workspace_members_status ON app_workspace_members(status);

CREATE TABLE IF NOT EXISTS app_workspace_setup (
    workspace_id UUID PRIMARY KEY REFERENCES app_workspaces(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS app_workspace_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash TEXT,
    workspace_id UUID REFERENCES app_workspaces(id) ON DELETE SET NULL,
    response JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'started',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    CONSTRAINT app_workspace_idempotency_status_check CHECK (status IN ('started', 'succeeded', 'failed')),
    UNIQUE(user_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_app_workspace_idempotency_user_operation ON app_workspace_idempotency_keys(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_app_workspace_idempotency_workspace ON app_workspace_idempotency_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_idempotency_expires ON app_workspace_idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS app_workspace_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES app_workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    subject_type VARCHAR(80),
    subject_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_workspace ON app_workspace_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_actor ON app_workspace_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_action ON app_workspace_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_app_workspace_audit_log_created ON app_workspace_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION is_platform_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'support')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_app_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM app_workspace_members
        WHERE workspace_id = target_workspace_id
          AND user_id = auth.uid()
          AND status = 'active'
    ) OR is_platform_staff();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_manage_app_workspace(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM app_workspace_members
        WHERE workspace_id = target_workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'cofounder', 'admin')
          AND status = 'active'
    ) OR is_platform_staff();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE app_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_store_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_workspace_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_workspace_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_workspace_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view workspaces" ON app_workspaces;
CREATE POLICY "Workspace members can view workspaces" ON app_workspaces FOR SELECT
    USING (is_app_workspace_member(id));

DROP POLICY IF EXISTS "Users can create owned workspaces" ON app_workspaces;
CREATE POLICY "Users can create owned workspaces" ON app_workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Workspace managers can update workspaces" ON app_workspaces;
CREATE POLICY "Workspace managers can update workspaces" ON app_workspaces FOR UPDATE
    USING (can_manage_app_workspace(id))
    WITH CHECK (can_manage_app_workspace(id));

DROP POLICY IF EXISTS "Workspace owners can archive workspaces" ON app_workspaces;
CREATE POLICY "Workspace owners can archive workspaces" ON app_workspaces FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM app_workspace_members
            WHERE workspace_id = app_workspaces.id
              AND user_id = auth.uid()
              AND role = 'owner'
              AND status = 'active'
        )
        OR is_platform_staff()
    );

DROP POLICY IF EXISTS "Users can manage their imported store apps" ON imported_store_apps;
CREATE POLICY "Users can manage their imported store apps" ON imported_store_apps FOR ALL
    USING (auth.uid() = owner_id OR is_platform_staff())
    WITH CHECK (auth.uid() = owner_id OR is_platform_staff());

DROP POLICY IF EXISTS "Workspace members can view membership" ON app_workspace_members;
CREATE POLICY "Workspace members can view membership" ON app_workspace_members FOR SELECT
    USING (is_app_workspace_member(workspace_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Workspace managers can insert members" ON app_workspace_members;
CREATE POLICY "Workspace managers can insert members" ON app_workspace_members FOR INSERT
    WITH CHECK (can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can update members" ON app_workspace_members;
CREATE POLICY "Workspace managers can update members" ON app_workspace_members FOR UPDATE
    USING (can_manage_app_workspace(workspace_id))
    WITH CHECK (can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can remove members" ON app_workspace_members;
CREATE POLICY "Workspace managers can remove members" ON app_workspace_members FOR DELETE
    USING (can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Workspace members can view setup" ON app_workspace_setup;
CREATE POLICY "Workspace members can view setup" ON app_workspace_setup FOR SELECT
    USING (is_app_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can manage setup" ON app_workspace_setup;
CREATE POLICY "Workspace managers can manage setup" ON app_workspace_setup FOR ALL
    USING (can_manage_app_workspace(workspace_id))
    WITH CHECK (can_manage_app_workspace(workspace_id));

DROP POLICY IF EXISTS "Users can manage their idempotency keys" ON app_workspace_idempotency_keys;
CREATE POLICY "Users can manage their idempotency keys" ON app_workspace_idempotency_keys FOR ALL
    USING (auth.uid() = user_id OR is_platform_staff())
    WITH CHECK (auth.uid() = user_id OR is_platform_staff());

DROP POLICY IF EXISTS "Workspace members can view workspace audit log" ON app_workspace_audit_log;
CREATE POLICY "Workspace members can view workspace audit log" ON app_workspace_audit_log FOR SELECT
    USING (
        workspace_id IS NOT NULL
        AND is_app_workspace_member(workspace_id)
    );

DROP POLICY IF EXISTS "Workspace managers can insert workspace audit log" ON app_workspace_audit_log;
CREATE POLICY "Workspace managers can insert workspace audit log" ON app_workspace_audit_log FOR INSERT
    WITH CHECK (
        can_manage_app_workspace(workspace_id)
        OR is_platform_staff()
    );

CREATE OR REPLACE FUNCTION create_workspace_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO app_workspace_members (workspace_id, user_id, role, status, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = 'owner',
        status = 'active',
        removed_at = NULL,
        updated_at = NOW();

    INSERT INTO app_workspace_setup (workspace_id, updated_by)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT (workspace_id) DO NOTHING;

    INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
    VALUES (
        NEW.id,
        NEW.created_by,
        'workspace_created',
        'app_workspace',
        NEW.id,
        jsonb_build_object('source_type', NEW.source_type, 'listing_id', NEW.listing_id, 'source_idea_id', NEW.source_idea_id)
    );

    IF NEW.imported_store_app_id IS NOT NULL THEN
        INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_workspace_owner_membership ON app_workspaces;
CREATE TRIGGER trigger_create_workspace_owner_membership
    AFTER INSERT ON app_workspaces
    FOR EACH ROW EXECUTE FUNCTION create_workspace_owner_membership();

CREATE OR REPLACE FUNCTION log_workspace_member_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
        VALUES (NEW.workspace_id, COALESCE(NEW.invited_by, auth.uid(), NEW.user_id), 'member_added', 'app_workspace_member', NEW.id, jsonb_build_object('role', NEW.role, 'status', NEW.status));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
            VALUES (NEW.workspace_id, auth.uid(), 'role_changed', 'app_workspace_member', NEW.id, jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
        END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
            VALUES (NEW.workspace_id, auth.uid(), 'member_status_changed', 'app_workspace_member', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
        VALUES (OLD.workspace_id, auth.uid(), 'member_removed', 'app_workspace_member', OLD.id, jsonb_build_object('role', OLD.role, 'status', OLD.status));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_log_workspace_member_change ON app_workspace_members;
CREATE TRIGGER trigger_log_workspace_member_change
    AFTER INSERT OR UPDATE OR DELETE ON app_workspace_members
    FOR EACH ROW EXECUTE FUNCTION log_workspace_member_change();

CREATE OR REPLACE FUNCTION log_workspace_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.onboarding_completed_at IS NULL AND NEW.onboarding_completed_at IS NOT NULL THEN
        INSERT INTO app_workspace_audit_log (workspace_id, actor_id, action, subject_type, subject_id, details)
        VALUES (NEW.id, auth.uid(), 'onboarding_completed', 'app_workspace', NEW.id, jsonb_build_object('completed_at', NEW.onboarding_completed_at));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_log_workspace_onboarding_completion ON app_workspaces;
CREATE TRIGGER trigger_log_workspace_onboarding_completion
    AFTER UPDATE OF onboarding_completed_at ON app_workspaces
    FOR EACH ROW EXECUTE FUNCTION log_workspace_onboarding_completion();

CREATE OR REPLACE FUNCTION update_app_workspace_setup_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_app_workspaces_updated_at ON app_workspaces;
CREATE TRIGGER trigger_app_workspaces_updated_at
    BEFORE UPDATE ON app_workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_imported_store_apps_updated_at ON imported_store_apps;
CREATE TRIGGER trigger_imported_store_apps_updated_at
    BEFORE UPDATE ON imported_store_apps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_app_workspace_members_updated_at ON app_workspace_members;
CREATE TRIGGER trigger_app_workspace_members_updated_at
    BEFORE UPDATE ON app_workspace_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_app_workspace_setup_updated_at ON app_workspace_setup;
CREATE TRIGGER trigger_app_workspace_setup_updated_at
    BEFORE UPDATE ON app_workspace_setup
    FOR EACH ROW EXECUTE FUNCTION update_app_workspace_setup_timestamp();

DROP TRIGGER IF EXISTS trigger_app_workspace_idempotency_updated_at ON app_workspace_idempotency_keys;
CREATE TRIGGER trigger_app_workspace_idempotency_updated_at
    BEFORE UPDATE ON app_workspace_idempotency_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 16: LEGAL LICENSE SYSTEM
-- ═══════════════════════════════════════════════════════════════

-- License types catalog
CREATE TABLE IF NOT EXISTS license_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'NG',
    issuing_authority VARCHAR(255),
    is_featured BOOLEAN DEFAULT false,
    requirements TEXT,
    estimated_duration VARCHAR(100),
    estimated_cost VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_types_country ON license_types(country);
CREATE INDEX IF NOT EXISTS idx_license_types_category ON license_types(category);
CREATE INDEX IF NOT EXISTS idx_license_types_featured ON license_types(is_featured);

ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active license types" ON license_types FOR SELECT
    USING (is_active = true);

-- User license applications
CREATE TABLE IF NOT EXISTS user_license_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_type_id UUID NOT NULL REFERENCES license_types(id) ON DELETE CASCADE,
    country VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    application_data JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approval_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_applications_user ON user_license_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_license_applications_license ON user_license_applications(license_type_id);
CREATE INDEX IF NOT EXISTS idx_license_applications_status ON user_license_applications(status);

ALTER TABLE user_license_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications" ON user_license_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON user_license_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" ON user_license_applications FOR UPDATE
    USING (auth.uid() = user_id);

-- Application documents
CREATE TABLE IF NOT EXISTS application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES user_license_applications(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_documents_app ON application_documents(application_id);

ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents for their applications" ON application_documents FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM user_license_applications WHERE id = application_documents.application_id));

CREATE POLICY "Users can upload documents" ON application_documents FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM user_license_applications WHERE id = application_documents.application_id));

-- Auto-update timestamp trigger
CREATE TRIGGER trigger_license_applications_updated_at
    BEFORE UPDATE ON user_license_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed featured license types
INSERT INTO license_types (code, name, description, category, country, issuing_authority, is_featured, requirements, estimated_duration, estimated_cost) VALUES

-- NIGERIA: CBN Licenses
('CBN_MFB', 'Microfinance Bank License', 'License to operate a microfinance banking institution in Nigeria. Allows deposit-taking, lending, and financial services to low-income individuals and small businesses.', 'Financial Services', 'NG', 'Central Bank of Nigeria (CBN)', true, 'Minimum paid-up capital, fit and proper persons, business plan, compliance framework, IT infrastructure, office space.', '6-12 months', '₦50M - ₦200M'),

('CBN_PSP', 'Payment Service Provider License', 'License for companies providing payment processing, money transfer, mobile money, and digital payment services in Nigeria.', 'Financial Services', 'NG', 'Central Bank of Nigeria (CBN)', true, 'Paid-up capital, technical infrastructure, KYC/AML compliance, data security, risk management framework.', '4-8 months', '₦100M - ₦2B'),

('CBN_SWITCH', 'Switching and Processing License', 'License for operating payment switching and processing infrastructure in Nigeria.', 'Financial Services', 'NG', 'Central Bank of Nigeria (CBN)', false, 'Minimum capital of ₦2.5B, ISO 27001 certification, disaster recovery, network infrastructure.', '6-12 months', '₦2.5B+'),

('CBN_SS', 'Super Agent License', 'License for organizations acting as aggregators of agency banking services across Nigeria.', 'Financial Services', 'NG', 'Central Bank of Nigeria (CBN)', false, 'Minimum capital, network of agents, compliance framework, reporting systems.', '3-6 months', '₦500M+'),

-- NIGERIA: NDIC
('NDIC_REG', 'NDIC Registration', 'Mandatory registration with Nigeria Deposit Insurance Corporation for all deposit-taking institutions.', 'Insurance', 'NG', 'Nigeria Deposit Insurance Corporation (NDIC)', true, 'Deposit-taking license, corporate registration, compliance framework, financial records.', '2-4 months', 'Based on deposit size'),

-- NIGERIA: CAC Registration
('CAC_BN', 'Business Name Registration', 'Registration of a business name for sole proprietorships and partnerships with CAC.', 'Corporate', 'NG', 'Corporate Affairs Commission (CAC)', true, 'Proposed business name, address details, nature of business, director/partner information.', '1-4 weeks', '₦10,000 - ₦20,000'),

('CAC_LTD', 'Limited Liability Company Registration', 'Incorporation of a private or public limited liability company with CAC.', 'Corporate', 'NG', 'Corporate Affairs Commission (CAC)', true, 'Memorandum and Articles of Association, director details, share capital, registered address.', '1-6 weeks', '₦15,000 - ₦50,000+'),

('CAC_INCORP', 'Incorporated Trustees', 'Registration of non-profit organizations, foundations, and associations.', 'Corporate', 'NG', 'Corporate Affairs Commission (CAC)', false, 'Constitution, trustees details, objectives, application letter, newspaper publication.', '2-3 months', '₦50,000 - ₦100,000'),

-- NIGERIA: NDPR Compliance
('NDPR_COMP', 'NDPR Compliance Certification', 'Nigeria Data Protection Regulation compliance certification for organizations processing personal data.', 'Data Protection', 'NG', 'National Information Technology Development Agency (NITDA)', true, 'Data audit, privacy policy, DPO appointment, data protection impact assessment, staff training.', '1-3 months', '₦500,000 - ₦5M'),

('NDPR_AUDIT', 'NDPR Annual Audit', 'Mandatory annual data protection audit for organizations processing significant personal data.', 'Data Protection', 'NG', 'NITDA', false, 'Engagement of licensed Data Protection Compliance Organization (DPCO), audit report filing.', '1-2 months', '₦300,000 - ₦3M'),

-- NIGERIA: SEC
('SEC_CROWDFUND', 'SEC Crowdfunding Portal License', 'License to operate a crowdfunding portal connecting investors with businesses seeking capital.', 'Securities', 'NG', 'Securities and Exchange Commission (SEC)', true, 'Minimum capital of ₦100M, IT infrastructure, compliance officer, investor protection framework.', '4-8 months', '₦100M+'),

('SEC_FUND_MGR', 'Fund/Portfolio Management License', 'License for managing investment funds and portfolios on behalf of clients.', 'Securities', 'NG', 'Securities and Exchange Commission (SEC)', false, 'Minimum capital, qualified staff, compliance framework, custodian arrangement.', '4-6 months', '₦150M - ₦500M'),

('SEC_INVEST_ADVISOR', 'Investment Advisory License', 'License for providing investment advice and recommendations to clients.', 'Securities', 'NG', 'Securities and Exchange Commission (SEC)', false, 'Minimum capital, qualified investment advisors, compliance framework.', '3-6 months', '₦30M - ₦50M'),

-- NIGERIA: FCCPC
('FCCPC_APPROVED', 'FCCPC Consumer Protection Registration', 'Registration with Federal Competition and Consumer Protection Commission for business operations.', 'Consumer Protection', 'NG', 'Federal Competition and Consumer Protection Commission (FCCPC)', true, 'Business registration, terms of service, refund policy, consumer complaints handling process.', '2-4 weeks', '₦50,000 - ₦200,000'),

-- NIGERIA: NCC
('NCC_VAS', 'Value Added Services License', 'License for providing value-added telecom services (content, messaging, VoIP).', 'Telecommunications', 'NG', 'Nigerian Communications Commission (NCC)', false, 'Technical infrastructure, spectrum allocation (if applicable), service level agreements.', '3-6 months', '₦10M - ₦50M'),

('NCC_ISP', 'Internet Service Provider License', 'License for operating internet service provision in Nigeria.', 'Telecommunications', 'NG', 'Nigerian Communications Commission (NCC)', false, 'Network infrastructure, technical capacity, interconnection agreements, frequency spectrum.', '4-8 months', '₦50M - ₦150M'),

-- NIGERIA: NAFDAC
('NAFDAC_PRODUCT', 'NAFDAC Product Registration', 'Registration of food, drug, cosmetic, medical device, or packaged water products.', 'Health & Safety', 'NG', 'National Agency for Food and Drug Administration and Control (NAFDAC)', false, 'Product formulation, lab test results, GMP certification, product samples, labeling.', '2-6 months', '₦100,000 - ₦500,000+'),

('NAFDAC_MANUF', 'NAFDAC Manufacturing License', 'License for manufacturing regulated products (food, drugs, cosmetics).', 'Health & Safety', 'NG', 'NAFDAC', false, 'GMP compliance, facility inspection, quality control systems, environmental impact assessment.', '3-6 months', '₦500,000 - ₦2M'),

-- NIGERIA: SON
('SON_MANCAP', 'SON MANCAP Certification', 'Mandatory conformity assessment for locally manufactured products.', 'Standards', 'NG', 'Standards Organisation of Nigeria (SON)', false, 'Product testing, factory inspection, quality management system, product samples.', '1-3 months', '₦100,000 - ₦500,000'),

('SON_CAP', 'SON CAP (Product Certificate)', 'Certification for imported products to ensure compliance with Nigerian standards.', 'Standards', 'NG', 'Standards Organisation of Nigeria (SON)', false, 'Product testing abroad, SONCAP certificate from accredited body, product documentation.', '2-4 weeks', '₦50,000 - ₦200,000'),

-- NIGERIA: FIRS
('FIRS_TIN', 'FIRS Tax Identification Number', 'Registration for Tax Identification Number required for all business operations.', 'Tax', 'NG', 'Federal Inland Revenue Service (FIRS)', false, 'CAC registration certificate, director BVN/NIN, business address, bank details.', '1-2 weeks', 'Free'),

('FIRS_VAT', 'FIRS VAT Registration', 'Registration for Value Added Tax collection and remittance.', 'Tax', 'NG', 'Federal Inland Revenue Service (FIRS)', false, 'TIN certificate, business registration, bank account details.', '1-2 weeks', 'Free'),

-- NIGERIA: PENCOM
('PENCOM_PENAL', 'PenCom Pension Fund Administrator License', 'License for administering pension funds and contributions.', 'Pension', 'NG', 'National Pension Commission (PENCOM)', false, 'Minimum capital of ₦5B, qualified staff, IT systems, compliance framework.', '6-12 months', '₦5B+'),

('PENCOM_PFM', 'PenCom Pension Fund Manager License', 'License for managing pension fund investments.', 'Pension', 'NG', 'National Pension Commission (PENCOM)', false, 'Minimum capital of ₦5B, investment expertise, compliance framework.', '6-12 months', '₦5B+'),

-- NIGERIA: NAICOM
('NAICOM_INSUR', 'NAICOM Insurance License', 'License for operating insurance business in Nigeria.', 'Insurance', 'NG', 'National Insurance Commission (NAICOM)', false, 'Minimum capital, reinsurance arrangements, qualified actuaries, compliance framework.', '6-12 months', '₦2B - ₦10B'),

-- NIGERIA: NIMASA
('NIMASA_REG', 'NIMASA Registration', 'Registration with Nigerian Maritime Administration and Safety Agency for maritime operations.', 'Maritime', 'NG', 'Nigerian Maritime Administration and Safety Agency (NIMASA)', false, 'Vessel documentation, crew certification, safety management system, insurance.', '1-3 months', 'Varies by operation'),

-- NIGERIA: NLRC
('NLRC_REG', 'NLRC Registration', 'Registration with Nigerian Labour Relations Commission for employers.', 'Employment', 'NG', 'Nigeria Labour Relations Commission', false, 'Employee records, employment contracts, workplace policies, registration fee.', '2-4 weeks', '₦50,000 - ₦200,000'),

-- NIGERIA: IT Related
('NITDA_DATA_CENTER', 'NITDA Data Center License', 'License for operating data center facilities in Nigeria.', 'Technology', 'NG', 'NITDA', false, 'Facility standards, security infrastructure, power redundancy, compliance framework.', '3-6 months', '₦10M - ₦50M'),

('NITDA_CLOUD', 'NITDA Cloud Service Provider License', 'License for providing cloud computing services in Nigeria.', 'Technology', 'NG', 'NITDA', false, 'Data sovereignty compliance, security certifications, SLA framework, NDPR compliance.', '3-6 months', '₦5M - ₦20M'),

-- INTERNATIONAL: US
('US_SEC_REG', 'SEC Investment Advisor Registration (USA)', 'Registration with US Securities and Exchange Commission as an investment advisor.', 'Securities', 'US', 'U.S. Securities and Exchange Commission (SEC)', false, 'Form ADV filing, compliance policies, qualified personnel, minimum capital requirements.', '3-6 months', '$100,000+'),

('US_PSP', 'Money Transmitter License (USA)', 'State-level license for money transmission and payment processing services.', 'Financial Services', 'US', 'State Financial Regulators', false, 'Surety bond, net worth requirement, AML program, background checks, compliance officer.', '3-12 months', '$500,000+ per state'),

('US_BSA', 'FinCEN MSB Registration (USA)', 'Registration with Financial Crimes Enforcement Network as Money Services Business.', 'Financial Services', 'US', 'Financial Crimes Enforcement Network (FinCEN)', true, 'AML program, registration filing, reporting systems, compliance framework.', '2-4 weeks', 'Free'),

('US_DPO', 'State Privacy License (USA)', 'State-level data privacy and protection registration.', 'Data Protection', 'US', 'State Attorneys General', false, 'Privacy policy, data handling practices, DPO appointment, breach notification process.', '1-4 weeks', 'Varies by state'),

-- INTERNATIONAL: UK
('UK_FCA_PSP', 'FCA Payment Institution License (UK)', 'Authorization from Financial Conduct Authority for payment services.', 'Financial Services', 'UK', 'Financial Conduct Authority (FCA)', true, 'Minimum capital, safeguarding arrangements, governance framework, AML compliance.', '6-12 months', '£50,000 - £730,000'),

('UK_FCA_EMI', 'FCA Electronic Money Institution License (UK)', 'Authorization for issuing electronic money and providing payment services.', 'Financial Services', 'UK', 'Financial Conduct Authority (FCA)', false, 'Initial capital of €350,000, governance, safeguarding, AML/KYC systems.', '6-12 months', '€350,000+'),

('UK_FCA_CRYPTO', 'FCA Crypto Asset Registration (UK)', 'Registration for crypto asset business activities under UK regulations.', 'Cryptocurrency', 'UK', 'Financial Conduct Authority (FCA)', false, 'AML/CTF policies, systems and controls, fit and proper persons, financial crime risk assessment.', '6-12 months', '£5,000 - £25,000'),

('UK_ICO', 'UK ICO Data Protection Registration', 'Registration with Information Commissioner Office for data processing activities.', 'Data Protection', 'UK', 'Information Commissioner''s Office (ICO)', true, 'Data processing activities description, DPO appointment (if required), privacy notices.', '2-4 weeks', '£40 - £2,900/year'),

-- INTERNATIONAL: EU
('EU_PSD2', 'EU PSD2 Payment Institution License', 'License for payment services across the European Economic Area.', 'Financial Services', 'EU', 'National Competent Authority', true, 'Initial capital, governance, operational risk management, AML compliance, PSD2 compliance.', '6-12 months', '€125,000 - €730,000'),

('EU_GDPR', 'EU GDPR Compliance Certification', 'General Data Protection Regulation compliance for organizations processing EU data.', 'Data Protection', 'EU', 'Supervisory Authority', true, 'Data mapping, DPIA, DPO appointment, privacy notices, consent management, breach procedures.', '1-6 months', '€5,000 - €50,000'),

('EU_MICA', 'EU MiCA Crypto Asset License', 'Markets in Crypto-Assets Regulation license for crypto service providers in the EU.', 'Cryptocurrency', 'EU', 'National Competent Authority', false, 'White paper, governance, safeguarding of client funds, AML compliance, consumer protection.', '6-18 months', '€125,000+'),

-- INTERNATIONAL: GENERAL
('GENERAL_KYC', 'KYC/AML Compliance Framework', 'Implementation of Know Your Customer and Anti-Money Laundering compliance framework.', 'Compliance', 'GLOBAL', 'Various', false, 'Customer identification procedures, transaction monitoring, reporting systems, staff training.', '1-3 months', 'Varies'),

('GENERAL_ISO27001', 'ISO 27001 Certification', 'Information Security Management System certification.', 'Technology', 'GLOBAL', 'Accredited Certification Body', false, 'ISMS documentation, risk assessment, security controls, internal audit, management review.', '6-12 months', '$10,000 - $50,000'),

('GENERAL_PCI_DSS', 'PCI DSS Compliance', 'Payment Card Industry Data Security Standard for card payment processing.', 'Financial Services', 'GLOBAL', 'PCI Security Standards Council', false, 'Network security, encryption, access controls, vulnerability management, regular testing.', '3-6 months', 'Varies by level'),

('GENERAL_SOC2', 'SOC 2 Type II Certification', 'Service Organization Control 2 audit for security, availability, and confidentiality.', 'Technology', 'GLOBAL', 'AICPA-accredited CPA firm', false, 'Security controls documentation, monitoring systems, audit readiness, remediation.', '6-12 months', '$20,000 - $80,000');


-- ---------------------------------------------------------------
-- SECTION 17: ADMIN LICENSE FEE MANAGEMENT
-- ---------------------------------------------------------------

-- Admin-controlled application fees (overrides license estimated_cost)
CREATE TABLE IF NOT EXISTS admin_license_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_type_id UUID NOT NULL REFERENCES license_types(id) ON DELETE CASCADE,
    application_fee DECIMAL(15,2) DEFAULT 0,
    processing_fee DECIMAL(15,2) DEFAULT 0,
    total_fee DECIMAL(15,2) GENERATED ALWAYS AS (application_fee + processing_fee) STORED,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(license_type_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_fees_license ON admin_license_fees(license_type_id);
CREATE INDEX IF NOT EXISTS idx_admin_fees_active ON admin_license_fees(is_active);

ALTER TABLE admin_license_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fees" ON admin_license_fees FOR SELECT
    USING (is_active = true);

-- Only admins can manage fees (using app_members role='owner' as proxy for admin)
CREATE POLICY "App owners can manage fees" ON admin_license_fees FOR ALL
    USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id IN (SELECT app_id FROM app_members WHERE user_id = auth.uid() AND role = 'owner')));

-- Auto-update timestamp trigger
CREATE TRIGGER trigger_admin_fees_updated_at
    BEFORE UPDATE ON admin_license_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------
-- SECTION 18: FUNDING / OWNERSHIP / FINANCE PRODUCTION HARDENING
-- ---------------------------------------------------------------

ALTER TABLE crowdfunding_campaigns
    ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'NGN',
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS legal_ready BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS payout_ready BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ownership_ready BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS required_disclosures_complete BOOLEAN DEFAULT false;

ALTER TABLE investment_commitments
    ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE campaign_share_links
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commitments_idempotency
    ON investment_commitments(campaign_id, investor_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commitments_payment_reference
    ON investment_commitments(payment_provider, payment_reference)
    WHERE payment_provider IS NOT NULL AND payment_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_app ON crowdfunding_campaigns(app_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_idea ON crowdfunding_campaigns(idea_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_currency ON crowdfunding_campaigns(currency);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_status_allowed') THEN
        ALTER TABLE crowdfunding_campaigns
            ADD CONSTRAINT campaign_status_allowed
            CHECK (status IN ('draft', 'pending_review', 'active', 'funded', 'cancelled', 'expired', 'rejected')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_funding_bounds') THEN
        ALTER TABLE crowdfunding_campaigns
            ADD CONSTRAINT campaign_funding_bounds
            CHECK (
                funding_goal > 0
                AND funding_raised >= 0
                AND funding_raised <= funding_goal
                AND min_investment > 0
                AND (max_investment IS NULL OR max_investment >= min_investment)
                AND pre_money_valuation > 0
                AND equity_offered_pct > 0
                AND equity_offered_pct <= 49
                AND max_investors >= 1
            ) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commitment_amount_bounds') THEN
        ALTER TABLE investment_commitments
            ADD CONSTRAINT commitment_amount_bounds
            CHECK (amount > 0 AND stake_pct >= 0 AND stake_pct <= 100 AND valuation_at_commitment > 0) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cap_table_entry_bounds') THEN
        ALTER TABLE cap_table_entries
            ADD CONSTRAINT cap_table_entry_bounds
            CHECK (shares_count > 0 AND price_per_share >= 0 AND equity_pct >= 0 AND equity_pct <= 100) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'share_class_bounds') THEN
        ALTER TABLE share_classes
            ADD CONSTRAINT share_class_bounds
            CHECK (total_shares > 0 AND issued_shares >= 0 AND issued_shares <= total_shares) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'option_pool_bounds') THEN
        ALTER TABLE option_pool
            ADD CONSTRAINT option_pool_bounds
            CHECK (total_options >= 0 AND granted_options >= 0 AND granted_options <= total_options) NOT VALID;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    app_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES crowdfunding_campaigns(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_app ON audit_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_campaign ON audit_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own audit logs" ON audit_logs FOR SELECT
    USING (
        auth.uid() = actor_id
        OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = audit_logs.app_id)
        OR auth.uid() IN (SELECT owner_id FROM crowdfunding_campaigns WHERE id = audit_logs.campaign_id)
    );

CREATE TABLE IF NOT EXISTS campaign_watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_watchlists_user ON campaign_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_watchlists_campaign ON campaign_watchlists(campaign_id);

ALTER TABLE campaign_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their campaign watchlist" ON campaign_watchlists FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES crowdfunding_campaigns(id) ON DELETE SET NULL,
    commitment_id UUID REFERENCES investment_commitments(id) ON DELETE SET NULL,
    source VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_app ON finance_transactions(app_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_occurred ON finance_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view owned finance transactions" ON finance_transactions FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = finance_transactions.app_id)
        OR auth.uid() IN (SELECT user_id FROM app_members WHERE app_id = finance_transactions.app_id AND status = 'active')
    );

CREATE TABLE IF NOT EXISTS dividend_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    declared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_dividends_user ON dividend_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_dividends_app ON dividend_distributions(app_id);

ALTER TABLE dividend_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their dividends" ON dividend_distributions FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = dividend_distributions.app_id)
    );

CREATE TABLE IF NOT EXISTS finance_sync_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE finance_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their finance sync runs" ON finance_sync_runs FOR SELECT
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON campaign_watchlists TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON finance_transactions TO authenticated;
GRANT SELECT ON dividend_distributions TO authenticated;
GRANT SELECT ON finance_sync_runs TO authenticated;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
REVOKE ALL ON SCHEMA app_private FROM anon;
REVOKE ALL ON SCHEMA app_private FROM authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

CREATE OR REPLACE FUNCTION public.calculate_campaign_stake(
    p_campaign_id UUID,
    p_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
    c crowdfunding_campaigns%ROWTYPE;
    v_remaining DECIMAL;
    v_post_money DECIMAL;
    v_stake DECIMAL;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT * INTO c FROM crowdfunding_campaigns WHERE id = p_campaign_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;

    v_remaining := GREATEST(0, c.funding_goal - c.funding_raised);
    v_post_money := c.pre_money_valuation + p_amount;
    v_stake := CASE WHEN v_post_money > 0 THEN (p_amount / v_post_money) * 100 ELSE 0 END;

    IF c.status != 'active' THEN v_errors := array_append(v_errors, 'Campaign is not active'); END IF;
    IF p_amount < c.min_investment THEN v_errors := array_append(v_errors, 'Investment is below minimum'); END IF;
    IF c.max_investment IS NOT NULL AND p_amount > c.max_investment THEN v_errors := array_append(v_errors, 'Investment exceeds maximum'); END IF;
    IF p_amount > v_remaining THEN v_errors := array_append(v_errors, 'Investment would overfund campaign'); END IF;
    IF c.max_investors > 0 AND c.current_investor_count >= c.max_investors THEN v_errors := array_append(v_errors, 'Maximum investors reached'); END IF;

    RETURN jsonb_build_object(
        'amount', p_amount,
        'stakePct', v_stake,
        'stakePctFormatted', to_char(v_stake, 'FM999990.0000') || '%',
        'equityRemaining', GREATEST(0, c.equity_offered_pct - CASE WHEN c.funding_goal > 0 THEN (c.funding_raised / c.funding_goal) * c.equity_offered_pct ELSE 0 END),
        'fundingRemaining', v_remaining,
        'valuation', c.pre_money_valuation,
        'minInvestment', c.min_investment,
        'maxInvestment', c.max_investment,
        'isValid', array_length(v_errors, 1) IS NULL,
        'validationErrors', to_jsonb(v_errors)
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app_private.confirm_investment_commitment(
    p_commitment_id UUID,
    p_payment_provider VARCHAR,
    p_payment_reference VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_commitment investment_commitments%ROWTYPE;
    v_campaign crowdfunding_campaigns%ROWTYPE;
    v_app_id UUID;
BEGIN
    SELECT * INTO v_commitment
    FROM public.investment_commitments
    WHERE id = p_commitment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commitment not found';
    END IF;

    SELECT * INTO v_campaign
    FROM public.crowdfunding_campaigns
    WHERE id = v_commitment.campaign_id
    FOR UPDATE;

    IF v_commitment.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'idempotent', true, 'campaignId', v_campaign.id);
    END IF;

    IF v_campaign.status != 'active' THEN
        RAISE EXCEPTION 'Campaign is not active';
    END IF;
    IF v_campaign.funding_raised + v_commitment.amount > v_campaign.funding_goal THEN
        RAISE EXCEPTION 'Investment would overfund campaign';
    END IF;
    IF v_campaign.max_investors > 0 AND v_campaign.current_investor_count >= v_campaign.max_investors THEN
        RAISE EXCEPTION 'Maximum investors reached';
    END IF;

    UPDATE public.investment_commitments
    SET
        status = 'paid',
        paid_at = COALESCE(paid_at, NOW()),
        payment_provider = p_payment_provider,
        payment_reference = p_payment_reference
    WHERE id = p_commitment_id;

    v_app_id := v_campaign.app_id;
    IF v_app_id IS NOT NULL THEN
        INSERT INTO public.app_members (app_id, user_id, role, equity_pct, status, invited_by, joined_at)
        VALUES (v_app_id, v_commitment.investor_id, 'shareholder', v_commitment.stake_pct, 'active', v_campaign.owner_id, NOW())
        ON CONFLICT (app_id, user_id) DO UPDATE
        SET
            role = 'shareholder',
            equity_pct = public.app_members.equity_pct + EXCLUDED.equity_pct,
            status = 'active';

        INSERT INTO public.cap_table_entries (app_id, owner_id, owner_type, shares_count, equity_pct, price_per_share)
        VALUES (v_app_id, v_commitment.investor_id, 'investor', v_commitment.amount, v_commitment.stake_pct, 1)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.finance_transactions (user_id, app_id, campaign_id, commitment_id, source, transaction_type, amount, currency, metadata)
        VALUES (v_commitment.investor_id, v_app_id, v_campaign.id, v_commitment.id, 'crowdfunding', 'investment', v_commitment.amount, v_campaign.currency, jsonb_build_object('stakePct', v_commitment.stake_pct));
    END IF;

    INSERT INTO public.audit_logs (actor_id, app_id, campaign_id, entity_type, entity_id, action, metadata)
    VALUES (
        v_commitment.investor_id,
        v_app_id,
        v_campaign.id,
        'investment_commitment',
        v_commitment.id,
        'investment_confirmed',
        jsonb_build_object('amount', v_commitment.amount, 'paymentProvider', p_payment_provider, 'paymentReference', p_payment_reference)
    );

    RETURN jsonb_build_object('success', true, 'idempotent', false, 'campaignId', v_campaign.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION app_private.confirm_investment_commitment(UUID, VARCHAR, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.confirm_investment_commitment(UUID, VARCHAR, VARCHAR) FROM anon;
REVOKE ALL ON FUNCTION app_private.confirm_investment_commitment(UUID, VARCHAR, VARCHAR) FROM authenticated;
GRANT EXECUTE ON FUNCTION app_private.confirm_investment_commitment(UUID, VARCHAR, VARCHAR) TO service_role;

CREATE OR REPLACE FUNCTION enforce_campaign_publish_readiness()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status = 'draft' THEN
        IF NOT (NEW.legal_ready AND NEW.payout_ready AND NEW.ownership_ready AND NEW.required_disclosures_complete) THEN
            RAISE EXCEPTION 'Campaign cannot publish until legal, payout, ownership, and disclosures are ready';
        END IF;
        INSERT INTO audit_logs (actor_id, app_id, campaign_id, entity_type, entity_id, action)
        VALUES (auth.uid(), NEW.app_id, NEW.id, 'crowdfunding_campaign', NEW.id, 'campaign_published');
    END IF;

    IF NEW.status = 'cancelled' AND COALESCE(NEW.cancellation_reason, '') = '' THEN
        RAISE EXCEPTION 'Cancellation reason is required';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaign_publish_readiness ON crowdfunding_campaigns;
CREATE TRIGGER trigger_campaign_publish_readiness
    BEFORE UPDATE OF status ON crowdfunding_campaigns
    FOR EACH ROW EXECUTE FUNCTION enforce_campaign_publish_readiness();

