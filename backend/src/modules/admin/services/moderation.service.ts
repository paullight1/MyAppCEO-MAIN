import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';
import { DRIZZLE } from '../../../database/database.module';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogService, AuditAction } from './audit-log.service';
import {
  appIdeas,
  deploymentRecords,
  generatedArtifacts,
  listings,
  qualityReports,
  repoLinks,
  reviewSubmissions,
  talentPortfolios,
  ugcSubmissions,
} from '../../../database/schema';
import { NotificationsService, NotificationType } from '../../notifications/notifications.service';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { GeneratedReviewReason, GeneratedReviewReasonLabels } from '../dto/moderation.dto';

export enum ModerationStatus {
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

const REVIEW_SUBMISSION_TYPES = ['generated_code', 'app_submission'];
const REQUIRED_APPROVAL_CHECKS = ['lintStatus', 'typecheckStatus', 'testStatus', 'securityStatus'];
const CREATOR_MODERATION_TYPES = ['talent_portfolio', 'ugc_submission', 'ugc'];
const LEGAL_APPLICATION_TYPE = 'legal_application';
const LEGAL_PENDING_STATUSES = [ModerationStatus.PENDING_REVIEW, 'submitted'];

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    @Inject(DRIZZLE) private db: any,
    private auditLogService: AuditLogService,
    private notificationsService: NotificationsService,
  ) {}

  async getQueue(query: any): Promise<{
    items: any[];
    page: number;
    limit: number;
    total: number;
    summary: Record<string, number>;
  }> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;
    const status = query.status || ModerationStatus.PENDING_REVIEW;
    const type = query.type || 'listing';
    const statuses = String(status)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const supportedListingStatuses = statuses.filter((item) => item !== ModerationStatus.UNDER_REVIEW);
    const listingStatuses = (supportedListingStatuses.length ? supportedListingStatuses : [ModerationStatus.PENDING_REVIEW]) as Array<
      typeof listings.status['_']['data']
    >;

    if (type === 'generated_code' || type === 'app_submission') {
      return this.getReviewSubmissionQueue(type, statuses, page, limit, offset);
    }

    if (type === LEGAL_APPLICATION_TYPE) {
      return this.getLegalApplicationQueue(statuses, page, limit, offset);
    }

    const creatorQueueConfig = this.getCreatorModerationConfig(type);
    if (creatorQueueConfig) {
      return this.getCreatorModerationQueue(creatorQueueConfig, statuses, page, limit, offset);
    }

    if (type !== 'listing') {
      return {
        items: [],
        page,
        limit,
        total: 0,
        summary: {},
      };
    }

    const [{ count: pending = 0 } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.status, 'pending_review'));

    const [{ count: rejected = 0 } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.status, 'rejected'));

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(inArray(listings.status, listingStatuses));

    const items = await this.db
      .select()
      .from(listings)
      .where(inArray(listings.status, listingStatuses))
      .limit(limit)
      .offset(offset);

    return {
      items,
      page,
      limit,
      total: totalResult[0]?.count || 0,
      summary: {
        pending_review: pending,
        rejected,
      },
    };
  }

  async bulkApprove(
    itemIds: string[],
    itemType: string,
    actorId: string,
    actorRole: string,
  ): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const itemId of itemIds) {
      try {
        await this.processDecision(
          { itemId, itemType, action: 'approve' },
          actorId,
          actorRole,
        );
        success.push(itemId);
      } catch (error) {
        failed.push({
          id: itemId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { success, failed };
  }

  async claimItem(
    itemType: string,
    itemId: string,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string; item: any }> {
    if (!['listing', ...REVIEW_SUBMISSION_TYPES, ...CREATOR_MODERATION_TYPES, LEGAL_APPLICATION_TYPE].includes(itemType)) {
      throw new BadRequestException(`Invalid claim item type: ${itemType}`);
    }

    if (itemType === 'listing') {
      const { data: listing } = await this.supabase.from('listings').select('*').eq('id', itemId).single();

      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
      if (listing.status !== 'pending_review') {
        throw new BadRequestException(`Cannot claim listing from status ${listing.status}`);
      }

      await this.auditLogService.log({
        actorId,
        actorRole,
        action: AuditAction.LISTING_CLAIMED,
        resourceType: 'listing',
        resourceId: itemId,
        metadata: {
          reviewerId: actorId,
          reviewStartedAt: new Date().toISOString(),
          previousStatus: listing.status,
          newStatus: listing.status,
        },
        ipAddress,
      });

      return { success: true, message: 'listing claimed successfully', item: listing };
    }

    const creatorConfig = this.getCreatorModerationConfig(itemType);
    if (creatorConfig) {
      return this.claimCreatorModerationItem(
        creatorConfig,
        itemType,
        itemId,
        actorId,
        actorRole,
        ipAddress,
      );
    }

    if (itemType === LEGAL_APPLICATION_TYPE) {
      return this.claimLegalApplication(itemId, actorId, actorRole, ipAddress);
    }

    const submission = await this.getReviewSubmissionOrThrow(itemId, itemType);
    this.assertReviewTransition(submission.status, ModerationStatus.UNDER_REVIEW);

    const [updated] = await this.db
      .update(reviewSubmissions)
      .set({
        status: 'under_review',
        reviewerId: actorId,
        updatedAt: new Date(),
      })
      .where(eq(reviewSubmissions.id, itemId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Review submission not found');
    }

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: AuditAction.REVIEW_SUBMISSION_CLAIMED,
      resourceType: itemType as 'generated_code' | 'app_submission',
      resourceId: itemId,
      metadata: {
        previousStatus: submission.status,
        newStatus: updated.status,
        reviewerId: actorId,
      },
      ipAddress,
    });

    return { success: true, message: `${itemType} claimed successfully`, item: updated };
  }

  private async claimCreatorModerationItem(
    config: NonNullable<ReturnType<ModerationService['getCreatorModerationConfig']>>,
    itemType: string,
    itemId: string,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string; item: any }> {
    const [existing] = await this.db
      .select()
      .from(config.table as any)
      .where(eq((config.table as any).id, itemId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`${itemType} not found`);
    }
    if (existing.status !== 'pending_review') {
      throw new BadRequestException(`Cannot claim ${itemType} from status ${existing.status}`);
    }

    const updatePayload: Record<string, unknown> = {
      reviewedBy: actorId,
      reviewedAt: new Date(),
      reviewNotes: existing.reviewNotes || 'Review claimed',
    };
    if (config.hasUpdatedAt) {
      updatePayload.updatedAt = new Date();
    }

    const [updated] = await this.db
      .update(config.table as any)
      .set(updatePayload)
      .where(eq((config.table as any).id, itemId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`${itemType} not found`);
    }

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: `${config.resourceType.toUpperCase()}_CLAIMED` as any,
      resourceType: config.resourceType as any,
      resourceId: itemId,
      metadata: {
        previousStatus: existing.status,
        newStatus: updated.status,
        reviewerId: actorId,
      },
      ipAddress,
    });

    return { success: true, message: `${itemType} claimed successfully`, item: updated };
  }

  private async claimLegalApplication(
    itemId: string,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string; item: any }> {
    const application = await this.getLegalApplicationOrThrow(itemId);
    this.assertLegalApplicationTransition(application.status, ModerationStatus.UNDER_REVIEW);

    const { data: updated, error } = await this.supabase
      .from('user_license_applications')
      .update({
        status: ModerationStatus.UNDER_REVIEW,
        reviewed_by: actorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select(
        `
          *,
          license_type:license_types(*)
        `,
      )
      .single();

    if (error) {
      throw error;
    }
    if (!updated) {
      throw new NotFoundException('Legal application not found');
    }

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: AuditAction.LEGAL_APPLICATION_CLAIMED,
      resourceType: LEGAL_APPLICATION_TYPE,
      resourceId: itemId,
      metadata: {
        previousStatus: application.status,
        newStatus: updated.status,
        reviewerId: actorId,
      },
      ipAddress,
    });

    return {
      success: true,
      message: `${LEGAL_APPLICATION_TYPE} claimed successfully`,
      item: this.normalizeLegalApplication(updated),
    };
  }

  async getModerationStats(days = 7): Promise<Record<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - Number(days || 7));

    const [{ pending = 0 } = { pending: 0 }] = await this.db
      .select({ pending: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.status, 'pending_review'));

    const { data } = await this.supabase
      .from('admin_audit_logs')
      .select('action')
      .gte('timestamp', since.toISOString());

    return {
      pendingReview: pending,
      decisions: data?.length || 0,
    };
  }

  async claimReviewItem(
    itemId: string,
    itemType: string,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string; item: any }> {
    return this.claimItem(itemType, itemId, actorId, actorRole, ipAddress);
  }

  async processDecision(
    decision: any,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const { itemId, itemType, action, reason, notes } = decision;

    let tableName: string;
    let newStatus: string;
    let auditAction: AuditAction;

    switch (itemType) {
      case 'generated_code':
      case 'app_submission':
        return this.processReviewSubmissionDecision(decision, actorId, actorRole, ipAddress);
      case 'talent_portfolio':
      case 'ugc_submission':
      case 'ugc':
        return this.processCreatorModerationDecision(decision, actorId, actorRole, ipAddress);
      case 'legal_application':
        return this.processLegalApplicationDecision(decision, actorId, actorRole, ipAddress);
      case 'listing':
        tableName = 'listings';
        switch (action) {
          case 'approve':
            newStatus = 'active';
            auditAction = AuditAction.LISTING_APPROVED;
            break;
          case 'reject':
            newStatus = 'rejected';
            auditAction = AuditAction.LISTING_REJECTED;
            break;
          default:
            throw new BadRequestException('Invalid action for listing');
        }
        break;
      // ... handle other types
      default:
        tableName = 'listings'; // Fallback
        newStatus = 'active';
        auditAction = AuditAction.LISTING_APPROVED;
    }

    const { data: itemData } = await this.supabase.from(tableName).select('*').eq('id', itemId).single();

    const { error } = await this.supabase
      .from(tableName)
      .update({
        status: newStatus,
        approved_at: action === 'approve' ? new Date().toISOString() : null,
        approved_by: actorId,
        rejection_reason: action === 'reject' ? reason : null,
      })
      .eq('id', itemId);

    if (error) throw error;

    // Notify User
    if (itemType === 'listing' && itemData) {
      await this.notificationsService.notify(
        itemData.seller_id,
        action === 'approve' ? NotificationType.LISTING_APPROVED : NotificationType.LISTING_REJECTED,
        `Listing ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        `Your listing for ${itemData.name} has been ${action === 'approve' ? 'approved and is now live' : 'rejected'}.`,
        { listingId: itemId, reason }
      );
    }

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: auditAction,
      resourceType: itemType,
      resourceId: itemId,
      metadata: { reason, notes, newStatus },
      ipAddress,
    });

    return { success: true, message: `${itemType} processed successfully` };
  }

  private async getReviewSubmissionQueue(
    type: string,
    statuses: string[],
    page: number,
    limit: number,
    offset: number,
  ) {
    const submissionStatuses = (statuses.length ? statuses : [ModerationStatus.PENDING_REVIEW]) as Array<
      typeof reviewSubmissions.status['_']['data']
    >;

    const [{ count: pending = 0 } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.itemType, type), eq(reviewSubmissions.status, 'pending_review')));

    const [{ count: changesRequested = 0 } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.itemType, type), eq(reviewSubmissions.status, 'changes_requested')));

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.itemType, type), inArray(reviewSubmissions.status, submissionStatuses)));

    const items = await this.db
      .select()
      .from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.itemType, type), inArray(reviewSubmissions.status, submissionStatuses)))
      .limit(limit)
      .offset(offset);
    const enrichedItems = await this.enrichReviewSubmissionEvidence(items);

    return {
      items: enrichedItems,
      page,
      limit,
      total: totalResult[0]?.count || 0,
      summary: {
        pending_review: pending,
        changes_requested: changesRequested,
      },
    };
  }

  private async getCreatorModerationQueue(
    config: ReturnType<ModerationService['getCreatorModerationConfig']>,
    statuses: string[],
    page: number,
    limit: number,
    offset: number,
  ) {
    if (!config) {
      throw new BadRequestException('Invalid creator moderation queue');
    }

    const itemStatuses = statuses.length ? statuses : [ModerationStatus.PENDING_REVIEW];

    const [{ count: pending = 0 } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(config.table)
      .where(eq(config.table.status, 'pending_review'));

    const [{ count: rejected = 0 } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(config.table)
      .where(eq(config.table.status, 'rejected'));

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(config.table)
      .where(inArray(config.table.status, itemStatuses));

    const items = await this.db
      .select()
      .from(config.table)
      .where(inArray(config.table.status, itemStatuses))
      .limit(limit)
      .offset(offset);

    return {
      items,
      page,
      limit,
      total: totalResult[0]?.count || 0,
      summary: {
        pending_review: pending,
        rejected,
      },
    };
  }

  private async getLegalApplicationQueue(
    statuses: string[],
    page: number,
    limit: number,
    offset: number,
  ) {
    const legalStatuses = this.normalizeLegalApplicationStatuses(statuses);
    const pendingCount = await this.countLegalApplications(LEGAL_PENDING_STATUSES);
    const rejectedCount = await this.countLegalApplications(['rejected']);

    const { data, error, count } = await this.supabase
      .from('user_license_applications')
      .select(
        `
          *,
          license_type:license_types(*)
        `,
        { count: 'exact' },
      )
      .in('status', legalStatuses)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const documentsByApplication = await this.getLegalApplicationDocumentsByApplication(
      (data || []).map((item: any) => item.id).filter(Boolean),
    );

    return {
      items: (data || []).map((item: any) =>
        this.normalizeLegalApplication(item, documentsByApplication.get(item.id) || []),
      ),
      page,
      limit,
      total: count || 0,
      summary: {
        pending_review: pendingCount,
        rejected: rejectedCount,
      },
    };
  }

  private normalizeLegalApplicationStatuses(statuses: string[]) {
    const requestedStatuses = statuses.length ? statuses : [ModerationStatus.PENDING_REVIEW];
    return [
      ...new Set(
        requestedStatuses.flatMap((status) =>
          status === ModerationStatus.PENDING_REVIEW ? LEGAL_PENDING_STATUSES : [status],
        ),
      ),
    ];
  }

  private async countLegalApplications(statuses: string[]) {
    const { count, error } = await this.supabase
      .from('user_license_applications')
      .select('id', { count: 'exact', head: true })
      .in('status', statuses);

    if (error) {
      throw error;
    }
    return count || 0;
  }

  private async getLegalApplicationDocumentsByApplication(applicationIds: string[]) {
    const documentsByApplication = new Map<string, any[]>();
    if (!applicationIds.length) {
      return documentsByApplication;
    }

    const { data, error } = await this.supabase
      .from('application_documents')
      .select('*')
      .in('application_id', applicationIds);

    if (error) {
      throw error;
    }

    const documents = await Promise.all(
      (data || []).map(async (document: any) => ({
        ...document,
        documentType: document.document_type,
        fileUrl: await this.resolveLicenseDocumentUrl(document.file_url),
        uploadedAt: document.uploaded_at,
      })),
    );

    for (const document of documents) {
      const applicationDocuments = documentsByApplication.get(document.application_id) || [];
      applicationDocuments.push(document);
      documentsByApplication.set(document.application_id, applicationDocuments);
    }

    return documentsByApplication;
  }

  private async resolveLicenseDocumentUrl(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      return '';
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const { data, error } = await this.supabase.storage
      .from('license-documents')
      .createSignedUrl(value, 60 * 60);

    if (error) {
      this.logger.warn(`Failed to create signed legal document URL: ${error.message}`);
      return '';
    }

    return data?.signedUrl || '';
  }

  private normalizeLegalApplication(application: any, documents: any[] = []) {
    const licenseType = application.license_type || {};
    return {
      ...application,
      itemType: LEGAL_APPLICATION_TYPE,
      status: application.status === 'submitted' ? ModerationStatus.PENDING_REVIEW : application.status,
      submittedAt: application.submitted_at || application.created_at,
      updatedAt: application.updated_at,
      reviewerId: application.reviewed_by || null,
      submitterId: application.user_id,
      userId: application.user_id,
      licenseTypeId: application.license_type_id,
      licenseName: licenseType.name,
      licenseCategory: licenseType.category,
      issuingAuthority: licenseType.issuing_authority,
      applicationData: application.application_data || {},
      documents,
    };
  }

  private async enrichReviewSubmissionEvidence(items: any[]) {
    if (!items.length) {
      return items;
    }

    const artifactIds = this.uniqueIds(items.map((item) => item.artifactId));
    const qualityReportIds = this.uniqueIds(items.map((item) => item.qualityReportId));
    const ideaIds = this.uniqueIds(items.map((item) => item.ideaId));
    const appIds = this.uniqueIds(items.map((item) => item.appId));

    const [artifacts, reports, ideas, reposByIdea, reposByApp, deployments] = await Promise.all([
      artifactIds.length
        ? this.db.select().from(generatedArtifacts).where(inArray(generatedArtifacts.id, artifactIds))
        : Promise.resolve([]),
      qualityReportIds.length
        ? this.db.select().from(qualityReports).where(inArray(qualityReports.id, qualityReportIds))
        : Promise.resolve([]),
      ideaIds.length
        ? this.db.select().from(appIdeas).where(inArray(appIdeas.id, ideaIds))
        : Promise.resolve([]),
      ideaIds.length
        ? this.db.select().from(repoLinks).where(inArray(repoLinks.ideaId, ideaIds))
        : Promise.resolve([]),
      appIds.length
        ? this.db.select().from(repoLinks).where(inArray(repoLinks.appId, appIds))
        : Promise.resolve([]),
      appIds.length
        ? this.db.select().from(deploymentRecords).where(inArray(deploymentRecords.appId, appIds))
        : Promise.resolve([]),
    ]);

    const artifactsById = this.indexById(artifacts);
    const reportsById = this.indexById(reports);
    const ideasById = this.indexById(ideas);

    return items.map((item) => {
      const itemRepoLinks = [
        ...reposByIdea.filter((repo: any) => item.ideaId && repo.ideaId === item.ideaId),
        ...reposByApp.filter((repo: any) => item.appId && repo.appId === item.appId),
      ].filter((repo, index, all) => all.findIndex((candidate) => candidate.id === repo.id) === index);
      const itemDeployments = deployments.filter((deployment: any) => item.appId && deployment.appId === item.appId);

      return {
        ...item,
        evidenceBundle: {
          artifact: item.artifactId ? artifactsById.get(item.artifactId) || null : null,
          qualityReport: item.qualityReportId ? reportsById.get(item.qualityReportId) || null : null,
          idea: item.ideaId ? ideasById.get(item.ideaId) || null : null,
          repoLinks: itemRepoLinks,
          deployments: itemDeployments,
          links: {
            repositoryUrls: itemRepoLinks.map((repo: any) => repo.repoUrl).filter(Boolean),
            pullRequestUrls: itemRepoLinks.map((repo: any) => repo.pullRequestUrl).filter(Boolean),
            deploymentUrls: itemDeployments
              .flatMap((deployment: any) => [deployment.storeUrl, deployment.downloadUrl])
              .filter(Boolean),
          },
        },
      };
    });
  }

  private uniqueIds(values: unknown[]) {
    return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
  }

  private indexById(rows: any[]) {
    return new Map(rows.map((row: any) => [row.id, row]));
  }

  private async processReviewSubmissionDecision(
    decision: any,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ) {
    const { itemId, itemType, action, reason, notes } = decision;
    const submission = await this.getReviewSubmissionOrThrow(itemId, itemType);
    let newStatus: typeof reviewSubmissions.status['_']['data'];
    let auditAction: AuditAction;

    switch (action) {
      case 'approve':
        this.assertReviewTransition(submission.status, 'approved');
        await this.assertGeneratedReviewApprovalGate(submission);
        newStatus = 'approved';
        auditAction = AuditAction.GENERATED_CODE_APPROVED;
        break;
      case 'reject':
        this.assertReviewTransition(submission.status, 'rejected');
        if (!(reason || notes)) {
          throw new BadRequestException('reject requires a reason or notes');
        }
        newStatus = 'rejected';
        auditAction = AuditAction.GENERATED_CODE_REJECTED;
        break;
      case 'pause':
      case 'changes_requested':
        this.assertReviewTransition(submission.status, 'changes_requested');
        if (!(reason || notes)) {
          throw new BadRequestException(`${action} requires a reason or notes`);
        }
        newStatus = 'changes_requested';
        auditAction = AuditAction.GENERATED_CODE_CHANGES_REQUESTED;
        break;
      default:
        throw new BadRequestException(`Invalid action for ${itemType}`);
    }

    const decisionMetadata = this.buildReviewDecisionMetadata(reason, notes, submission.status, newStatus);

    const [updated] = await this.db
      .update(reviewSubmissions)
      .set({
        status: newStatus,
        reviewerId: actorId,
        decisionReason: this.serializeDecisionReason(decisionMetadata),
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviewSubmissions.id, itemId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Review submission not found');
    }

    await this.notifyReviewSubmissionParticipants(updated, action, decisionMetadata);

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: auditAction,
      resourceType: itemType,
      resourceId: itemId,
      metadata: decisionMetadata,
      ipAddress,
    });

    return { success: true, message: `${itemType} processed successfully` };
  }

  private async processCreatorModerationDecision(
    decision: any,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ) {
    const { itemId, itemType, action, reason, notes } = decision;
    const config = this.getCreatorModerationConfig(itemType);
    if (!config) {
      throw new BadRequestException(`Invalid creator moderation type: ${itemType}`);
    }

    let newStatus: string;
    let auditAction: string;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        auditAction = config.approvedAction;
        break;
      case 'reject':
        newStatus = 'rejected';
        auditAction = config.rejectedAction;
        break;
      default:
        throw new BadRequestException(`Invalid action for ${itemType}`);
    }

    const [item] = await this.db
      .select()
      .from(config.table)
      .where(eq(config.table.id, itemId))
      .limit(1);

    if (!item) {
      throw new NotFoundException(`${config.resourceType} not found`);
    }

    const reviewedAt = new Date();
    const updatePayload: Record<string, any> = {
      status: newStatus,
      reviewedBy: actorId,
      reviewedAt,
      reviewNotes: action === 'reject' ? reason || notes || null : notes || reason || null,
    };
    if (config.hasUpdatedAt) {
      updatePayload.updatedAt = reviewedAt;
    }

    const [updated] = await this.db
      .update(config.table)
      .set(updatePayload)
      .where(eq(config.table.id, itemId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`${config.resourceType} not found`);
    }

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: auditAction,
      resourceType: config.resourceType as any,
      resourceId: itemId,
      metadata: {
        reason,
        notes,
        previousStatus: item.status,
        newStatus,
      },
      ipAddress,
    });

    return { success: true, message: `${config.resourceType} processed successfully` };
  }

  private async processLegalApplicationDecision(
    decision: any,
    actorId: string,
    actorRole: string,
    ipAddress?: string,
  ) {
    const { itemId, action, reason, notes } = decision;
    const application = await this.getLegalApplicationOrThrow(itemId);

    let newStatus: string;
    let auditAction: AuditAction;
    switch (action) {
      case 'approve':
        this.assertLegalApplicationTransition(application.status, 'approved');
        await this.assertLegalApplicationApprovalGate(application);
        newStatus = 'approved';
        auditAction = AuditAction.LEGAL_APPLICATION_APPROVED;
        break;
      case 'reject':
        this.assertLegalApplicationTransition(application.status, 'rejected');
        if (!(reason || notes)) {
          throw new BadRequestException('reject requires a reason or notes');
        }
        newStatus = 'rejected';
        auditAction = AuditAction.LEGAL_APPLICATION_REJECTED;
        break;
      default:
        throw new BadRequestException(`Invalid action for ${LEGAL_APPLICATION_TYPE}`);
    }

    const reviewedAt = new Date().toISOString();
    const { data: updated, error } = await this.supabase
      .from('user_license_applications')
      .update({
        status: newStatus,
        reviewed_at: reviewedAt,
        reviewed_by: actorId,
        approval_notes: notes || reason || null,
        updated_at: reviewedAt,
      })
      .eq('id', itemId)
      .select(
        `
          *,
          license_type:license_types(*)
        `,
      )
      .single();

    if (error) {
      throw error;
    }
    if (!updated) {
      throw new NotFoundException('Legal application not found');
    }

    await this.notifyLegalApplicationUser(updated, action, reason, notes);

    await this.auditLogService.log({
      actorId,
      actorRole,
      action: auditAction,
      resourceType: LEGAL_APPLICATION_TYPE,
      resourceId: itemId,
      metadata: {
        reason,
        notes,
        previousStatus: application.status,
        newStatus,
      },
      ipAddress,
    });

    return { success: true, message: `${LEGAL_APPLICATION_TYPE} processed successfully` };
  }

  private async getLegalApplicationOrThrow(itemId: string) {
    const { data, error } = await this.supabase
      .from('user_license_applications')
      .select(
        `
          *,
          license_type:license_types(*)
        `,
      )
      .eq('id', itemId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Legal application not found');
    }

    return data;
  }

  private assertLegalApplicationTransition(currentStatus: string, targetStatus: string) {
    const normalizedCurrentStatus = currentStatus === 'submitted'
      ? ModerationStatus.PENDING_REVIEW
      : currentStatus;
    const allowed: Record<string, string[]> = {
      draft: [ModerationStatus.PENDING_REVIEW],
      pending_review: [ModerationStatus.UNDER_REVIEW, 'approved', 'rejected'],
      under_review: ['approved', 'rejected'],
      approved: [],
      rejected: [],
      expired: [],
    };

    if (!allowed[normalizedCurrentStatus]?.includes(targetStatus)) {
      throw new BadRequestException(`Cannot transition legal application from ${currentStatus} to ${targetStatus}`);
    }
  }

  private async assertLegalApplicationApprovalGate(application: any) {
    const applicationData = application.application_data || {};
    const personalInfo = applicationData.personalInfo || {};
    const businessInfo = applicationData.businessInfo || {};

    if (
      !personalInfo.fullName ||
      !personalInfo.email ||
      !personalInfo.phone ||
      !businessInfo.businessName ||
      !businessInfo.businessType ||
      !businessInfo.businessAddress
    ) {
      throw new BadRequestException('incomplete_license_application');
    }

    const requiredDocuments = Array.isArray(applicationData.requiredDocuments)
      ? applicationData.requiredDocuments
      : [];
    if (!requiredDocuments.length) {
      throw new BadRequestException('missing_license_document_checklist');
    }

    const { count, error } = await this.supabase
      .from('application_documents')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', application.id);

    if (error) {
      throw error;
    }
    if ((count || 0) < requiredDocuments.length) {
      throw new BadRequestException('missing_required_license_documents');
    }
  }

  private async notifyLegalApplicationUser(application: any, action: string, reason?: string, notes?: string) {
    const licenseName = application.license_type?.name || 'license application';
    const approved = action === 'approve';

    await this.notificationsService.notify(
      application.user_id,
      approved
        ? NotificationType.LICENSE_APPLICATION_APPROVED
        : NotificationType.LICENSE_APPLICATION_REJECTED,
      approved ? 'Legal application approved' : 'Legal application rejected',
      approved
        ? `Your ${licenseName} application has been approved.`
        : `Your ${licenseName} application was rejected. Review the admin notes before resubmitting.`,
      {
        applicationId: application.id,
        itemType: LEGAL_APPLICATION_TYPE,
        status: application.status,
        reason: reason || undefined,
        notes: notes || undefined,
      },
    );
  }

  private async getReviewSubmissionOrThrow(itemId: string, itemType?: string) {
    if (itemType && !REVIEW_SUBMISSION_TYPES.includes(itemType)) {
      throw new BadRequestException(`Invalid review submission type: ${itemType}`);
    }

    const [submission] = await this.db
      .select()
      .from(reviewSubmissions)
      .where(eq(reviewSubmissions.id, itemId))
      .limit(1);

    if (!submission || (itemType && submission.itemType !== itemType)) {
      throw new NotFoundException('Review submission not found');
    }

    return submission;
  }

  private assertReviewTransition(currentStatus: string, targetStatus: string) {
    const allowed: Record<string, string[]> = {
      pending_review: ['under_review', 'approved', 'rejected', 'changes_requested'],
      under_review: ['approved', 'rejected', 'changes_requested'],
      changes_requested: ['pending_review', 'rejected', 'changes_requested'],
      approved: [],
      rejected: [],
      draft: ['pending_review'],
    };

    if (!allowed[currentStatus]?.includes(targetStatus)) {
      throw new BadRequestException(`Cannot transition review submission from ${currentStatus} to ${targetStatus}`);
    }
  }

  private async assertGeneratedReviewApprovalGate(submission: any) {
    if (!submission.artifactId) {
      throw new BadRequestException('missing_artifact');
    }
    if (!submission.qualityReportId) {
      throw new BadRequestException('missing_quality_report');
    }

    const [artifact] = await this.db
      .select()
      .from(generatedArtifacts)
      .where(eq(generatedArtifacts.id, submission.artifactId))
      .limit(1);
    if (!artifact) {
      throw new BadRequestException('missing_artifact');
    }

    const [qualityReport] = await this.db
      .select()
      .from(qualityReports)
      .where(eq(qualityReports.id, submission.qualityReportId))
      .limit(1);
    if (!qualityReport) {
      throw new BadRequestException('missing_quality_report');
    }

    if (qualityReport.status === 'failed') {
      throw new BadRequestException('failed_sandbox');
    }
    if (qualityReport.status !== 'passed') {
      throw new BadRequestException('pending_quality_gate');
    }

    const missingChecks = REQUIRED_APPROVAL_CHECKS.filter((field) => qualityReport[field] !== 'passed');
    if (missingChecks.length) {
      throw new BadRequestException(`missing_required_sandbox_statuses:${missingChecks.join(',')}`);
    }
  }

  private buildReviewDecisionMetadata(
    reason: string | undefined,
    notes: string | undefined,
    previousStatus: string,
    newStatus: string,
  ) {
    const reasonLabel = this.getGeneratedReviewReasonLabel(reason);

    return {
      reason: reason || null,
      reasonLabel: reasonLabel || null,
      notes: notes || null,
      previousStatus,
      newStatus,
    };
  }

  private serializeDecisionReason(metadata: {
    reason: string | null;
    reasonLabel: string | null;
    notes: string | null;
  }) {
    if (!metadata.reason && !metadata.notes) {
      return null;
    }

    return JSON.stringify({
      reason: metadata.reason,
      reasonLabel: metadata.reasonLabel,
      notes: metadata.notes,
    });
  }

  private getGeneratedReviewReasonLabel(reason?: string) {
    if (!reason) {
      return undefined;
    }

    return GeneratedReviewReasonLabels[reason as GeneratedReviewReason];
  }

  private getCreatorModerationConfig(itemType: string) {
    if (!CREATOR_MODERATION_TYPES.includes(itemType)) {
      return null;
    }

    if (itemType === 'talent_portfolio') {
      return {
        table: talentPortfolios,
        approvedAction: 'TALENT_PORTFOLIO_APPROVED',
        rejectedAction: 'TALENT_PORTFOLIO_REJECTED',
        resourceType: 'talent_portfolio',
        hasUpdatedAt: true,
      };
    }

    return {
      table: ugcSubmissions,
      approvedAction: 'UGC_SUBMISSION_APPROVED',
      rejectedAction: 'UGC_SUBMISSION_REJECTED',
      resourceType: 'ugc_submission',
      hasUpdatedAt: false,
    };
  }

  private async notifyReviewSubmissionParticipants(submission: any, action: string, metadata: any) {
    const userIds = this.uniqueIds([submission.ownerId, submission.submittedBy]);
    if (!userIds.length) return;

    const type = action === 'approve'
      ? NotificationType.GENERATED_REVIEW_APPROVED
      : action === 'reject'
        ? NotificationType.GENERATED_REVIEW_REJECTED
        : NotificationType.GENERATED_REVIEW_CHANGES_REQUESTED;

    const submissionLabel = submission.itemType === 'app_submission' ? 'App submission' : 'Generated submission';
    const title = action === 'approve'
      ? `${submissionLabel} approved`
      : action === 'reject'
        ? `${submissionLabel} rejected`
        : `Changes requested for ${submissionLabel.toLowerCase()}`;

    const message = action === 'approve'
      ? 'Your generated app submission has been approved for the next stage.'
      : action === 'reject'
        ? 'Your generated app submission was rejected.'
        : 'An admin requested changes to your generated app submission.';

    await Promise.all(
      userIds.map((userId) =>
        this.notificationsService.notify(userId, type, title, message, {
          submissionId: submission.id,
          itemType: submission.itemType,
          status: metadata.newStatus,
          reason: metadata.reason || undefined,
          reasonLabel: metadata.reasonLabel || undefined,
          notes: metadata.notes || undefined,
        }),
      ),
    );
  }
}
