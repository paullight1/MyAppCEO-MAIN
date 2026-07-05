-- ═══════════════════════════════════════════════════════════════
-- MVPLAB Marketplace - Supabase Database Schema
-- Run this SQL to set up the backend for the marketplace
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- Listings Table (main marketplace listings)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    short_description TEXT,
    full_description TEXT,
    image_url TEXT,
    asking_price DECIMAL(15, 2),
    monthly_revenue DECIMAL(15, 2),
    revenue_verified BOOLEAN DEFAULT FALSE,
    listing_type VARCHAR(50) DEFAULT 'sale',
    status VARCHAR(50) DEFAULT 'active',
    views INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_monthly_revenue ON listings(monthly_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_listings_asking_price ON listings(asking_price DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);

-- Enable Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public read access - anyone can view active listings
CREATE POLICY "Public listings are viewable by everyone"
ON listings FOR SELECT
USING (status = 'active');

-- Sellers can insert their own listings
CREATE POLICY "Users can insert their own listings"
ON listings FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Users can update own listings"
ON listings FOR UPDATE
USING (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Users can delete own listings"
ON listings FOR DELETE
USING (auth.uid() = seller_id);

-- ═══════════════════════════════════════════════════════════════
-- Listing Views (track each view for analytics)
-- ═══════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════
-- Favorites / Watchlist (users saving listings)
-- ═══════════════════════════════════════════════════════════════
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

CREATE POLICY "Users can view their own favorites"
ON favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
ON favorites FOR DELETE
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- Offers (offers made on listings)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
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
USING (
    auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id)
);

CREATE POLICY "Users can create offers"
ON offers FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- ═══════════════════════════════════════════════════════════════
-- Categories (for marketplace navigation)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(10),
    color VARCHAR(20),
    listing_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, icon, color) VALUES
    ('SaaS', 'saas', '⚡', '#3b82f6'),
    ('AI Tool', 'ai-tool', '🤖', '#8b5cf6'),
    ('Game', 'game', '🎮', '#f97316'),
    ('Web App', 'web-app', '🌍', '#10b981'),
    ('Mobile', 'mobile', '📱', '#ec4899')
ON CONFLICT (slug) DO NOTHING;

-- Public read access
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- Function to update listing count in categories
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE categories 
    SET listing_count = (
        SELECT COUNT(*) FROM listings 
        WHERE category = NEW.category AND status = 'active'
    )
    WHERE name = NEW.category;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_count
AFTER INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_category_count();

-- ═══════════════════════════════════════════════════════════════
-- Function to update updated_at timestamp
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_offers_updated_at
BEFORE UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- Production Marketplace Hardening
-- Idempotent extensions for listing review, watchlists, offers,
-- escrow, payout readiness, and audit trails.
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Listing lifecycle, review metadata, seller payout readiness, and evidence pointers
ALTER TABLE listings ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS minimum_offer DECIMAL(15, 2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS target_raise DECIMAL(15, 2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS equity_available DECIMAL(5, 2);
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

-- Replace broad starter policies with production ownership and visibility rules.
DROP POLICY IF EXISTS "Public listings are viewable by everyone" ON listings;
DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;
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
WITH CHECK (
    auth.uid() = seller_id
    AND status IN ('draft', 'pending_review')
);

CREATE POLICY "Sellers can mutate editable own listings"
ON listings FOR UPDATE
USING (
    auth.uid() = seller_id
    AND status IN ('draft', 'pending_review', 'active', 'paused', 'rejected')
)
WITH CHECK (
    auth.uid() = seller_id
    AND status IN ('draft', 'pending_review', 'under_review', 'active', 'paused', 'sold', 'rejected', 'archived')
);

CREATE POLICY "Sellers can delete draft or rejected listings"
ON listings FOR DELETE
USING (
    auth.uid() = seller_id
    AND status IN ('draft', 'rejected')
);

-- Marketplace terms acceptance
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
CREATE POLICY "Listing owners manage terms acceptances"
ON listing_terms_acceptances FOR ALL
USING (
    auth.uid() = user_id
    AND auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_terms_acceptances.listing_id)
)
WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_terms_acceptances.listing_id)
);

-- Listing activity history
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
CREATE POLICY "Listing owners can view activity"
ON listing_activity_history FOR SELECT
USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_activity_history.listing_id));

CREATE POLICY "Listing owners can insert activity"
ON listing_activity_history FOR INSERT
WITH CHECK (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_activity_history.listing_id));

