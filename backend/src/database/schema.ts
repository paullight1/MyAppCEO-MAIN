import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  jsonb,
  date,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ceo', 'investor', 'creator', 'admin', 'analyst']);
export const appStatusEnum = pgEnum('app_status', ['development', 'publishing', 'live', 'sold', 'archived']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed', 'cancelled']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'pending_review', 'under_review', 'active', 'paused', 'sold', 'rejected', 'archived']);
export const listingTypeEnum = pgEnum('listing_type', ['sale', 'investment', 'both']);
export const offerStatusEnum = pgEnum('offer_status', ['pending', 'accepted', 'rejected', 'withdrawn', 'countered', 'expired']);

// App Ideas Enums
export const appCategoryEnum = pgEnum('app_category', [
  'mobile_app', 'web_app', 'game', 'saas', 'ai_product',
  'browser_extension', 'marketplace', 'social', 'productivity', 'other'
]);
export const appPlatformEnum = pgEnum('app_platform', ['mobile', 'web', 'desktop', 'cross_platform']);
export const ideaStatusEnum = pgEnum('idea_status', [
  'draft', 'prd_generating', 'prd_generated', 'designing',
  'design_complete', 'estimating', 'ready_for_funding',
  'submitted_for_funding', 'archived', 'converted_to_app'
]);
export const screenTypeEnum = pgEnum('screen_type', ['phone', 'tablet', 'web', 'watch']);
export const generationJobStatusEnum = pgEnum('generation_job_status', [
  'queued', 'running', 'completed', 'failed', 'cancelled',
]);
export const generationJobTypeEnum = pgEnum('generation_job_type', [
  'prd', 'design', 'build_plan', 'code', 'screen_spec', 'sandbox_run', 'quality_report', 'deployment_package',
]);
export const generatedArtifactTypeEnum = pgEnum('generated_artifact_type', [
  'prd', 'design', 'build_plan', 'screen_spec', 'code_scaffold', 'patch', 'sandbox_report', 'quality_report', 'deployment_package',
]);
export const reviewSubmissionStatusEnum = pgEnum('review_submission_status', [
  'draft', 'pending_review', 'under_review', 'approved', 'changes_requested', 'rejected',
]);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('ceo').notNull(),
  fullName: varchar('full_name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  emailVerified: boolean('email_verified').default(false),
  kycStatus: varchar('kyc_status', { length: 50 }).default('not_started').notNull(),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Apps Table
export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  status: appStatusEnum('status').default('development').notNull(),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  monthlyRevenue: decimal('monthly_revenue', { precision: 12, scale: 2 }).default('0'),
  monthlyUsers: integer('monthly_users').default(0),
  estimatedValue: decimal('estimated_value', { precision: 14, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Listings Table
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'set null' }),
  sellerId: uuid('seller_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  longDescription: text('long_description'),
  category: varchar('category', { length: 100 }),
  imageUrl: text('image_url'),
  screenshots: text('screenshots').array(),
  demoVideoUrl: text('demo_video_url'),
  techStack: text('tech_stack').array(),
  repositoryUrl: text('repository_url'),
  documentationUrl: text('documentation_url'),
  appStoreUrl: text('app_store_url'),
  playStoreUrl: text('play_store_url'),
  storeMetadata: jsonb('store_metadata').default('{}'),
  askingPrice: decimal('asking_price', { precision: 14, scale: 2 }),
  monthlyRevenue: decimal('monthly_revenue', { precision: 12, scale: 2 }),
  totalUsers: integer('total_users').default(0),
  ageMonths: integer('age_months').default(0),
  revenueVerified: boolean('revenue_verified').default(false).notNull(),
  listingType: listingTypeEnum('listing_type').default('sale').notNull(),
  targetRaise: decimal('target_raise', { precision: 14, scale: 2 }),
  equityAvailable: decimal('equity_available', { precision: 5, scale: 2 }),
  trafficMetrics: jsonb('traffic_metrics').default('{}'),
  unitEconomics: jsonb('unit_economics').default('{}'),
  handoverReadiness: jsonb('handover_readiness').default('{}'),
  status: listingStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appCoowners = pgTable('app_coowners', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('co_founder').notNull(),
  equityPct: decimal('equity_pct', { precision: 5, scale: 2 }).default('0').notNull(),
  vestingStart: timestamp('vesting_start'),
  cliffDate: timestamp('cliff_date'),
  vestingMonths: integer('vesting_months').default(48).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  joinedAt: timestamp('joined_at'),
  leftAt: timestamp('left_at'),
  ipAssigned: boolean('ip_assigned').default(false).notNull(),
}, (table) => [
  index('idx_app_coowners_app').on(table.appId),
  index('idx_app_coowners_user').on(table.userId),
  index('idx_app_coowners_email').on(table.email),
  uniqueIndex('ux_app_coowners_app_user').on(table.appId, table.userId).where(sql`${table.userId} IS NOT NULL`),
]);

export const appWorkspaces = pgTable('app_workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  iconUrl: text('icon_url'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  sourceType: varchar('source_type', { length: 50 }).default('manual').notNull(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }).unique(),
  sourceIdeaId: uuid('source_idea_id'),
  importedStoreAppId: uuid('imported_store_app_id'),
  setupState: jsonb('setup_state').default(sql`'{}'::jsonb`).notNull(),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_app_workspaces_owner').on(table.ownerId),
  index('idx_app_workspaces_status').on(table.status),
  index('idx_app_workspaces_listing').on(table.listingId),
  index('idx_app_workspaces_source_idea').on(table.sourceIdeaId),
  index('idx_app_workspaces_imported_store_app').on(table.importedStoreAppId),
]);

export const importedStoreApps = pgTable('imported_store_apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: varchar('platform', { length: 30 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  externalAppId: varchar('external_app_id', { length: 255 }),
  bundleId: varchar('bundle_id', { length: 255 }),
  packageName: varchar('package_name', { length: 255 }),
  storeUrl: text('store_url').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  developer: varchar('developer', { length: 255 }),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  iconUrl: text('icon_url'),
  artworkUrl: text('artwork_url'),
  screenshots: jsonb('screenshots').default(sql`'[]'::jsonb`).notNull(),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count'),
  priceText: varchar('price_text', { length: 100 }),
  version: varchar('version', { length: 100 }),
  releaseDate: date('release_date'),
  storeUpdatedAt: timestamp('store_updated_at'),
  rawMetadata: jsonb('raw_metadata').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_imported_store_apps_owner').on(table.ownerId),
  index('idx_imported_store_apps_provider_external').on(table.provider, table.externalAppId),
  index('idx_imported_store_apps_bundle').on(table.bundleId),
  index('idx_imported_store_apps_package').on(table.packageName),
  uniqueIndex('ux_imported_store_apps_owner_provider_external').on(table.ownerId, table.provider, table.externalAppId),
  uniqueIndex('ux_imported_store_apps_owner_store_url').on(table.ownerId, table.storeUrl),
]);

