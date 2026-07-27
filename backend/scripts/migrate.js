const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const enums = [
  `CREATE TYPE user_role AS ENUM ('ceo', 'investor', 'creator', 'admin', 'analyst')`,
  `CREATE TYPE app_status AS ENUM ('development', 'publishing', 'live', 'sold', 'archived')`,
  `CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled')`,
  `CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'sold', 'rejected', 'archived')`,
  `CREATE TYPE listing_type AS ENUM ('sale', 'investment', 'both')`,
  `CREATE TYPE app_category AS ENUM ('mobile_app', 'web_app', 'game', 'saas', 'ai_product', 'browser_extension', 'marketplace', 'social', 'productivity', 'other')`,
  `CREATE TYPE app_platform AS ENUM ('mobile', 'web', 'desktop', 'cross_platform')`,
  `CREATE TYPE idea_status AS ENUM ('draft', 'prd_generating', 'prd_generated', 'designing', 'design_complete', 'estimating', 'ready_for_funding', 'submitted_for_funding', 'archived')`,
  `CREATE TYPE screen_type AS ENUM ('phone', 'tablet', 'web', 'watch')`,
  `CREATE TYPE funding_type AS ENUM ('pay_once', 'split')`,
  `CREATE TYPE crowdfunding_status AS ENUM ('draft', 'pending_review', 'active', 'funded', 'partially_funded', 'failed', 'cancelled', 'expired')`,
  `CREATE TYPE commitment_status AS ENUM ('pending', 'processing', 'paid', 'escrow_held', 'released', 'refunding', 'refunded', 'cancelled', 'failed')`,
  `CREATE TYPE escrow_status AS ENUM ('active', 'holding', 'releasing', 'released', 'refunding', 'refunded', 'closed')`,
  `CREATE TYPE share_type AS ENUM ('public', 'private', 'single_use')`,
  `CREATE TYPE phase_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked', 'skipped')`,
  `CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'overdue', 'cancelled')`,
  `CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked', 'cancelled')`,
  `CREATE TYPE update_visibility AS ENUM ('owner_only', 'investors', 'public')`,
  `CREATE TYPE notification_type AS ENUM ('milestone_completed', 'milestone_approved', 'phase_started', 'phase_completed', 'update_posted', 'app_launched', 'deployment_submitted', 'deployment_approved', 'deployment_rejected', 'blocker_reported', 'blocker_resolved')`,
  `CREATE TYPE deployment_platform AS ENUM ('ios', 'android', 'web', 'desktop')`,
  `CREATE TYPE deployment_status AS ENUM ('preparing', 'submitted', 'in_review', 'approved', 'rejected', 'live')`,
  `CREATE TYPE team_role AS ENUM ('lead_developer', 'developer', 'designer', 'project_manager', 'qa_engineer', 'devops')`,
  `CREATE TYPE team_member_status AS ENUM ('active', 'inactive', 'removed')`,
  `CREATE TYPE app_dev_status AS ENUM ('not_started', 'planning', 'design', 'development', 'testing', 'pre_launch', 'launched', 'paused', 'cancelled')`
];