-- Listing media and screenshot metadata
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
CREATE POLICY "Public can view approved listing media"
ON listing_media FOR SELECT
USING (
    media_type IN ('cover', 'screenshot', 'demo_video')
    AND EXISTS (
        SELECT 1 FROM listings
        WHERE listings.id = listing_media.listing_id
        AND listings.status IN ('active', 'sold')
    )
);

CREATE POLICY "Listing owners manage media"
ON listing_media FOR ALL
USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_media.listing_id))
WITH CHECK (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_media.listing_id));

-- Private revenue evidence
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
CREATE POLICY "Listing owners manage revenue evidence"
ON listing_revenue_evidence FOR ALL
USING (auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_revenue_evidence.listing_id))
WITH CHECK (
    auth.uid() = uploaded_by
    AND auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_revenue_evidence.listing_id)
);

-- Listing views: one counted view per authenticated user or visitor/session.
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE listing_views ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_once_per_user
ON listing_views(listing_id, user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_once_per_session
ON listing_views(listing_id, session_id)
WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_once_per_visitor
ON listing_views(listing_id, visitor_id)
WHERE visitor_id IS NOT NULL AND session_id IS NULL;

ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can record listing views" ON listing_views;
DROP POLICY IF EXISTS "Listing owners can view listing analytics" ON listing_views;
CREATE POLICY "Public can record listing views"
ON listing_views FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM listings
        WHERE listings.id = listing_views.listing_id
        AND listings.status IN ('active', 'sold')
    )
);

CREATE POLICY "Listing owners can view listing analytics"
ON listing_views FOR SELECT
USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = listing_views.listing_id)
);

-- Watchlist notes and status
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

-- Seller payout readiness
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
CREATE POLICY "Sellers can view own payout account"
ON seller_payout_accounts FOR SELECT
USING (auth.uid() = seller_id);

-- Offer lifecycle, duplicate pending protection, idempotency, and audit
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_one_pending_per_buyer_listing
ON offers(listing_id, buyer_id)
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_idempotency_key
ON offers(buyer_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offers_listing_status ON offers(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_parent ON offers(parent_offer_id);

DROP POLICY IF EXISTS "Buyers can view their offers" ON offers;
DROP POLICY IF EXISTS "Sellers can view offers on their listings" ON offers;
DROP POLICY IF EXISTS "Users can create offers" ON offers;
DROP POLICY IF EXISTS "Listing owners can update offer status" ON offers;
DROP POLICY IF EXISTS "Offer participants can view offers" ON offers;
DROP POLICY IF EXISTS "Buyers can create offers on active listings" ON offers;
DROP POLICY IF EXISTS "Offer participants can update offers" ON offers;

CREATE POLICY "Offer participants can view offers"
ON offers FOR SELECT
USING (
    auth.uid() = buyer_id
    OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id)
);

CREATE POLICY "Buyers can create offers on active listings"
ON offers FOR INSERT
WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
        SELECT 1 FROM listings
        WHERE listings.id = offers.listing_id
        AND listings.status = 'active'
        AND listings.seller_id <> auth.uid()
    )
);

CREATE POLICY "Offer participants can update offers"
ON offers FOR UPDATE
USING (
    auth.uid() = buyer_id
    OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id)
)
WITH CHECK (
    auth.uid() = buyer_id
    OR auth.uid() IN (SELECT seller_id FROM listings WHERE id = offers.listing_id)
);

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
CREATE POLICY "Offer participants can view audit logs"
ON offer_audit_logs FOR SELECT
USING (
    auth.uid() IN (
        SELECT buyer_id FROM offers WHERE offers.id = offer_audit_logs.offer_id
    )
    OR auth.uid() IN (
        SELECT listings.seller_id
        FROM offers
        JOIN listings ON listings.id = offers.listing_id
        WHERE offers.id = offer_audit_logs.offer_id
    )
);

CREATE POLICY "Offer participants can insert audit logs"
ON offer_audit_logs FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT buyer_id FROM offers WHERE offers.id = offer_audit_logs.offer_id
    )
    OR auth.uid() IN (
        SELECT listings.seller_id
        FROM offers
        JOIN listings ON listings.id = offers.listing_id
        WHERE offers.id = offer_audit_logs.offer_id
    )
);

-- Escrow deals, transfer checklist, disputes, provider IDs, and audit
CREATE TABLE IF NOT EXISTS escrow_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'created',
    stage INTEGER DEFAULT 1,
    time_left INTERVAL,
    inspection_period_hours INTEGER DEFAULT 72,
    inspection_started_at TIMESTAMP WITH TIME ZONE,
    inspection_ends_at TIMESTAMP WITH TIME ZONE,
    funded_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    disputed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    admin_hold BOOLEAN DEFAULT FALSE,
    hold_reason TEXT,
    dispute_reason TEXT,
    payment_provider VARCHAR(50) DEFAULT 'stripe',
    payment_intent_id TEXT,
    provider_charge_id TEXT,
    provider_transfer_id TEXT,
    provider_refund_id TEXT,
    provider_release_id TEXT,
    provider_status VARCHAR(100),
    idempotency_key TEXT,
    release_idempotency_key TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    audit_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON escrow_deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_deals(status);