export const appWorkspaceMembers = pgTable('app_workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => appWorkspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('shareholder').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  removedAt: timestamp('removed_at'),
  permissions: jsonb('permissions').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_app_workspace_members_workspace').on(table.workspaceId),
  index('idx_app_workspace_members_user').on(table.userId),
  index('idx_app_workspace_members_role').on(table.role),
  index('idx_app_workspace_members_status').on(table.status),
  uniqueIndex('ux_app_workspace_members_workspace_user').on(table.workspaceId, table.userId),
]);

export const appWorkspaceSetup = pgTable('app_workspace_setup', {
  workspaceId: uuid('workspace_id').references(() => appWorkspaces.id, { onDelete: 'cascade' }).primaryKey(),
  profileCompletedAt: timestamp('profile_completed_at'),
  importCompletedAt: timestamp('import_completed_at'),
  listingConnectedAt: timestamp('listing_connected_at'),
  ideaConnectedAt: timestamp('idea_connected_at'),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  checklist: jsonb('checklist').default(sql`'{}'::jsonb`).notNull(),
  lifecycleState: jsonb('lifecycle_state').default(sql`'{}'::jsonb`).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appWorkspaceIdempotencyKeys = pgTable('app_workspace_idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  operation: varchar('operation', { length: 80 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
  requestHash: text('request_hash'),
  workspaceId: uuid('workspace_id').references(() => appWorkspaces.id, { onDelete: 'set null' }),
  response: jsonb('response').default(sql`'{}'::jsonb`).notNull(),
  status: varchar('status', { length: 30 }).default('started').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').default(sql`NOW() + INTERVAL '24 hours'`).notNull(),
}, (table) => [
  index('idx_app_workspace_idempotency_user_operation').on(table.userId, table.operation),
  index('idx_app_workspace_idempotency_workspace').on(table.workspaceId),
  index('idx_app_workspace_idempotency_expires').on(table.expiresAt),
  uniqueIndex('ux_app_workspace_idempotency_user_operation_key').on(table.userId, table.operation, table.idempotencyKey),
]);

export const appWorkspaceAuditLog = pgTable('app_workspace_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => appWorkspaces.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  subjectType: varchar('subject_type', { length: 80 }),
  subjectId: uuid('subject_id'),
  details: jsonb('details').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_app_workspace_audit_log_workspace').on(table.workspaceId),
  index('idx_app_workspace_audit_log_actor').on(table.actorId),
  index('idx_app_workspace_audit_log_action').on(table.action),
  index('idx_app_workspace_audit_log_created').on(table.createdAt),
]);

export const appMembers = pgTable('app_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('shareholder').notNull(),
  equityPct: decimal('equity_pct', { precision: 5, scale: 2 }).default('0'),
  sharesOwned: decimal('shares_owned', { precision: 15, scale: 2 }).default('0'),
  status: varchar('status', { length: 50 }).default('active'),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  removedAt: timestamp('removed_at'),
  permissions: jsonb('permissions').default(sql`'{}'::jsonb`),
}, (table) => [
  index('idx_app_members_app').on(table.appId),
  index('idx_app_members_user').on(table.userId),
  index('idx_app_members_role').on(table.role),
  index('idx_app_members_status').on(table.status),
  uniqueIndex('ux_app_members_app_user').on(table.appId, table.userId),
]);

