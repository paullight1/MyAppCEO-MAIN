CREATE TYPE "public"."app_category" AS ENUM('mobile_app', 'web_app', 'game', 'saas', 'ai_product', 'browser_extension', 'marketplace', 'social', 'productivity', 'other');--> statement-breakpoint
CREATE TYPE "public"."app_dev_status" AS ENUM('not_started', 'planning', 'design', 'development', 'testing', 'pre_launch', 'launched', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."app_platform" AS ENUM('mobile', 'web', 'desktop', 'cross_platform');--> statement-breakpoint
CREATE TYPE "public"."app_status" AS ENUM('development', 'publishing', 'live', 'sold', 'archived');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commitment_status" AS ENUM('pending', 'processing', 'paid', 'escrow_held', 'released', 'refunding', 'refunded', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."crowdfunding_status" AS ENUM('draft', 'pending_review', 'active', 'funded', 'partially_funded', 'failed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."deployment_platform" AS ENUM('ios', 'android', 'web', 'desktop');--> statement-breakpoint
CREATE TYPE "public"."deployment_status" AS ENUM('preparing', 'submitted', 'in_review', 'approved', 'rejected', 'live');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('active', 'holding', 'releasing', 'released', 'refunding', 'refunded', 'closed');--> statement-breakpoint
CREATE TYPE "public"."funding_type" AS ENUM('pay_once', 'split');--> statement-breakpoint
CREATE TYPE "public"."idea_status" AS ENUM('draft', 'prd_generating', 'prd_generated', 'designing', 'design_complete', 'estimating', 'ready_for_funding', 'submitted_for_funding', 'archived');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'active', 'paused', 'sold', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('sale', 'investment', 'both');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'in_progress', 'completed', 'blocked', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('milestone_completed', 'milestone_approved', 'phase_started', 'phase_completed', 'update_posted', 'app_launched', 'deployment_submitted', 'deployment_approved', 'deployment_rejected', 'blocker_reported', 'blocker_resolved');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('not_started', 'in_progress', 'completed', 'blocked', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."screen_type" AS ENUM('phone', 'tablet', 'web', 'watch');--> statement-breakpoint
CREATE TYPE "public"."share_type" AS ENUM('public', 'private', 'single_use');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done', 'blocked', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."team_member_status" AS ENUM('active', 'inactive', 'removed');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('lead_developer', 'developer', 'designer', 'project_manager', 'qa_engineer', 'devops');--> statement-breakpoint
CREATE TYPE "public"."update_visibility" AS ENUM('owner_only', 'investors', 'public');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ceo', 'investor', 'creator', 'admin', 'analyst');--> statement-breakpoint
CREATE TABLE "app_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" "app_category" DEFAULT 'other' NOT NULL,
	"platform" "app_platform" DEFAULT 'mobile' NOT NULL,
	"target_audience" text,
	"features" jsonb DEFAULT '[]'::jsonb,
	"status" "idea_status" DEFAULT 'draft' NOT NULL,
	"prd_document" jsonb,
	"design_mockups" jsonb DEFAULT '[]'::jsonb,
	"prototype_url" text,
	"cost_estimate" numeric(14, 2),
	"cost_breakdown" jsonb,
	"timeline_weeks" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_ideas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app_lifecycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"current_step_id" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'in_progress' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"last_updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_lifecycle_app_id_unique" UNIQUE("app_id")
);
--> statement-breakpoint
CREATE TABLE "app_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"dau" integer DEFAULT 0,
	"mrr" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" NOT NULL,
	"can_update_progress" boolean DEFAULT false,
	"can_post_updates" boolean DEFAULT false,
	"can_manage_tasks" boolean DEFAULT false,
	"status" "team_member_status" DEFAULT 'active' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"status" "app_status" DEFAULT 'development' NOT NULL,
	"stripe_account_id" varchar(255),
	"monthly_revenue" numeric(12, 2) DEFAULT '0',
	"monthly_users" integer DEFAULT 0,
	"estimated_value" numeric(14, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_value" text,
	"action_type" varchar(50) NOT NULL,
	"action_payload" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"share_token" varchar(64) NOT NULL,
	"share_type" "share_type" DEFAULT 'public' NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"expires_at" timestamp,
	"created_by" uuid NOT NULL,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"goal_type" varchar(50),
	"goal_value" integer NOT NULL,
	"total_budget" numeric(12, 2) NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"creatives" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ceo_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid,
	"name" varchar(255) NOT NULL,
	"api_key" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ceo_api_keys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "crowdfunding_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid,
	"app_id" uuid,
	"owner_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_description" text,
	"long_description" text,
	"cover_image_url" text,
	"video_url" text,
	"funding_goal" numeric(14, 2) NOT NULL,
	"funding_raised" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"min_investment" numeric(10, 2) DEFAULT '100.00',
	"max_investment" numeric(14, 2),
	"equity_offered_pct" numeric(5, 2) NOT NULL,
	"pre_money_valuation" numeric(14, 2) NOT NULL,
	"platform_fee_pct" numeric(4, 2) DEFAULT '5.00',
	"funding_type" "funding_type" DEFAULT 'split' NOT NULL,
	"status" "crowdfunding_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"funded_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"max_investors" integer DEFAULT 100,
	"current_investor_count" integer DEFAULT 0,
	"is_public" boolean DEFAULT false,
	"share_token" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crowdfunding_campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "crowdfunding_campaigns_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "deployment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"platform" "deployment_platform" NOT NULL,
	"store_url" text,
	"download_url" text,
	"version" varchar(50) NOT NULL,
	"build_number" integer NOT NULL,
	"status" "deployment_status" DEFAULT 'preparing' NOT NULL,
	"submitted_at" timestamp,
	"review_started_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"live_at" timestamp,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_mockups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"screen_name" varchar(255) NOT NULL,
	"screen_type" "screen_type" DEFAULT 'phone' NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"figma_url" text,
	"order_index" integer DEFAULT 0,
	"annotations" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"requires_owner_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejection_reason" text,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"phase_number" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"estimated_end_date" timestamp,
	"status" "phase_status" DEFAULT 'not_started' NOT NULL,
	"completion_pct" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"assigned_to" uuid,
	"estimated_hours" numeric(6, 2),
	"actual_hours" numeric(6, 2),
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "escrow_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"stripe_connect_account_id" varchar(255) NOT NULL,
	"total_committed" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_held" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_released" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_refunded" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"platform_fees_earned" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"status" "escrow_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"fully_refunded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "idea_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_type" varchar(100),
	"file_size" integer,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"stake_pct" numeric(5, 4) NOT NULL,
	"valuation_at_commitment" numeric(14, 2) NOT NULL,
	"status" "commitment_status" DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"stripe_receipt_url" text,
	"committed_at" timestamp DEFAULT now(),
	"paid_at" timestamp,
	"refunded_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investor_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investor_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifecycle_steps" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid,
	"seller_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_description" text,
	"long_description" text,
	"category" varchar(100),
	"image_url" text,
	"asking_price" numeric(14, 2),
	"monthly_revenue" numeric(12, 2),
	"revenue_verified" boolean DEFAULT false NOT NULL,
	"listing_type" "listing_type" DEFAULT 'sale' NOT NULL,
	"target_raise" numeric(14, 2),
	"equity_available" numeric(5, 2),
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "prd_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"generated_by" varchar(50) DEFAULT 'ai',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"phase_id" uuid,
	"milestone_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"visibility" "update_visibility" DEFAULT 'investors' NOT NULL,
	"author_id" uuid NOT NULL,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"platform" varchar(50) NOT NULL,
	"platform_user_id" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"username" varchar(255),
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_hire_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"ceo_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"campaign_id" uuid,
	"proposal" text NOT NULL,
	"budget" numeric(12, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"skills" text[] DEFAULT '{}'::text[],
	"experience_years" integer DEFAULT 0,
	"bio" text,
	"portfolio_links" text[] DEFAULT '{}'::text[],
	"hourly_rate" numeric(10, 2),
	"status" varchar(30) DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ugc_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitter_id" uuid NOT NULL,
	"app_id" uuid,
	"platform" varchar(50) NOT NULL,
	"media_url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"engagement_stats" jsonb DEFAULT '{}',
	"followers" integer DEFAULT 0,
	"status" varchar(30) DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'ceo' NOT NULL,
	"full_name" varchar(255),
	"company_name" varchar(255),
	"avatar_url" text,
	"bio" text,
	"email_verified" boolean DEFAULT false,
	"kyc_status" varchar(50) DEFAULT 'not_started' NOT NULL,
	"stripe_account_id" varchar(255),
	"stripe_onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "app_ideas" ADD CONSTRAINT "app_ideas_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_lifecycle" ADD CONSTRAINT "app_lifecycle_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_lifecycle" ADD CONSTRAINT "app_lifecycle_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_metrics" ADD CONSTRAINT "app_metrics_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_team_members" ADD CONSTRAINT "app_team_members_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_team_members" ADD CONSTRAINT "app_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_shares" ADD CONSTRAINT "campaign_shares_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_shares" ADD CONSTRAINT "campaign_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceo_api_keys" ADD CONSTRAINT "ceo_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceo_api_keys" ADD CONSTRAINT "ceo_api_keys_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD CONSTRAINT "crowdfunding_campaigns_idea_id_app_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."app_ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD CONSTRAINT "crowdfunding_campaigns_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD CONSTRAINT "crowdfunding_campaigns_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_records" ADD CONSTRAINT "deployment_records_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_mockups" ADD CONSTRAINT "design_mockups_idea_id_app_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."app_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_milestones" ADD CONSTRAINT "development_milestones_phase_id_development_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."development_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_milestones" ADD CONSTRAINT "development_milestones_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_milestones" ADD CONSTRAINT "development_milestones_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_phases" ADD CONSTRAINT "development_phases_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_milestone_id_development_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."development_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_accounts" ADD CONSTRAINT "escrow_accounts_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_attachments" ADD CONSTRAINT "idea_attachments_idea_id_app_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."app_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_attachments" ADD CONSTRAINT "idea_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_commitments" ADD CONSTRAINT "investment_commitments_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_commitments" ADD CONSTRAINT "investment_commitments_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_notifications" ADD CONSTRAINT "investor_notifications_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_notifications" ADD CONSTRAINT "investor_notifications_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prd_versions" ADD CONSTRAINT "prd_versions_idea_id_app_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."app_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_phase_id_development_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."development_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_milestone_id_development_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."development_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_hire_requests" ADD CONSTRAINT "talent_hire_requests_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_hire_requests" ADD CONSTRAINT "talent_hire_requests_ceo_id_users_id_fk" FOREIGN KEY ("ceo_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_hire_requests" ADD CONSTRAINT "talent_hire_requests_talent_id_users_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_hire_requests" ADD CONSTRAINT "talent_hire_requests_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_portfolios" ADD CONSTRAINT "talent_portfolios_talent_id_users_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_portfolios" ADD CONSTRAINT "talent_portfolios_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ugc_submissions" ADD CONSTRAINT "ugc_submissions_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ugc_submissions" ADD CONSTRAINT "ugc_submissions_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ugc_submissions" ADD CONSTRAINT "ugc_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_ideas_owner" ON "app_ideas" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_app_ideas_status" ON "app_ideas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_app_ideas_slug" ON "app_ideas" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_team_app" ON "app_team_members" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_team_user" ON "app_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_shares_campaign" ON "campaign_shares" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_shares_token" ON "campaign_shares" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_crowdfunding_owner" ON "crowdfunding_campaigns" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_crowdfunding_status" ON "crowdfunding_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_crowdfunding_slug" ON "crowdfunding_campaigns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_crowdfunding_share_token" ON "crowdfunding_campaigns" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_deployments_app" ON "deployment_records" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_deployments_platform" ON "deployment_records" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_deployments_status" ON "deployment_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_design_mockups_idea" ON "design_mockups" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_phase" ON "development_milestones" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_app" ON "development_milestones" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_status" ON "development_milestones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_phases_app" ON "development_phases" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_phases_status" ON "development_phases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_milestone" ON "development_tasks" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_assigned" ON "development_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "development_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_escrow_campaign" ON "escrow_accounts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_escrow_status" ON "escrow_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_idea_attachments_idea" ON "idea_attachments" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idx_commitments_campaign" ON "investment_commitments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_commitments_investor" ON "investment_commitments" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "idx_commitments_status" ON "investment_commitments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_investor" ON "investor_notifications" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_app" ON "investor_notifications" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "investor_notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "investor_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_prd_versions_idea" ON "prd_versions" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idx_updates_app" ON "progress_updates" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_updates_visibility" ON "progress_updates" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_updates_created" ON "progress_updates" USING btree ("created_at");