CREATE INDEX IF NOT EXISTS idx_escrow_listing ON escrow_deals(listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_offer_unique ON escrow_deals(offer_id) WHERE offer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_idempotency_key ON escrow_deals(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_release_idempotency_key ON escrow_deals(release_idempotency_key) WHERE release_idempotency_key IS NOT NULL;

ALTER TABLE escrow_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view their escrow deals" ON escrow_deals;
DROP POLICY IF EXISTS "Parties can update their escrow deals" ON escrow_deals;
DROP POLICY IF EXISTS "Escrow participants can view deals" ON escrow_deals;
DROP POLICY IF EXISTS "Escrow participants can create deals" ON escrow_deals;
DROP POLICY IF EXISTS "Escrow participants can update deals" ON escrow_deals;

CREATE POLICY "Escrow participants can view deals"
ON escrow_deals FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Escrow participants can create deals"
ON escrow_deals FOR INSERT
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Escrow participants can update deals"
ON escrow_deals FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS escrow_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES escrow_deals(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) DEFAULT 'custom',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    sort_order INTEGER DEFAULT 0,
    due_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_milestones_deal ON escrow_milestones(deal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_deal_order ON escrow_milestones(deal_id, sort_order);

ALTER TABLE escrow_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view milestones" ON escrow_milestones;
DROP POLICY IF EXISTS "Escrow participants can view milestones" ON escrow_milestones;
DROP POLICY IF EXISTS "Escrow participants can update milestones" ON escrow_milestones;
CREATE POLICY "Escrow participants can view milestones"
ON escrow_milestones FOR SELECT
USING (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
);

CREATE POLICY "Escrow participants can update milestones"
ON escrow_milestones FOR UPDATE
USING (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
)
WITH CHECK (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_milestones.deal_id)
);

CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES escrow_deals(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    seller_confirmed BOOLEAN DEFAULT FALSE,
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed_at TIMESTAMP WITH TIME ZONE,
    buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    handoff_notes TEXT,
    evidence_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_transfer_items_deal ON transfer_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_status ON transfer_items(deal_id, status);

ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view transfer items" ON transfer_items;
DROP POLICY IF EXISTS "Escrow participants can view transfer items" ON transfer_items;
DROP POLICY IF EXISTS "Escrow participants can update transfer items" ON transfer_items;
CREATE POLICY "Escrow participants can view transfer items"
ON transfer_items FOR SELECT
USING (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id)
);

CREATE POLICY "Escrow participants can update transfer items"
ON transfer_items FOR UPDATE
USING (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id)
)
WITH CHECK (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = transfer_items.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = transfer_items.deal_id)
);

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
CREATE POLICY "Escrow participants manage dispute evidence"
ON escrow_dispute_evidence FOR ALL
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
CREATE POLICY "Escrow participants can view audit logs"
ON escrow_audit_logs FOR SELECT
USING (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id)
);

CREATE POLICY "Escrow participants can insert audit logs"
ON escrow_audit_logs FOR INSERT
WITH CHECK (
    auth.uid() IN (SELECT buyer_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id)
    OR auth.uid() IN (SELECT seller_id FROM escrow_deals WHERE id = escrow_audit_logs.deal_id)
);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_payment_provider_event
ON marketplace_payment_audit_logs(provider, provider_event_id)
WHERE provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_payment_idempotency
ON marketplace_payment_audit_logs(provider, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_payment_escrow ON marketplace_payment_audit_logs(escrow_deal_id, created_at DESC);

ALTER TABLE marketplace_payment_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Escrow participants can view payment audit logs" ON marketplace_payment_audit_logs;
CREATE POLICY "Escrow participants can view payment audit logs"
ON marketplace_payment_audit_logs FOR SELECT
USING (
    auth.uid() IN (
        SELECT buyer_id FROM escrow_deals WHERE id = marketplace_payment_audit_logs.escrow_deal_id
    )
    OR auth.uid() IN (
        SELECT seller_id FROM escrow_deals WHERE id = marketplace_payment_audit_logs.escrow_deal_id
    )
);

-- Production triggers
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
CREATE TRIGGER trigger_listing_activity
AFTER INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION log_listing_activity();

CREATE OR REPLACE FUNCTION enforce_listing_screenshot_limit()
RETURNS TRIGGER AS $$
DECLARE
    existing_screenshots INTEGER;
BEGIN
    IF NEW.media_type = 'screenshot' THEN
        SELECT COUNT(*) INTO existing_screenshots
        FROM listing_media
        WHERE listing_id = NEW.listing_id
          AND media_type = 'screenshot'
          AND id <> NEW.id;

        IF existing_screenshots >= 8 THEN
            RAISE EXCEPTION 'Listings support a maximum of 8 screenshots';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listing_screenshot_limit ON listing_media;
CREATE TRIGGER trigger_listing_screenshot_limit
BEFORE INSERT OR UPDATE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION enforce_listing_screenshot_limit();

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
        SELECT COUNT(*)
        FROM listing_media
        WHERE listing_id = target_listing_id
          AND media_type = 'screenshot'
    )
    WHERE id = target_listing_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listing_media_counts ON listing_media;