// Offers Table
export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  message: text('message'),
  status: offerStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Campaigns Table (UGC Promote)
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  goalType: varchar('goal_type', { length: 50 }),
  goalValue: integer('goal_value').notNull(),
  totalBudget: decimal('total_budget', { precision: 12, scale: 2 }).notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  creatives: jsonb('creatives'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// App Metrics
export const appMetrics = pgTable('app_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').notNull(),
  dau: integer('dau').default(0),
  mrr: decimal('mrr', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// CEO API Keys
export const ceoApiKeys = pgTable('ceo_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Stores a SHA-256 hash of the key, never the raw secret. The plaintext key
  // is shown to the user only once, at creation time.
  apiKey: varchar('api_key', { length: 255 }).notNull().unique(),
  // Masked, non-secret hint for the dashboard (e.g. "mvp_ceo_…a1b2").
  keyPreview: varchar('key_preview', { length: 64 }),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// App Lifecycle Progress
export const appLifecycle = pgTable('app_lifecycle', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull().unique(),
  currentStepId: varchar('current_step_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('in_progress').notNull(), // in_progress, completed, stalled
  completionPercentage: integer('completion_percentage').default(0).notNull(),
  lastUpdatedBy: uuid('last_updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Predefined Lifecycle Steps
export const lifecycleSteps = pgTable('lifecycle_steps', {
  id: varchar('id', { length: 50 }).primaryKey(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
});

// Social Media Accounts
export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(), // 'x', 'instagram', 'tiktok'
  platformUserId: varchar('platform_user_id', { length: 255 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  username: varchar('username', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// App Store Connect integration — one API key per app. The private key (.p8)
// is stored encrypted at rest via TokenCryptoService and never returned to the
// client. Auth uses the App Store Connect API (ES256 JWT), not OAuth.
export const appStoreConnections = pgTable('app_store_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  issuerId: varchar('issuer_id', { length: 255 }).notNull(),
  keyId: varchar('key_id', { length: 20 }).notNull(),
  // AES-256-GCM ciphertext of the .p8 PEM (see TokenCryptoService).
  privateKey: text('private_key').notNull(),
  vendorNumber: varchar('vendor_number', { length: 50 }),
  teamName: varchar('team_name', { length: 255 }),
  // 'connected' | 'invalid' | 'expired'
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  appCount: integer('app_count'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // At most one App Store Connect key per app.
  appUnique: uniqueIndex('ux_app_store_connections_app_id').on(table.appId),
}));

// Daily App Store metrics snapshot, pulled from the App Store Connect API
// (downloads/proceeds from SALES reports) and the public iTunes lookup
// (ratings). One row per (our app, Apple app, day); re-syncs upsert the day.
export const appStoreMetrics = pgTable('app_store_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  appleAppId: varchar('apple_app_id', { length: 64 }).notNull(),
  appleAppName: varchar('apple_app_name', { length: 255 }),
  bundleId: varchar('bundle_id', { length: 255 }),
  metricDate: date('metric_date').notNull(),
  downloads: integer('downloads'),
  proceedsAmount: decimal('proceeds_amount', { precision: 14, scale: 2 }),
  proceedsCurrency: varchar('proceeds_currency', { length: 10 }),
  ratingAverage: decimal('rating_average', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count'),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dayUnique: uniqueIndex('ux_app_store_metrics_app_apple_date').on(
    table.appId,
    table.appleAppId,
    table.metricDate,
  ),
  appIdx: index('idx_app_store_metrics_app').on(table.appId),
}));

// Video Posts for Auto-Posting
export const videoPosts = pgTable('video_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileUrl: text('file_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'), // in seconds
  caption: text('caption'),
  platforms: text('platforms').array(), // ['instagram', 'tiktok', 'twitter', 'youtube']
  status: varchar('status', { length: 50 }).default('uploading'), // uploading, processing, posted, failed
  platformPosts: jsonb('platform_posts'), // { instagram: { postId, url, status }, tiktok: {...} }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Scheduled Posts for Calendar
export const scheduledPosts = pgTable('scheduled_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  mediaUrls: text('media_urls').array(),
  platforms: text('platforms').array(), // ['instagram', 'tiktok', 'twitter']
  scheduledAt: timestamp('scheduled_at').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  status: varchar('status', { length: 50 }).default('pending'), // pending, published, failed, cancelled
  publishedAt: timestamp('published_at'),
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: varchar('recurrence_rule', { length: 100 }), // daily, weekly, monthly
  parentPostId: uuid('parent_post_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Advanced Automations (Visual Builder)
export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  flowData: jsonb('flow_data').notNull(), // Visual flow structure with nodes and edges
  triggers: jsonb('triggers'), // [{ type: 'keyword', value: '...', platform: '...' }]
  status: varchar('status', { length: 20 }).default('draft'), // draft, active, paused
  stats: jsonb('stats').default('{}'), // { triggers: 0, conversions: 0 }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Tags for Automation
export const userTags = pgTable('user_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  platformUserId: varchar('platform_user_id', { length: 255 }).notNull(),
  tags: text('tags').array().default(sql`'{}'::text[]`),
  attributes: jsonb('attributes').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Automation Rules (ManyChat Style)
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'keyword', 'new_follower', 'mention'
  triggerValue: text('trigger_value'), // e.g. "price", "demo"
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'auto_reply', 'dm', 'notify_admin'
  actionPayload: jsonb('action_payload'), // { message: "Hello!", mediaUrl: "..." }
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Talent Hire Requests (CEO hiring UGC)
export const talentHireRequests = pgTable('talent_hire_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  ceoId: uuid('ceo_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  talentId: uuid('talent_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  proposal: text('proposal').notNull(),
  budget: decimal('budget', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'accepted', 'rejected', 'completed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Talent Portfolios
export const talentPortfolios = pgTable('talent_portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  talentId: uuid('talent_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  skills: text('skills').array().default(sql`'{}'::text[]`),
  experienceYears: integer('experience_years').default(0),
  bio: text('bio'),
  portfolioLinks: text('portfolio_links').array().default(sql`'{}'::text[]`),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 30 }).default('pending_review').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// UGC Submissions
export const ugcSubmissions = pgTable('ugc_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  submitterId: uuid('submitter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  appId: uuid('app_id').references(() => apps.id),
  platform: varchar('platform', { length: 50 }).notNull(),
  mediaUrl: text('media_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  caption: text('caption'),
  engagementStats: jsonb('engagement_stats').default('{}'),
  followers: integer('followers').default(0),
  status: varchar('status', { length: 30 }).default('pending_review').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════════════════
// APP IDEAS - Crowdfunding Ideation Pipeline
// ═══════════════════════════════════════════════════════════════════════════

export const appIdeas = pgTable('app_ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description').notNull(),
  category: appCategoryEnum('category').default('other').notNull(),
  platform: appPlatformEnum('platform').default('mobile').notNull(),
  targetAudience: text('target_audience'),
  features: jsonb('features').default(sql`'[]'::jsonb`),
  status: ideaStatusEnum('status').default('draft').notNull(),
  prdDocument: jsonb('prd_document'),
  designMockups: jsonb('design_mockups').default(sql`'[]'::jsonb`),
  prototypeUrl: text('prototype_url'),
  costEstimate: decimal('cost_estimate', { precision: 14, scale: 2 }),
  costBreakdown: jsonb('cost_breakdown'),
  timelineWeeks: integer('timeline_weeks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_app_ideas_owner').on(table.ownerId),
  index('idx_app_ideas_status').on(table.status),
  index('idx_app_ideas_slug').on(table.slug),
]);

export const designMockups = pgTable('design_mockups', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }).notNull(),
  nodeId: varchar('node_id', { length: 255 }),
  screenName: varchar('screen_name', { length: 255 }).notNull(),
  screenType: screenTypeEnum('screen_type').default('phone').notNull(),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  figmaUrl: text('figma_url'),
  orderIndex: integer('order_index').default(0),
  annotations: jsonb('annotations').default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_design_mockups_idea').on(table.ideaId),
  index('idx_design_mockups_node').on(table.nodeId),
]);


export const designGenerationProgress = pgTable('design_generation_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  nodeId: varchar('node_id', { length: 255 }).notNull(),
  jobId: uuid('job_id'),
  status: varchar('status', { length: 50 }).default('queued').notNull(),
  progress: integer('progress').default(0).notNull(),
  imageUrl: text('image_url'),
  error: text('error'),
  promptVersion: varchar('prompt_version', { length: 80 }).default('design-prompt-v1').notNull(),
  provider: varchar('provider', { length: 50 }),
  model: varchar('model', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_design_progress_idea').on(table.ideaId),
  index('idx_design_progress_owner').on(table.ownerId),
  uniqueIndex('ux_design_progress_idea_node_prompt').on(table.ideaId, table.nodeId, table.promptVersion),
]);

export const prdVersions = pgTable('prd_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }).notNull(),
  version: integer('version').notNull(),
  content: jsonb('content').notNull(),
  generatedBy: varchar('generated_by', { length: 50 }).default('ai'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_prd_versions_idea').on(table.ideaId),
]);

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  jobType: generationJobTypeEnum('job_type').notNull(),
  status: generationJobStatusEnum('status').default('queued').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 180 }),
  provider: varchar('provider', { length: 50 }),
  model: varchar('model', { length: 100 }),
  promptVersion: varchar('prompt_version', { length: 50 }).default('v1').notNull(),
  input: jsonb('input').default(sql`'{}'::jsonb`),
  output: jsonb('output').default(sql`'{}'::jsonb`),
  error: text('error'),
  retryCount: integer('retry_count').default(0).notNull(),
  costUnits: integer('cost_units').default(0).notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_generation_jobs_owner').on(table.ownerId),
  index('idx_generation_jobs_idea').on(table.ideaId),
  index('idx_generation_jobs_status').on(table.status),
  index('idx_generation_jobs_type').on(table.jobType),
  uniqueIndex('ux_generation_jobs_owner_idempotency').on(table.ownerId, table.idempotencyKey),
]);

export const generatedArtifacts = pgTable('generated_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => generationJobs.id, { onDelete: 'set null' }),
  artifactType: generatedArtifactTypeEnum('artifact_type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  content: jsonb('content').default(sql`'{}'::jsonb`).notNull(),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_generated_artifacts_owner').on(table.ownerId),
  index('idx_generated_artifacts_idea').on(table.ideaId),
  index('idx_generated_artifacts_job').on(table.jobId),
  index('idx_generated_artifacts_type').on(table.artifactType),
]);

export const repoLinks = pgTable('repo_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).default('github').notNull(),
  repoUrl: text('repo_url').notNull(),
  branch: varchar('branch', { length: 255 }),
  commitSha: varchar('commit_sha', { length: 80 }),
  pullRequestUrl: text('pull_request_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_repo_links_owner').on(table.ownerId),
  index('idx_repo_links_idea').on(table.ideaId),
  index('idx_repo_links_app').on(table.appId),
]);

export const qualityReports = pgTable('quality_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  artifactId: uuid('artifact_id').references(() => generatedArtifacts.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 40 }).default('pending').notNull(),
  lintStatus: varchar('lint_status', { length: 40 }).default('not_run').notNull(),
  typecheckStatus: varchar('typecheck_status', { length: 40 }).default('not_run').notNull(),
  testStatus: varchar('test_status', { length: 40 }).default('not_run').notNull(),
  securityStatus: varchar('security_status', { length: 40 }).default('not_run').notNull(),
  accessibilityStatus: varchar('accessibility_status', { length: 40 }).default('not_run').notNull(),
  summary: text('summary'),
  logs: jsonb('logs').default(sql`'[]'::jsonb`),
  provider: varchar('provider', { length: 50 }),
  model: varchar('model', { length: 100 }),
  idempotencyKey: varchar('idempotency_key', { length: 180 }),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_quality_reports_owner').on(table.ownerId),
  index('idx_quality_reports_idea').on(table.ideaId),
  index('idx_quality_reports_artifact').on(table.artifactId),
]);

export const reviewSubmissions = pgTable('review_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  submittedBy: uuid('submitted_by').references(() => users.id, { onDelete: 'set null' }),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  artifactId: uuid('artifact_id').references(() => generatedArtifacts.id, { onDelete: 'set null' }),
  qualityReportId: uuid('quality_report_id').references(() => qualityReports.id, { onDelete: 'set null' }),
  itemType: varchar('item_type', { length: 60 }).default('generated_code').notNull(),
  status: reviewSubmissionStatusEnum('status').default('pending_review').notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  decisionReason: text('decision_reason'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_review_submissions_owner').on(table.ownerId),
  index('idx_review_submissions_idea').on(table.ideaId),
  index('idx_review_submissions_status').on(table.status),
  index('idx_review_submissions_type').on(table.itemType),
]);

export const ideaAttachments = pgTable('idea_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_idea_attachments_idea').on(table.ideaId),
]);

// ═══════════════════════════════════════════════════════════════════════════
// CROWDFUNDING - Campaigns, Investments, Escrow
// ═══════════════════════════════════════════════════════════════════════════

export const fundingTypeEnum = pgEnum('funding_type', ['pay_once', 'split']);
export const crowdfundingStatusEnum = pgEnum('crowdfunding_status', [
  'draft', 'pending_review', 'active', 'funded',
  'partially_funded', 'failed', 'cancelled', 'expired'
]);
export const commitmentStatusEnum = pgEnum('commitment_status', [
  'pending', 'processing', 'paid', 'escrow_held',
  'released', 'refunding', 'refunded', 'cancelled', 'failed'
]);
export const escrowStatusEnum = pgEnum('escrow_status', [
  'active', 'holding', 'releasing', 'released', 'refunding', 'refunded', 'closed'
]);
export const shareTypeEnum = pgEnum('share_type', ['public', 'private', 'single_use']);

export const crowdfundingCampaigns = pgTable('crowdfunding_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').references(() => appIdeas.id, { onDelete: 'set null' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'set null' }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  longDescription: text('long_description'),
  coverImageUrl: text('cover_image_url'),
  videoUrl: text('video_url'),
  
  fundingGoal: decimal('funding_goal', { precision: 14, scale: 2 }).notNull(),
  fundingRaised: decimal('funding_raised', { precision: 14, scale: 2 }).default('0.00').notNull(),
  minInvestment: decimal('min_investment', { precision: 10, scale: 2 }).default('100.00'),
  maxInvestment: decimal('max_investment', { precision: 14, scale: 2 }),
  
  equityOfferedPct: decimal('equity_offered_pct', { precision: 5, scale: 2 }).notNull(),
  preMoneyValuation: decimal('pre_money_valuation', { precision: 14, scale: 2 }).notNull(),
  platformFeePct: decimal('platform_fee_pct', { precision: 4, scale: 2 }).default('5.00'),
  
  fundingType: fundingTypeEnum('funding_type').default('split').notNull(),
  status: crowdfundingStatusEnum('status').default('draft').notNull(),
  
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  fundedAt: timestamp('funded_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  
  maxInvestors: integer('max_investors').default(100),
  currentInvestorCount: integer('current_investor_count').default(0),
  
  isPublic: boolean('is_public').default(false),
  shareToken: varchar('share_token', { length: 64 }).unique(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_crowdfunding_owner').on(table.ownerId),
  index('idx_crowdfunding_status').on(table.status),
  index('idx_crowdfunding_slug').on(table.slug),
  index('idx_crowdfunding_share_token').on(table.shareToken),
]);

export const investmentCommitments = pgTable('investment_commitments', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => crowdfundingCampaigns.id, { onDelete: 'cascade' }).notNull(),
  investorId: uuid('investor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  stakePct: decimal('stake_pct', { precision: 5, scale: 4 }).notNull(),
  valuationAtCommitment: decimal('valuation_at_commitment', { precision: 14, scale: 2 }).notNull(),
  
  status: commitmentStatusEnum('status').default('pending').notNull(),
  paymentProvider: varchar('payment_provider', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 255 }),
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
  paymentCurrency: varchar('payment_currency', { length: 10 }),
  paymentVerifiedAt: timestamp('payment_verified_at'),
  paymentFinalizedAt: timestamp('payment_finalized_at'),
  paymentMetadata: jsonb('payment_metadata').default('{}'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  stripeReceiptUrl: text('stripe_receipt_url'),
  
  committedAt: timestamp('committed_at').defaultNow(),
  paidAt: timestamp('paid_at'),
  refundedAt: timestamp('refunded_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_commitments_campaign').on(table.campaignId),
  index('idx_commitments_investor').on(table.investorId),
  index('idx_commitments_status').on(table.status),
  uniqueIndex('ux_commitments_payment_reference').on(table.paymentProvider, table.paymentReference).where(sql`${table.paymentReference} IS NOT NULL`),
]);

export const appInvestmentHoldings = pgTable('app_investment_holdings', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  campaignId: uuid('campaign_id').references(() => crowdfundingCampaigns.id, { onDelete: 'cascade' }).notNull(),
  commitmentId: uuid('commitment_id').references(() => investmentCommitments.id, { onDelete: 'cascade' }).notNull(),
  investorId: uuid('investor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  stakePct: decimal('stake_pct', { precision: 5, scale: 4 }).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  acquiredAt: timestamp('acquired_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_app_investment_holdings_commitment').on(table.commitmentId),
  index('idx_app_investment_holdings_app').on(table.appId),
  index('idx_app_investment_holdings_investor').on(table.investorId),
]);

export const escrowAccounts = pgTable('escrow_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => crowdfundingCampaigns.id, { onDelete: 'cascade' }).notNull(),
  
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 255 }).notNull(),
  
  totalCommitted: decimal('total_committed', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalHeld: decimal('total_held', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalReleased: decimal('total_released', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalRefunded: decimal('total_refunded', { precision: 14, scale: 2 }).default('0.00').notNull(),
  
  platformFeesEarned: decimal('platform_fees_earned', { precision: 14, scale: 2 }).default('0.00').notNull(),
  
  status: escrowStatusEnum('status').default('active').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
  fullyRefundedAt: timestamp('fully_refunded_at'),
}, (table) => [
  index('idx_escrow_campaign').on(table.campaignId),
  index('idx_escrow_status').on(table.status),
]);

export const campaignShares = pgTable('campaign_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => crowdfundingCampaigns.id, { onDelete: 'cascade' }).notNull(),
  
  shareToken: varchar('share_token', { length: 64 }).unique().notNull(),
  shareType: shareTypeEnum('share_type').default('public').notNull(),
  
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').default(0),
  expiresAt: timestamp('expires_at'),
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }).notNull(),
  viewCount: integer('view_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_shares_campaign').on(table.campaignId),
  index('idx_shares_token').on(table.shareToken),
]);