const tables = [
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ceo',
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    email_verified BOOLEAN DEFAULT false,
    kyc_status VARCHAR(50) DEFAULT 'not_started' NOT NULL,
    stripe_account_id VARCHAR(255),
    stripe_onboarding_complete BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    status app_status NOT NULL DEFAULT 'development',
    stripe_account_id VARCHAR(255),
    monthly_revenue DECIMAL(12, 2) DEFAULT '0',
    monthly_users INTEGER DEFAULT 0,
    estimated_value DECIMAL(14, 2) DEFAULT '0',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category app_category NOT NULL DEFAULT 'other',
    platform app_platform NOT NULL DEFAULT 'mobile',
    target_audience TEXT,
    features JSONB DEFAULT '[]',
    status idea_status NOT NULL DEFAULT 'draft',
    prd_document JSONB,
    design_mockups JSONB DEFAULT '[]',
    prototype_url TEXT,
    cost_estimate DECIMAL(14, 2),
    cost_breakdown JSONB,
    timeline_weeks INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS design_mockups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE NOT NULL,
    screen_name VARCHAR(255) NOT NULL,
    screen_type screen_type NOT NULL DEFAULT 'phone',
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    figma_url TEXT,
    order_index INTEGER DEFAULT 0,
    annotations JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prd_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE NOT NULL,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    generated_by VARCHAR(50) DEFAULT 'ai',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS idea_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES app_ideas(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS crowdfunding_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES app_ideas(id) ON DELETE SET NULL,
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    long_description TEXT,
    cover_image_url TEXT,
    video_url TEXT,
    funding_goal DECIMAL(14, 2) NOT NULL,
    funding_raised DECIMAL(14, 2) DEFAULT '0.00' NOT NULL,
    min_investment DECIMAL(10, 2) DEFAULT '100.00',
    max_investment DECIMAL(14, 2),
    equity_offered_pct DECIMAL(5, 2) NOT NULL,
    pre_money_valuation DECIMAL(14, 2) NOT NULL,
    platform_fee_pct DECIMAL(4, 2) DEFAULT '5.00',
    funding_type funding_type NOT NULL DEFAULT 'split',
    status crowdfunding_status NOT NULL DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    funded_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    max_investors INTEGER DEFAULT 100,
    current_investor_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS investment_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE NOT NULL,
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    stake_pct DECIMAL(5, 4) NOT NULL,
    valuation_at_commitment DECIMAL(14, 2) NOT NULL,
    status commitment_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_receipt_url TEXT,
    committed_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS escrow_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE NOT NULL,
    stripe_connect_account_id VARCHAR(255) NOT NULL,
    total_committed DECIMAL(14, 2) DEFAULT '0.00' NOT NULL,
    total_held DECIMAL(14, 2) DEFAULT '0.00' NOT NULL,
    total_released DECIMAL(14, 2) DEFAULT '0.00' NOT NULL,
    total_refunded DECIMAL(14, 2) DEFAULT '0.00' NOT NULL,
    platform_fees_earned DECIMAL(14, 2) DEFAULT '0.00' NOT NULL,
    status escrow_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    released_at TIMESTAMP,
    fully_refunded_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS campaign_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES crowdfunding_campaigns(id) ON DELETE CASCADE NOT NULL,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    share_type share_type NOT NULL DEFAULT 'public',
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS development_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    phase_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    estimated_end_date TIMESTAMP,
    status phase_status NOT NULL DEFAULT 'not_started',
    completion_pct INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(app_id, phase_number)
  )`,
  `CREATE TABLE IF NOT EXISTS development_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES development_phases(id) ON DELETE CASCADE NOT NULL,
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    status milestone_status NOT NULL DEFAULT 'pending',
    requires_owner_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS development_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES development_milestones(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(6, 2),
    actual_hours DECIMAL(6, 2),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    phase_id UUID REFERENCES development_phases(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES development_milestones(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    visibility update_visibility NOT NULL DEFAULT 'investors',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS investor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS deployment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    platform deployment_platform NOT NULL,
    store_url TEXT,
    download_url TEXT,
    version VARCHAR(50) NOT NULL,
    build_number INTEGER NOT NULL,
    status deployment_status NOT NULL DEFAULT 'preparing',
    submitted_at TIMESTAMP,
    review_started_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    live_at TIMESTAMP,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role team_role NOT NULL,
    can_update_progress BOOLEAN DEFAULT false,
    can_post_updates BOOLEAN DEFAULT false,
    can_manage_tasks BOOLEAN DEFAULT false,
    status team_member_status NOT NULL DEFAULT 'active',
    added_at TIMESTAMP DEFAULT NOW() NOT NULL,
    removed_at TIMESTAMP,
    UNIQUE(app_id, user_id)
  )`
];

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_app_ideas_owner ON app_ideas(owner_id)',
  'CREATE INDEX IF NOT EXISTS idx_app_ideas_status ON app_ideas(status)',
  'CREATE INDEX IF NOT EXISTS idx_app_ideas_slug ON app_ideas(slug)',
  'CREATE INDEX IF NOT EXISTS idx_design_mockups_idea ON design_mockups(idea_id)',
  'CREATE INDEX IF NOT EXISTS idx_prd_versions_idea ON prd_versions(idea_id)',
  'CREATE INDEX IF NOT EXISTS idx_idea_attachments_idea ON idea_attachments(idea_id)',
  'CREATE INDEX IF NOT EXISTS idx_crowdfunding_owner ON crowdfunding_campaigns(owner_id)',
  'CREATE INDEX IF NOT EXISTS idx_crowdfunding_status ON crowdfunding_campaigns(status)',
  'CREATE INDEX IF NOT EXISTS idx_crowdfunding_slug ON crowdfunding_campaigns(slug)',
  'CREATE INDEX IF NOT EXISTS idx_crowdfunding_share_token ON crowdfunding_campaigns(share_token)',
  'CREATE INDEX IF NOT EXISTS idx_commitments_campaign ON investment_commitments(campaign_id)',
  'CREATE INDEX IF NOT EXISTS idx_commitments_investor ON investment_commitments(investor_id)',
  'CREATE INDEX IF NOT EXISTS idx_commitments_status ON investment_commitments(status)',
  'CREATE INDEX IF NOT EXISTS idx_escrow_campaign ON escrow_accounts(campaign_id)',
  'CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_accounts(status)',
  'CREATE INDEX IF NOT EXISTS idx_shares_campaign ON campaign_shares(campaign_id)',
  'CREATE INDEX IF NOT EXISTS idx_shares_token ON campaign_shares(share_token)',
  'CREATE INDEX IF NOT EXISTS idx_phases_app ON development_phases(app_id)',
  'CREATE INDEX IF NOT EXISTS idx_phases_status ON development_phases(status)',
  'CREATE INDEX IF NOT EXISTS idx_milestones_phase ON development_milestones(phase_id)',
  'CREATE INDEX IF NOT EXISTS idx_milestones_app ON development_milestones(app_id)',
  'CREATE INDEX IF NOT EXISTS idx_milestones_status ON development_milestones(status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON development_tasks(milestone_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON development_tasks(assigned_to)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON development_tasks(status)',
  'CREATE INDEX IF NOT EXISTS idx_updates_app ON progress_updates(app_id)',
  'CREATE INDEX IF NOT EXISTS idx_updates_visibility ON progress_updates(visibility)',
  'CREATE INDEX IF NOT EXISTS idx_updates_created ON progress_updates(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_investor ON investor_notifications(investor_id)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_app ON investor_notifications(app_id)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_read ON investor_notifications(read)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_created ON investor_notifications(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_deployments_app ON deployment_records(app_id)',
  'CREATE INDEX IF NOT EXISTS idx_deployments_platform ON deployment_records(platform)',
  'CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployment_records(status)',
  'CREATE INDEX IF NOT EXISTS idx_team_app ON app_team_members(app_id)',
  'CREATE INDEX IF NOT EXISTS idx_team_user ON app_team_members(user_id)'
];

async function createEnums() {
  console.log('Creating enums...');
  for (const sql of enums) {
    try {
      await pool.query(`DO $$ BEGIN ${sql}; EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('Enum warning:', err.message);
      }
    }
  }
  console.log('Enums done');
}

async function createTables() {
  console.log('Creating tables...');
  for (const sql of tables) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err.code !== '42P07') {
        console.error('Table error:', err.message);
      }
    }
  }
  console.log('Tables done');
}

async function createIndexes() {
  console.log('Creating indexes...');
  for (const sql of indexes) {
    try {
      await pool.query(sql);
    } catch (err) {}
  }
  console.log('Indexes done');
}

async function main() {
  try {
    await createEnums();
    await createTables();
    await createIndexes();
    
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('\nAll tables:', res.rows.map(r => r.table_name).join(', '));
    
    await pool.end();
    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Fatal:', err);
    await pool.end();
    process.exit(1);
  }
}

main();