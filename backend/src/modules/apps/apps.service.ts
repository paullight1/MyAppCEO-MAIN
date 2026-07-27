import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { and, eq, or } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import {
  appCoowners,
  appMembers,
  apps,
  appWorkspaceAuditLog,
  appWorkspaceIdempotencyKeys,
  appWorkspaceMembers,
  appWorkspaces,
  appWorkspaceSetup,
  importedStoreApps,
  listings,
  users,
} from '../../database/schema';
import { CreateManagedAppDto, InviteCoownerDto, UpdateCoownerDto } from './dto/managed-app.dto';

@Injectable()
export class AppsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async createManagedApp(
    dto: CreateManagedAppDto,
    ownerId: string,
    headerIdempotencyKey?: string,
    sourceOverride?: { sourceType?: string; sourceIdeaId?: string },
  ) {
    if (!dto.ownerConfirmed || !dto.dataConfirmed || !dto.termsAccepted) {
      throw new BadRequestException('Ownership, data accuracy, and terms confirmations are required');
    }

    const idempotencyKey = headerIdempotencyKey || dto.idempotencyKey || this.getManagedAppIdempotencyKey(dto);
    const requestHash = this.hashJson({
      name: dto.name?.trim(),
      category: dto.category,
      websiteUrl: dto.websiteUrl,
      playStoreUrl: dto.playStoreUrl,
      appStoreUrl: dto.appStoreUrl,
      otherStoreUrl: dto.otherStoreUrl,
      repoUrl: dto.repoUrl,
      storeMetadata: dto.storeMetadata,
    });
    const existingIdempotency = await this.db
      .select()
      .from(appWorkspaceIdempotencyKeys)
      .where(
        and(
          eq(appWorkspaceIdempotencyKeys.userId, ownerId),
          eq(appWorkspaceIdempotencyKeys.operation, 'managed_app_create'),
          eq(appWorkspaceIdempotencyKeys.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existingIdempotency[0]?.status === 'succeeded' && existingIdempotency[0].response) {
      return existingIdempotency[0].response;
    }

    const appSlug = await this.uniqueSlug(apps, this.slugify(dto.name));
    const listingSlug = await this.uniqueSlug(listings, `${appSlug}-listing`);
    const status = this.toAppStatus(dto.stage);
    const monthlyRevenue = this.toDecimalString(dto.monthlyRevenue);
    const monthlyUsers = this.toUserCount(dto.users);
    const description = dto.description?.trim() || '';
    const storeMetadata = dto.storeMetadata || {};
    const storeUrl = dto.appStoreUrl || dto.playStoreUrl || dto.otherStoreUrl || null;

    const duplicateWorkspace = await this.findDuplicateWorkspace(ownerId, dto.name, storeUrl);
    if (duplicateWorkspace) {
      const response = {
        app: this.mapWorkspaceApp(duplicateWorkspace, 'owner'),
        listing: duplicateWorkspace.listingId ? { id: duplicateWorkspace.listingId } : null,
      };
      await this.upsertIdempotency(ownerId, idempotencyKey, requestHash, duplicateWorkspace.id, response, 'succeeded');
      return response;
    }

    try {
      return await this.db.transaction(async (tx: any) => {
        const [app] = await tx
          .insert(apps)
          .values({
            ownerId,
            name: dto.name.trim(),
            slug: appSlug,
            description,
            category: dto.category || dto.assetType || 'App',
            status,
            monthlyRevenue,
            monthlyUsers,
          })
          .returning();

        const [listing] = await tx
          .insert(listings)
          .values({
            appId: app.id,
            sellerId: ownerId,
            name: dto.name.trim(),
            slug: listingSlug,
            shortDescription: this.shortText(description),
            longDescription: description,
            category: dto.category || dto.assetType || 'App',
            imageUrl: storeMetadata.iconUrl || storeMetadata.artworkUrl || null,
            screenshots: Array.isArray(storeMetadata.screenshots) ? storeMetadata.screenshots : [],
            techStack: dto.techStack ? [dto.techStack] : [],
            repositoryUrl: dto.repoUrl || null,
            documentationUrl: dto.websiteUrl || dto.otherStoreUrl || null,
            appStoreUrl: dto.appStoreUrl || null,
            playStoreUrl: dto.playStoreUrl || null,
            storeMetadata: {
              ...storeMetadata,
              assetType: dto.assetType,
              stage: dto.stage,
              websiteUrl: dto.websiteUrl,
              otherStoreUrl: dto.otherStoreUrl,
              importedAt: new Date().toISOString(),
            },
            monthlyRevenue,
            totalUsers: monthlyUsers,
            listingType: 'both',
            status: 'pending_review',
          })
          .returning();

        const importedStoreApp = await this.createImportedStoreApp(tx, dto, ownerId);

        const [workspace] = await tx
          .insert(appWorkspaces)
          .values({
            id: app.id,
            ownerId,
            name: dto.name.trim(),
            slug: appSlug,
            category: dto.category || dto.assetType || 'App',
            description,
            iconUrl: storeMetadata.iconUrl || storeMetadata.artworkUrl || null,
            status: 'setup',
            sourceType: sourceOverride?.sourceType ?? (importedStoreApp ? 'store_import' : 'manual'),
            sourceIdeaId: sourceOverride?.sourceIdeaId ?? null,
            listingId: listing.id,
            importedStoreAppId: importedStoreApp?.id || null,
            setupState: {
              profile: true,
              import: Boolean(importedStoreApp),
              listing: true,
              lifecycle: false,
            },
            metadata: {
              assetType: dto.assetType,
              stage: dto.stage,
              websiteUrl: dto.websiteUrl,
              playStoreUrl: dto.playStoreUrl,
              appStoreUrl: dto.appStoreUrl,
              otherStoreUrl: dto.otherStoreUrl,
              repoUrl: dto.repoUrl,
              techStack: dto.techStack,
              users: dto.users,
            },
            createdBy: ownerId,
            onboardingCompletedAt: new Date(),
          })
          .returning();

        await tx
          .insert(appWorkspaceMembers)
          .values({
            workspaceId: workspace.id,
            userId: ownerId,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [appWorkspaceMembers.workspaceId, appWorkspaceMembers.userId],
            set: { role: 'owner', status: 'active', removedAt: null, updatedAt: new Date() },
          });

        await tx
          .insert(appWorkspaceSetup)
          .values({
            workspaceId: workspace.id,
            profileCompletedAt: new Date(),
            importCompletedAt: importedStoreApp ? new Date() : null,
            listingConnectedAt: new Date(),
            onboardingCompletedAt: new Date(),
            checklist: {
              profile: true,
              import: Boolean(importedStoreApp),
              listing: true,
              lifecycle: false,
              team: false,
              deployment: false,
            },
            lifecycleState: {},
            updatedBy: ownerId,
          })
          .onConflictDoUpdate({
            target: appWorkspaceSetup.workspaceId,
            set: {
              profileCompletedAt: new Date(),
              importCompletedAt: importedStoreApp ? new Date() : null,
              listingConnectedAt: new Date(),
              onboardingCompletedAt: new Date(),
              updatedBy: ownerId,
              updatedAt: new Date(),
            },
          });

        await tx
          .insert(appMembers)
          .values({
            appId: listing.id,
            userId: ownerId,
            role: 'owner',
            equityPct: '100.00',
            sharesOwned: '0',
            status: 'active',
            joinedAt: new Date(),
          })
          .onConflictDoNothing();

        await tx.insert(appWorkspaceAuditLog).values({
          workspaceId: workspace.id,
          actorId: ownerId,
          action: importedStoreApp ? 'app_import_completed' : 'workspace_created',
          subjectType: 'app_workspace',
          subjectId: workspace.id,
          details: { listingId: listing.id, importedStoreAppId: importedStoreApp?.id },
        });

        const response = {
          app: this.mapWorkspaceApp(workspace, 'owner', undefined, listing, importedStoreApp),
          listing: this.mapListing(listing),
        };

        await this.upsertIdempotency(ownerId, idempotencyKey, requestHash, workspace.id, response, 'succeeded', tx);
        return response;
      });
    } catch (error: any) {
      await this.upsertIdempotency(ownerId, idempotencyKey, requestHash, null, { message: error?.message }, 'failed');
      if (error?.code === '23505') {
        throw new ConflictException('This app workspace already exists for your account.');
      }
      throw error;
    }
  }

  /** Returns the app workspace created from a given idea, or null. */
  async findWorkspaceBySourceIdea(ownerId: string, ideaId: string) {
    const [workspace] = await this.db
      .select()
      .from(appWorkspaces)
      .where(and(eq(appWorkspaces.ownerId, ownerId), eq(appWorkspaces.sourceIdeaId, ideaId)))
      .limit(1);
    return workspace ? this.mapWorkspaceApp(workspace, 'owner') : null;
  }

  async findMine(userId: string) {
    const workspaceRows = await this.db
      .select({
        workspace: appWorkspaces,
        member: appWorkspaceMembers,
        setup: appWorkspaceSetup,
        listing: listings,
        importedStoreApp: importedStoreApps,
      })
      .from(appWorkspaceMembers)
      .innerJoin(appWorkspaces, eq(appWorkspaceMembers.workspaceId, appWorkspaces.id))
      .leftJoin(appWorkspaceSetup, eq(appWorkspaceSetup.workspaceId, appWorkspaces.id))
      .leftJoin(listings, eq(appWorkspaces.listingId, listings.id))
      .leftJoin(importedStoreApps, eq(appWorkspaces.importedStoreAppId, importedStoreApps.id))
      .where(and(eq(appWorkspaceMembers.userId, userId), eq(appWorkspaceMembers.status, 'active')));

    if (workspaceRows.length) {
      const groups = this.emptyAppGroups();
      for (const row of workspaceRows) {
        const role = this.normalizeWorkspaceRole(row.member.role);
        const app = this.mapWorkspaceApp(row.workspace, role, row.setup, row.listing, row.importedStoreApp);
        this.pushGroupedApp(groups, role, app);
      }
      return groups;
    }

    const ownedApps = await this.db.select().from(apps).where(eq(apps.ownerId, userId));
    const owned = ownedApps.map((app: any) => this.mapApp(app, 'owner'));
    const coownedRows = await this.db
      .select({
        coowner: appCoowners,
        app: apps,
      })
      .from(appCoowners)
      .innerJoin(apps, eq(appCoowners.appId, apps.id))
      .where(and(eq(appCoowners.userId, userId), eq(appCoowners.status, 'accepted')));

    const cofounded = coownedRows
      .filter((row: any) => row.coowner.role !== 'shareholder')
      .map((row: any) => this.mapApp(row.app, 'cofounder', row.coowner.equityPct));
    const shareholder = coownedRows
      .filter((row: any) => row.coowner.role === 'shareholder')
      .map((row: any) => this.mapApp(row.app, 'shareholder', row.coowner.equityPct));

    return { owned, cofounded, shareholder, watchOnly: [] };
  }

  async getCoowners(appId: string, userId: string) {
    await this.ensureOwner(appId, userId);

    const rows = await this.db
      .select({
        coowner: appCoowners,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(appCoowners)
      .leftJoin(users, eq(appCoowners.userId, users.id))
      .where(eq(appCoowners.appId, appId))
      .orderBy(appCoowners.invitedAt);

    return rows.map((row: any) => this.mapCoowner(row.coowner, row.user));
  }

  async inviteCoowner(appId: string, dto: InviteCoownerDto, invitedBy: string) {
    await this.ensureOwner(appId, invitedBy);

    const targetUser = await this.db
      .select({ id: users.id, email: users.email, fullName: users.fullName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase().trim()))
      .limit(1);

    const [created] = await this.db
      .insert(appCoowners)
      .values({
        appId,
        userId: targetUser[0]?.id || null,
        email: dto.email.toLowerCase().trim(),
        role: dto.role || 'co_founder',
        equityPct: Number(dto.equityPct).toFixed(2),
        vestingMonths: dto.vestingMonths || 48,
        vestingStart: new Date(),
        cliffDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'pending',
        invitedBy,
      })
      .returning();

    return this.mapCoowner(created, targetUser[0]);
  }

  async getPendingCoownerInvites(userId: string, email?: string) {
    const normalizedEmail = email?.toLowerCase().trim();
    const rows = await this.db
      .select({ coowner: appCoowners, app: apps })
      .from(appCoowners)
      .innerJoin(apps, eq(appCoowners.appId, apps.id))
      .where(
        and(
          eq(appCoowners.status, 'pending'),
          normalizedEmail
            ? or(eq(appCoowners.userId, userId), eq(appCoowners.email, normalizedEmail))
            : eq(appCoowners.userId, userId),
        ),
      );

    return rows.map((row: any) => ({
      ...this.mapCoowner(row.coowner),
      app: { id: row.app.id, name: row.app.name, category: row.app.category, status: row.app.status },
    }));
  }

  async updateCoowner(coownerId: string, dto: UpdateCoownerDto, userId: string) {
    const coowner = await this.findCoownerOrThrow(coownerId);
    await this.ensureOwner(coowner.appId, userId);

    const updates: Record<string, any> = {};
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.equityPct !== undefined) updates.equityPct = Number(dto.equityPct).toFixed(2);
    if (dto.vestingMonths !== undefined) updates.vestingMonths = dto.vestingMonths;
    if (!Object.keys(updates).length) return this.mapCoowner(coowner);

    const [updated] = await this.db.update(appCoowners).set(updates).where(eq(appCoowners.id, coownerId)).returning();
    return this.mapCoowner(updated);
  }

  async updateCoownerStatus(coownerId: string, status: 'accepted' | 'declined' | 'departed', userId: string, email?: string) {
    const coowner = await this.findCoownerOrThrow(coownerId);
    const app = await this.ensureAppExists(coowner.appId);
    const normalizedEmail = email?.toLowerCase().trim();
    const isOwner = app.ownerId === userId;
    const isInvitee = coowner.userId === userId || (normalizedEmail && coowner.email === normalizedEmail);

    if (status === 'departed' && !isOwner && !isInvitee) {
      throw new BadRequestException('You do not have permission to update this invite');
    }
    if ((status === 'accepted' || status === 'declined') && !isInvitee) {
      throw new BadRequestException('You do not have permission to respond to this invite');
    }

    const updates: Record<string, any> = { status };
    if (status === 'accepted') {
      updates.joinedAt = new Date();
      updates.userId = coowner.userId || userId;
    }
    if (status === 'declined' || status === 'departed') updates.leftAt = new Date();

    const [updated] = await this.db.update(appCoowners).set(updates).where(eq(appCoowners.id, coownerId)).returning();
    return this.mapCoowner(updated);
  }

  async removeCoowner(appId: string, coownerId: string, userId: string) {
    await this.ensureOwner(appId, userId);
    const [updated] = await this.db
      .update(appCoowners)
      .set({ status: 'departed', leftAt: new Date() })
      .where(and(eq(appCoowners.id, coownerId), eq(appCoowners.appId, appId)))
      .returning();

    if (!updated) throw new BadRequestException('Team member was not found');
    return { success: true };
  }

  private async ensureOwner(appId: string, userId: string) {
    const app = await this.ensureAppExists(appId);
    if (app.ownerId !== userId && !(await this.isPlatformAdmin(userId))) {
      throw new BadRequestException('You do not own this app');
    }
    return app;
  }

  private async isPlatformAdmin(userId: string) {
    const [user] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.role === 'admin';
  }

  private async ensureAppExists(appId: string) {
    const [app] = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    if (!app) throw new BadRequestException('App was not found');
    return app;
  }

  private async findCoownerOrThrow(coownerId: string) {
    const [coowner] = await this.db.select().from(appCoowners).where(eq(appCoowners.id, coownerId)).limit(1);
    if (!coowner) throw new BadRequestException('Team member was not found');
    return coowner;
  }

  private async createImportedStoreApp(tx: any, dto: CreateManagedAppDto, ownerId: string) {
    const storeMetadata = dto.storeMetadata || {};
    const storeUrl =
      this.normalizeExternalUrl(dto.appStoreUrl) ||
      this.normalizeExternalUrl(dto.playStoreUrl) ||
      this.normalizeExternalUrl(dto.otherStoreUrl) ||
      this.normalizeExternalUrl(storeMetadata.storeUrl);
    if (!storeUrl) return null;

    const platform = this.toStorePlatform(storeMetadata.platform, dto.appStoreUrl, dto.playStoreUrl);
    if (!platform) return null;

    const provider = platform === 'ios' ? 'apple_app_store' : 'google_play';
    const [created] = await tx
      .insert(importedStoreApps)
      .values({
        ownerId,
        platform,
        provider,
        externalAppId: storeMetadata.id ? String(storeMetadata.id) : null,
        bundleId: storeMetadata.bundleId || null,
        packageName: storeMetadata.packageName || null,
        storeUrl,
        name: storeMetadata.name || dto.name.trim(),
        developer: storeMetadata.developer || null,
        category: storeMetadata.category || dto.category || null,
        description: storeMetadata.description || dto.description || null,
        iconUrl: storeMetadata.iconUrl || null,
        artworkUrl: storeMetadata.artworkUrl || null,
        screenshots: Array.isArray(storeMetadata.screenshots) ? storeMetadata.screenshots : [],
        rating: storeMetadata.rating === undefined ? null : String(storeMetadata.rating),
        ratingCount: storeMetadata.ratingCount || null,
        priceText: storeMetadata.priceText || null,
        version: storeMetadata.version || null,
        releaseDate: storeMetadata.releaseDate ? new Date(storeMetadata.releaseDate) : null,
        storeUpdatedAt: storeMetadata.updatedAt ? new Date(storeMetadata.updatedAt) : null,
        rawMetadata: storeMetadata,
      })
      .onConflictDoUpdate({
        target: [importedStoreApps.ownerId, importedStoreApps.storeUrl],
        set: {
          name: storeMetadata.name || dto.name.trim(),
          developer: storeMetadata.developer || null,
          category: storeMetadata.category || dto.category || null,
          description: storeMetadata.description || dto.description || null,
          iconUrl: storeMetadata.iconUrl || null,
          artworkUrl: storeMetadata.artworkUrl || null,
          screenshots: Array.isArray(storeMetadata.screenshots) ? storeMetadata.screenshots : [],
          rawMetadata: storeMetadata,
          updatedAt: new Date(),
        },
      })
      .returning();
    return created;
  }

  private async findDuplicateWorkspace(ownerId: string, name: string, storeUrl?: string | null) {
    if (storeUrl) {
      const rows = await this.db
        .select({ workspace: appWorkspaces })
        .from(appWorkspaces)
        .innerJoin(importedStoreApps, eq(appWorkspaces.importedStoreAppId, importedStoreApps.id))
        .where(and(eq(appWorkspaces.ownerId, ownerId), eq(importedStoreApps.storeUrl, storeUrl)))
        .limit(1);
      if (rows[0]?.workspace) return rows[0].workspace;
    }

    const [workspace] = await this.db
      .select()
      .from(appWorkspaces)
      .where(and(eq(appWorkspaces.ownerId, ownerId), eq(appWorkspaces.name, name.trim())))
      .limit(1);
    return workspace || null;
  }

  private async upsertIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    workspaceId: string | null,
    response: Record<string, any>,
    status: 'started' | 'succeeded' | 'failed',
    db = this.db,
  ) {
    await db
      .insert(appWorkspaceIdempotencyKeys)
      .values({ userId, operation: 'managed_app_create', idempotencyKey, requestHash, workspaceId, response, status })
      .onConflictDoUpdate({
        target: [
          appWorkspaceIdempotencyKeys.userId,
          appWorkspaceIdempotencyKeys.operation,
          appWorkspaceIdempotencyKeys.idempotencyKey,
        ],
        set: { requestHash, workspaceId, response, status, updatedAt: new Date() },
      });
  }

  private getManagedAppIdempotencyKey(dto: CreateManagedAppDto) {
    return this.hashJson({
      name: dto.name?.trim().toLowerCase(),
      storeUrl: dto.appStoreUrl || dto.playStoreUrl || dto.otherStoreUrl || null,
      repoUrl: dto.repoUrl || null,
    });
  }

  private hashJson(value: Record<string, any>) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private toStorePlatform(platform?: string, appStoreUrl?: string, playStoreUrl?: string): 'ios' | 'android' | null {
    if (platform === 'ios' || platform === 'android') return platform;
    if (appStoreUrl) return 'ios';
    if (playStoreUrl) return 'android';
    return null;
  }

  private normalizeExternalUrl(url?: string | null): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  private emptyAppGroups() {
    return { owned: [], cofounded: [], shareholder: [], shareholders: [], watchOnly: [], watch_only: [], prospective: [] };
  }

  private pushGroupedApp(groups: any, role: string, app: any) {
    if (role === 'owner') groups.owned.push(app);
    else if (role === 'cofounder') groups.cofounded.push(app);
    else if (role === 'shareholder') {
      groups.shareholder.push(app);
      groups.shareholders.push(app);
    } else {
      groups.watchOnly.push(app);
      groups.watch_only.push(app);
      groups.prospective.push(app);
    }
  }

  private normalizeWorkspaceRole(role: string): 'owner' | 'cofounder' | 'shareholder' | 'prospective' | 'watch_only' {
    if (role === 'owner' || role === 'cofounder' || role === 'shareholder') return role;
    if (role === 'support' || role === 'admin') return 'watch_only';
    return 'prospective';
  }

  private isSetupComplete(setup?: any) {
    if (!setup) return false;
    return Boolean(setup.profileCompletedAt && setup.onboardingCompletedAt);
  }

  private mapWorkspaceApp(workspace: any, role: string, setup?: any, listing?: any, importedStoreApp?: any, equityPct?: number | string) {
    const setupComplete = this.isSetupComplete(setup) || Boolean(workspace.onboardingCompletedAt);
    return {
      app_id: workspace.id,
      app_name: workspace.name,
      app_category: workspace.category || '',
      app_status: workspace.status || '',
      app_image_url: workspace.iconUrl || listing?.imageUrl || importedStoreApp?.iconUrl || importedStoreApp?.artworkUrl || '',
      role,
      equity_pct: equityPct !== undefined ? Number(equityPct) : role === 'owner' ? 100 : 0,
      shares_owned: 0,
      joined_at: workspace.createdAt || workspace.created_at || new Date().toISOString(),
      setup_complete: setupComplete,
      setup_completeness: setupComplete ? 'complete' : 'incomplete',
      listing_id: workspace.listingId || listing?.id || null,
      store_metadata: importedStoreApp?.rawMetadata || listing?.storeMetadata || null,
    };
  }

  private async uniqueSlug(table: any, baseSlug: string) {
    let slug = baseSlug || 'app';
    let suffix = 0;
    while (true) {
      const existing = await this.db.select({ id: table.id }).from(table).where(eq(table.slug, slug)).limit(1);
      if (!existing.length) return slug;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70);
  }

  private toAppStatus(stage?: string) {
    const normalized = stage?.toLowerCase() || '';
    if (normalized.includes('live')) return 'live';
    if (normalized.includes('paused')) return 'archived';
    if (normalized.includes('launch') || normalized.includes('beta')) return 'publishing';
    return 'development';
  }

  private toDecimalString(value?: number) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
  }

  private toUserCount(value?: string) {
    if (!value) return 0;
    const normalized = value.toLowerCase();
    if (normalized.includes('100k')) return 100000;
    if (normalized.includes('10k')) return 10000;
    if (normalized.includes('1k')) return 1000;
    const numeric = normalized.replace(/,/g, '').match(/\d+/);
    return numeric ? parseInt(numeric[0], 10) : 0;
  }

  private shortText(value: string) {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= 160) return trimmed;
    return `${trimmed.slice(0, 157).trim()}...`;
  }

  private mapApp(app: any, role: 'owner' | 'cofounder' | 'shareholder', equityPct?: number | string) {
    return {
      app_id: app.id,
      app_name: app.name,
      app_category: app.category || '',
      app_status: app.status || '',
      app_image_url: '',
      role,
      equity_pct: equityPct !== undefined ? Number(equityPct) : role === 'owner' ? 100 : 0,
      shares_owned: 0,
      joined_at: app.createdAt || app.created_at || new Date().toISOString(),
    };
  }

  private mapCoowner(row: any, profile?: any) {
    return {
      id: row.id,
      app_id: row.appId,
      user_id: row.userId,
      email: row.email,
      role: row.role,
      equity_pct: Number(row.equityPct || 0),
      vesting_start: row.vestingStart,
      cliff_date: row.cliffDate,
      vesting_months: row.vestingMonths,
      status: row.status,
      invited_by: row.invitedBy,
      invited_at: row.invitedAt,
      joined_at: row.joinedAt,
      left_at: row.leftAt,
      ip_assigned: row.ipAssigned,
      user_profiles: profile ? { full_name: profile.fullName, avatar_url: profile.avatarUrl } : null,
    };
  }

  private mapListing(listing: any) {
    return {
      ...listing,
      askingPrice: listing.askingPrice ? parseFloat(listing.askingPrice) : undefined,
      monthlyRevenue: listing.monthlyRevenue ? parseFloat(listing.monthlyRevenue) : undefined,
      targetRaise: listing.targetRaise ? parseFloat(listing.targetRaise) : undefined,
      equityAvailable: listing.equityAvailable ? parseFloat(listing.equityAvailable) : undefined,
    };
  }
}