// ═══════════════════════════════════════════════════════════════════════════
// DEVELOPMENT TRACKING - Phases, Milestones, Tasks, Deployments
// ═══════════════════════════════════════════════════════════════════════════

export const phaseStatusEnum = pgEnum('phase_status', [
  'not_started', 'in_progress', 'completed', 'blocked', 'skipped'
]);
export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending', 'in_progress', 'completed', 'blocked', 'overdue', 'cancelled'
]);
export const taskStatusEnum = pgEnum('task_status', [
  'todo', 'in_progress', 'done', 'blocked', 'cancelled'
]);
export const updateVisibilityEnum = pgEnum('update_visibility', [
  'owner_only', 'investors', 'public'
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'milestone_completed', 'milestone_approved', 'phase_started', 'phase_completed',
  'update_posted', 'app_launched', 'deployment_submitted', 'deployment_approved',
  'deployment_rejected', 'blocker_reported', 'blocker_resolved'
]);
export const deploymentPlatformEnum = pgEnum('deployment_platform', [
  'ios', 'android', 'web', 'desktop'
]);
export const deploymentStatusEnum = pgEnum('deployment_status', [
  'preparing', 'submitted', 'in_review', 'approved', 'rejected', 'live'
]);
export const teamRoleEnum = pgEnum('team_role', [
  'lead_developer', 'developer', 'designer', 'project_manager', 'qa_engineer', 'devops'
]);
export const teamMemberStatusEnum = pgEnum('team_member_status', [
  'active', 'inactive', 'removed'
]);
export const appDevStatusEnum = pgEnum('app_dev_status', [
  'not_started', 'planning', 'design', 'development', 'testing',
  'pre_launch', 'launched', 'paused', 'cancelled'
]);

