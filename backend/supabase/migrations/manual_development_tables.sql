-- Migration: Add development tracking tables
-- Generated for existing database with some types already present

-- Create new enums for development tracking (only if not exists)
DO $$ BEGIN
    CREATE TYPE phase_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE update_visibility AS ENUM ('owner_only', 'investors', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'milestone_completed', 'milestone_approved', 'phase_started', 'phase_completed',
        'update_posted', 'app_launched', 'deployment_submitted', 'deployment_approved',
        'deployment_rejected', 'blocker_reported', 'blocker_resolved'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE deployment_platform AS ENUM ('ios', 'android', 'web', 'desktop');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE deployment_status AS ENUM ('preparing', 'submitted', 'in_review', 'approved', 'rejected', 'live');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_role AS ENUM ('lead_developer', 'developer', 'designer', 'project_manager', 'qa_engineer', 'devops');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_member_status AS ENUM ('active', 'inactive', 'removed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE app_dev_status AS ENUM ('not_started', 'planning', 'design', 'development', 'testing', 'pre_launch', 'launched', 'paused', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Development Phases Table
CREATE TABLE IF NOT EXISTS development_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    phase_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    estimated_end_date TIMESTAMP,
    status phase_status NOT NULL DEFAULT 'not_started',
    completion_pct INTEGER DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(app_id, phase_number)
);

CREATE INDEX IF NOT EXISTS idx_phases_app ON development_phases(app_id);
CREATE INDEX IF NOT EXISTS idx_phases_status ON development_phases(status);

-- Development Milestones Table
CREATE TABLE IF NOT EXISTS development_milestones (
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_phase ON development_milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_milestones_app ON development_milestones(app_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON development_milestones(status);

-- Development Tasks Table
CREATE TABLE IF NOT EXISTS development_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES development_milestones(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(6, 2),
    actual_hours DECIMAL(6, 2),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON development_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON development_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON development_tasks(status);

-- Progress Updates Table
CREATE TABLE IF NOT EXISTS progress_updates (
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_app ON progress_updates(app_id);
CREATE INDEX IF NOT EXISTS idx_updates_visibility ON progress_updates(visibility);
CREATE INDEX IF NOT EXISTS idx_updates_created ON progress_updates(created_at DESC);

-- Investor Notifications Table
CREATE TABLE IF NOT EXISTS investor_notifications (
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_investor ON investor_notifications(investor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_app ON investor_notifications(app_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON investor_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON investor_notifications(created_at DESC);

-- Deployment Records Table
CREATE TABLE IF NOT EXISTS deployment_records (
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_app ON deployment_records(app_id);
CREATE INDEX IF NOT EXISTS idx_deployments_platform ON deployment_records(platform);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployment_records(status);

-- App Team Members Table
CREATE TABLE IF NOT EXISTS app_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role team_role NOT NULL,
    can_update_progress BOOLEAN DEFAULT false,
    can_post_updates BOOLEAN DEFAULT false,
    can_manage_tasks BOOLEAN DEFAULT false,
    status team_member_status NOT NULL DEFAULT 'active',
    added_at TIMESTAMP DEFAULT NOW(),
    removed_at TIMESTAMP,
    UNIQUE(app_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_app ON app_team_members(app_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON app_team_members(user_id);

-- Extend apps table with development tracking columns
ALTER TABLE apps ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES crowdfunding_campaigns(id);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_crowdfunded BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS development_status app_dev_status DEFAULT 'not_started';
ALTER TABLE apps ADD COLUMN IF NOT EXISTS current_phase_id UUID REFERENCES development_phases(id);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS estimated_launch_date TIMESTAMP;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS actual_launch_date TIMESTAMP;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_phases_updated_at ON development_phases;
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON development_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON development_milestones;
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON development_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON development_tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON development_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS updates_updated_at ON progress_updates;
CREATE TRIGGER updates_updated_at BEFORE UPDATE ON progress_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deployments_updated_at ON deployment_records;
CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployment_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();