CREATE TRIGGER trigger_listing_media_counts
AFTER INSERT OR UPDATE OR DELETE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION refresh_listing_media_counts();

CREATE OR REPLACE FUNCTION increment_listing_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings
    SET views = COALESCE(views, 0) + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_listing_view_count ON listing_views;
CREATE TRIGGER trigger_increment_listing_view_count
AFTER INSERT ON listing_views
FOR EACH ROW
EXECUTE FUNCTION increment_listing_view_count();

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
        SELECT COUNT(*)
        FROM favorites
        WHERE listing_id = target_listing_id
          AND status = 'active'
    )
    WHERE id = target_listing_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refresh_listing_favorite_count ON favorites;
CREATE TRIGGER trigger_refresh_listing_favorite_count
AFTER INSERT OR UPDATE OR DELETE ON favorites
FOR EACH ROW
EXECUTE FUNCTION refresh_listing_favorite_count();

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
CREATE TRIGGER trigger_offer_audit
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION log_offer_audit();

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
CREATE TRIGGER trigger_escrow_audit
AFTER INSERT OR UPDATE ON escrow_deals
FOR EACH ROW
EXECUTE FUNCTION log_escrow_audit();

DROP TRIGGER IF EXISTS trigger_favorites_updated_at ON favorites;
CREATE TRIGGER trigger_favorites_updated_at
BEFORE UPDATE ON favorites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_listing_media_updated_at ON listing_media;
CREATE TRIGGER trigger_listing_media_updated_at
BEFORE UPDATE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_revenue_evidence_updated_at ON listing_revenue_evidence;
CREATE TRIGGER trigger_revenue_evidence_updated_at
BEFORE UPDATE ON listing_revenue_evidence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_seller_payout_updated_at ON seller_payout_accounts;
CREATE TRIGGER trigger_seller_payout_updated_at
BEFORE UPDATE ON seller_payout_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_escrow_deals_updated_at ON escrow_deals;
CREATE TRIGGER trigger_escrow_deals_updated_at
BEFORE UPDATE ON escrow_deals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_escrow_milestones_updated_at ON escrow_milestones;
CREATE TRIGGER trigger_escrow_milestones_updated_at
BEFORE UPDATE ON escrow_milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_transfer_items_updated_at ON transfer_items;
CREATE TRIGGER trigger_transfer_items_updated_at
BEFORE UPDATE ON transfer_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- Sample data (for development/demo purposes)
-- ═══════════════════════════════════════════════════════════════

-- Sample categories with counts (update after data is inserted)
-- UPDATE categories SET listing_count = (SELECT COUNT(*) FROM listings WHERE category = categories.name AND status = 'active');

-- ═══════════════════════════════════════════════════════════════
-- Realtime subscriptions (enable real-time updates)
-- ═══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE favorites;

-- ═══════════════════════════════════════════════════════════════
-- API Helper Views
-- ═══════════════════════════════════════════════════════════════

-- View for listing details with seller info
CREATE OR REPLACE VIEW listing_details AS
SELECT 
    l.*,
    u.email as seller_email,
    (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorite_count,
    (SELECT COUNT(*) FROM offers WHERE listing_id = l.id) as offer_count
FROM listings l
LEFT JOIN auth.users u ON l.seller_id = u.id;

-- View for dashboard analytics
CREATE OR REPLACE VIEW marketplace_analytics AS
SELECT 
    category,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings,
    SUM(asking_price) as total_value,
    AVG(monthly_revenue) as avg_monthly_revenue,
    MAX(monthly_revenue) as max_monthly_revenue
FROM listings
GROUP BY category;