export const developmentPhases = pgTable('development_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  
  phaseNumber: integer('phase_number').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  estimatedEndDate: timestamp('estimated_end_date'),
  
  status: phaseStatusEnum('status').default('not_started').notNull(),
  completionPct: integer('completion_pct').default(0),
  
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_phases_app').on(table.appId),
  index('idx_phases_status').on(table.status),
]);

export const developmentMilestones = pgTable('development_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id').references(() => developmentPhases.id, { onDelete: 'cascade' }).notNull(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  
  status: milestoneStatusEnum('status').default('pending').notNull(),
  
  requiresOwnerApproval: boolean('requires_owner_approval').default(false),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  
  orderIndex: integer('order_index').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_milestones_phase').on(table.phaseId),
  index('idx_milestones_app').on(table.appId),
  index('idx_milestones_status').on(table.status),
]);

export const developmentTasks = pgTable('development_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  milestoneId: uuid('milestone_id').references(() => developmentMilestones.id, { onDelete: 'cascade' }).notNull(),
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  status: taskStatusEnum('status').default('todo').notNull(),
  
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  
  estimatedHours: decimal('estimated_hours', { precision: 6, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 6, scale: 2 }),
  
  orderIndex: integer('order_index').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('idx_tasks_milestone').on(table.milestoneId),
  index('idx_tasks_assigned').on(table.assignedTo),
  index('idx_tasks_status').on(table.status),
]);

export const progressUpdates = pgTable('progress_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  
  phaseId: uuid('phase_id').references(() => developmentPhases.id, { onDelete: 'set null' }),
  milestoneId: uuid('milestone_id').references(() => developmentMilestones.id, { onDelete: 'set null' }),
  
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  
  attachments: jsonb('attachments').default(sql`'[]'::jsonb`),
  visibility: updateVisibilityEnum('visibility').default('investors').notNull(),
  
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  
  viewCount: integer('view_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_updates_app').on(table.appId),
  index('idx_updates_visibility').on(table.visibility),
  index('idx_updates_created').on(table.createdAt),
]);

export const investorNotifications = pgTable('investor_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  investorId: uuid('investor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  
  relatedEntityType: varchar('related_entity_type', { length: 50 }),
  relatedEntityId: uuid('related_entity_id'),
  
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),
  
  emailSent: boolean('email_sent').default(false),
  emailSentAt: timestamp('email_sent_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_notifications_investor').on(table.investorId),
  index('idx_notifications_app').on(table.appId),
  index('idx_notifications_read').on(table.read),
  index('idx_notifications_created').on(table.createdAt),
]);

export const deploymentRecords = pgTable('deployment_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  
  platform: deploymentPlatformEnum('platform').notNull(),
  
  storeUrl: text('store_url'),
  downloadUrl: text('download_url'),
  
  version: varchar('version', { length: 50 }).notNull(),
  buildNumber: integer('build_number').notNull(),
  
  status: deploymentStatusEnum('status').default('preparing').notNull(),
  
  submittedAt: timestamp('submitted_at'),
  reviewStartedAt: timestamp('review_started_at'),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  
  liveAt: timestamp('live_at'),
  
  notes: text('notes'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_deployments_app').on(table.appId),
  index('idx_deployments_platform').on(table.platform),
  index('idx_deployments_status').on(table.status),
]);

export const appTeamMembers = pgTable('app_team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  role: teamRoleEnum('role').notNull(),
  
  canUpdateProgress: boolean('can_update_progress').default(false),
  canPostUpdates: boolean('can_post_updates').default(false),
  canManageTasks: boolean('can_manage_tasks').default(false),
  
  status: teamMemberStatusEnum('status').default('active').notNull(),
  
  addedAt: timestamp('added_at').defaultNow().notNull(),
  removedAt: timestamp('removed_at'),
}, (table) => [
  index('idx_team_app').on(table.appId),
  index('idx_team_user').on(table.userId),
]);

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY - Forums, Topics, Posts, Votes, User Stats
// ═══════════════════════════════════════════════════════════════════════════

export const communityForumStatusEnum = pgEnum('community_forum_status', ['active', 'archived']);
export const voteTypeEnum = pgEnum('vote_type', ['upvote', 'downvote']);

export const communityForums = pgTable('community_forums', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  sortOrder: integer('sort_order').default(0),
  status: communityForumStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_forums_slug').on(table.slug),
  index('idx_forums_status').on(table.status),
  index('idx_forums_sort').on(table.sortOrder),
]);

export const communityTopics = pgTable('community_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  forumId: uuid('forum_id').references(() => communityForums.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  
  isPinned: boolean('is_pinned').default(false).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  isSolved: boolean('is_solved').default(false).notNull(),
  
  viewCount: integer('view_count').default(0).notNull(),
  replyCount: integer('reply_count').default(0).notNull(),
  
  tags: text('tags').array().default(sql`'{}'::text[]`),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_topics_forum').on(table.forumId),
  index('idx_topics_user').on(table.userId),
  index('idx_topics_slug').on(table.slug),
  index('idx_topics_pinned').on(table.isPinned),
  index('idx_topics_created').on(table.createdAt),
]);

export const communityPosts = pgTable('community_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').references(() => communityTopics.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  parentId: uuid('parent_id'),
  
  content: text('content').notNull(),
  isAcceptedAnswer: boolean('is_accepted_answer').default(false).notNull(),
  
  voteCount: integer('vote_count').default(0).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_posts_topic').on(table.topicId),
  index('idx_posts_user').on(table.userId),
  index('idx_posts_parent').on(table.parentId),
  index('idx_posts_accepted').on(table.isAcceptedAnswer),
  index('idx_posts_created').on(table.createdAt),
]);

export const communityVotes = pgTable('community_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  targetType: varchar('target_type', { length: 20 }).notNull(),
  targetId: uuid('target_id').notNull(),
  voteType: voteTypeEnum('vote_type').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_votes_user').on(table.userId),
  index('idx_votes_target').on(table.targetType, table.targetId),
]);

export const communityUserStats = pgTable('community_user_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  reputation: integer('reputation').default(0).notNull(),
  topicsCount: integer('topics_count').default(0).notNull(),
  postsCount: integer('posts_count').default(0).notNull(),
  upvotesReceived: integer('upvotes_received').default(0).notNull(),
  downvotesReceived: integer('downvotes_received').default(0).notNull(),
  answersAccepted: integer('answers_accepted').default(0).notNull(),
  
  isVerified: boolean('is_verified').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_user_stats_user').on(table.userId),
  index('idx_user_stats_reputation').on(table.reputation),
]);

export const communityBookmarks = pgTable('community_bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid('topic_id').references(() => communityTopics.id, { onDelete: 'cascade' }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bookmarks_user').on(table.userId),
  index('idx_bookmarks_topic').on(table.topicId),
]);

// ─── Stripe webhook persistence ───────────────────────────────────────────────

// One row per Stripe dispute, upserted by stripeDisputeId as the dispute moves
// through its lifecycle (created → updated → closed/won/lost).
export const stripeDisputes = pgTable('stripe_disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeDisputeId: varchar('stripe_dispute_id', { length: 255 }).notNull().unique(),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  // Connected account the dispute belongs to (event.account), if any.
  connectedAccountId: varchar('connected_account_id', { length: 255 }),
  // Best-effort resolution of the owning user/app via stripe_account_id.
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(), // smallest currency unit (e.g. cents)
  currency: varchar('currency', { length: 10 }).notNull(),
  reason: varchar('reason', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull(),
  evidenceDueBy: timestamp('evidence_due_by'),
  rawEvent: jsonb('raw_event').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_stripe_disputes_user').on(table.userId),
  index('idx_stripe_disputes_app').on(table.appId),
  index('idx_stripe_disputes_account').on(table.connectedAccountId),
  index('idx_stripe_disputes_status').on(table.status),
]);

// Current state of each Stripe subscription, upserted by stripeSubscriptionId
// from customer.subscription.* events. Powers stored MRR without live calls.
export const stripeSubscriptions = pgTable('stripe_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  connectedAccountId: varchar('connected_account_id', { length: 255 }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull(),
  priceId: varchar('price_id', { length: 255 }),
  productId: varchar('product_id', { length: 255 }),
  currency: varchar('currency', { length: 10 }),
  unitAmount: integer('unit_amount'), // per-interval price, smallest unit
  interval: varchar('interval', { length: 20 }), // day | week | month | year
  intervalCount: integer('interval_count').default(1),
  quantity: integer('quantity').default(1),
  // Normalised monthly recurring revenue for this subscription, smallest unit.
  mrrAmount: integer('mrr_amount').default(0).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  rawEvent: jsonb('raw_event').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_stripe_subscriptions_user').on(table.userId),
  index('idx_stripe_subscriptions_app').on(table.appId),
  index('idx_stripe_subscriptions_account').on(table.connectedAccountId),
  index('idx_stripe_subscriptions_status').on(table.status),
]);
