import { BadRequestException } from '@nestjs/common';
import { AuditAction } from './audit-log.service';
import { ModerationService } from './moderation.service';
import { NotificationType } from '../../notifications/notifications.service';
import { GeneratedReviewReason, GeneratedReviewReasonLabels } from '../dto/moderation.dto';

describe('ModerationService listing review support', () => {
  const actorId = 'admin-1';
  const actorRole = 'moderator';
  const listing = {
    id: 'listing-1',
    seller_id: 'seller-1',
    name: 'OpsPilot',
    status: 'pending_review',
  };

  const createService = (options: { updateError?: Error } = {}) => {
    const select = jest.fn();
    const update = jest.fn();
    const supabase = {
      from: jest.fn(() => ({
        select,
        update,
      })),
    };

    select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: listing }),
      }),
    });
    update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: options.updateError ?? null }),
    });

    const db = {
      select: jest.fn(),
      update: jest.fn(),
    };
    const auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    return {
      service: new ModerationService(
        supabase as any,
        db,
        auditLogService as any,
        notificationsService as any,
      ),
      supabase,
      db,
      select,
      update,
      auditLogService,
      notificationsService,
    };
  };

  it('returns paged listing queue items with pending and rejected summary counts', async () => {
    const pendingRows = [{ count: 3 }];
    const rejectedRows = [{ count: 1 }];
    const totalRows = [{ count: 4 }];
    const queueRows = [
      { id: 'listing-1', status: 'pending_review' },
      { id: 'listing-2', status: 'rejected' },
    ];
    const { service, db } = createService();
    db.select
      .mockReturnValueOnce(selectWhereResult(pendingRows))
      .mockReturnValueOnce(selectWhereResult(rejectedRows))
      .mockReturnValueOnce(selectWhereResult(totalRows))
      .mockReturnValueOnce(selectPagedResult(queueRows));

    const result = await service.getQueue({
      type: 'listing',
      status: 'pending_review,rejected',
      page: 2,
      limit: 10,
    });

    expect(result).toEqual({
      items: queueRows,
      page: 2,
      limit: 10,
      total: 4,
      summary: {
        pending_review: 3,
        rejected: 1,
      },
    });
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it('short-circuits unsupported queue types without querying listing tables', async () => {
    const { service, db } = createService();

    await expect(service.getQueue({ type: 'payout', page: 1, limit: 5 })).resolves.toEqual({
      items: [],
      page: 1,
      limit: 5,
      total: 0,
      summary: {},
    });

    expect(db.select).not.toHaveBeenCalled();
  });

  it.each([
    ['talent_portfolio', { id: 'portfolio-1', talentId: 'talent-1', status: 'pending_review' }],
    ['ugc_submission', { id: 'ugc-1', submitterId: 'creator-1', status: 'pending_review' }],
  ])('returns %s moderation queue items with review summary counts', async (type, item) => {
    const { service, db } = createService();
    db.select
      .mockReturnValueOnce(selectWhereResult([{ count: 4 }]))
      .mockReturnValueOnce(selectWhereResult([{ count: 2 }]))
      .mockReturnValueOnce(selectWhereResult([{ count: 6 }]))
      .mockReturnValueOnce(selectPagedResult([item]));

    const result = await service.getQueue({
      type,
      status: 'pending_review,rejected',
      page: 3,
      limit: 5,
    });

    expect(result).toEqual({
      items: [item],
      page: 3,
      limit: 5,
      total: 6,
      summary: {
        pending_review: 4,
        rejected: 2,
      },
    });
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it('returns generated code queue counts scoped to item type with enriched evidence', async () => {
    const submission = {
      id: 'submission-1',
      ownerId: 'owner-1',
      submittedBy: 'owner-1',
      ideaId: 'idea-1',
      appId: 'app-1',
      artifactId: 'artifact-1',
      qualityReportId: 'quality-1',
      itemType: 'generated_code',
      status: 'pending_review',
    };
    const artifact = { id: 'artifact-1', name: 'Code scaffold', artifactType: 'code_scaffold' };
    const qualityReport = {
      id: 'quality-1',
      status: 'passed',
      lintStatus: 'passed',
      testStatus: 'passed',
      summary: 'All checks passed',
    };
    const idea = { id: 'idea-1', title: 'OpsPilot', slug: 'opspilot' };
    const repo = {
      id: 'repo-1',
      ideaId: 'idea-1',
      appId: 'app-1',
      repoUrl: 'https://github.com/acme/opspilot',
      pullRequestUrl: 'https://github.com/acme/opspilot/pull/7',
    };
    const deployment = {
      id: 'deployment-1',
      appId: 'app-1',
      platform: 'web',
      status: 'submitted',
      storeUrl: 'https://opspilot.example.com',
    };
    const { service, db } = createService();
    db.select
      .mockReturnValueOnce(selectWhereResult([{ count: 2 }]))
      .mockReturnValueOnce(selectWhereResult([{ count: 1 }]))
      .mockReturnValueOnce(selectWhereResult([{ count: 3 }]))
      .mockReturnValueOnce(selectPagedResult([submission]))
      .mockReturnValueOnce(selectWhereResult([artifact]))
      .mockReturnValueOnce(selectWhereResult([qualityReport]))
      .mockReturnValueOnce(selectWhereResult([idea]))
      .mockReturnValueOnce(selectWhereResult([repo]))
      .mockReturnValueOnce(selectWhereResult([repo]))
      .mockReturnValueOnce(selectWhereResult([deployment]));

    const result = await service.getQueue({
      type: 'generated_code',
      status: 'pending_review,changes_requested',
      page: 1,
      limit: 20,
    });

    expect(result.total).toBe(3);
    expect(result.summary).toEqual({
      pending_review: 2,
      changes_requested: 1,
    });
    expect(result.items).toEqual([
      {
        ...submission,
        evidenceBundle: {
          artifact,
          qualityReport,
          idea,
          repoLinks: [repo],
          deployments: [deployment],
          links: {
            repositoryUrls: ['https://github.com/acme/opspilot'],
            pullRequestUrls: ['https://github.com/acme/opspilot/pull/7'],
            deploymentUrls: ['https://opspilot.example.com'],
          },
        },
      },
    ]);
    expect(db.select).toHaveBeenCalledTimes(10);
  });

  it('keeps claimed generated code submissions visible when under_review is requested', async () => {
    const claimedSubmission = {
      id: 'submission-claimed',
      itemType: 'generated_code',
      status: 'under_review',
    };
    const { service, db } = createService();
    db.select
      .mockReturnValueOnce(selectWhereResult([{ count: 1 }]))
      .mockReturnValueOnce(selectWhereResult([{ count: 0 }]))
      .mockReturnValueOnce(selectWhereResult([{ count: 2 }]))
      .mockReturnValueOnce(selectPagedResult([claimedSubmission]));

    const result = await service.getQueue({
      type: 'generated_code',
      status: 'pending_review,under_review',
      page: 1,
      limit: 20,
    });

    expect(result.total).toBe(2);
    expect(result.items).toEqual([
      {
        ...claimedSubmission,
        evidenceBundle: {
          artifact: null,
          qualityReport: null,
          idea: null,
          repoLinks: [],
          deployments: [],
          links: {
            repositoryUrls: [],
            pullRequestUrls: [],
            deploymentUrls: [],
          },
        },
      },
    ]);
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['approve', 'approved', AuditAction.GENERATED_CODE_APPROVED],
    ['reject', 'rejected', AuditAction.GENERATED_CODE_REJECTED],
    ['changes_requested', 'changes_requested', AuditAction.GENERATED_CODE_CHANGES_REQUESTED],
  ])('maps generated code %s decisions to review submission status %s', async (action, status, auditAction) => {
    const { service, db, auditLogService, notificationsService } = createService();
    const submission = {
      id: 'submission-1',
      ownerId: 'owner-1',
      submittedBy: 'submitter-1',
      itemType: 'generated_code',
      status: 'under_review',
      artifactId: 'artifact-1',
      qualityReportId: 'quality-1',
    };
    db.select.mockReturnValueOnce(selectLimitResult([submission]));
    if (action === 'approve') {
      db.select
        .mockReturnValueOnce(selectLimitResult([{ id: 'artifact-1' }]))
        .mockReturnValueOnce(selectLimitResult([{
          id: 'quality-1',
          status: 'passed',
          lintStatus: 'passed',
          typecheckStatus: 'passed',
          testStatus: 'passed',
          securityStatus: 'passed',
          accessibilityStatus: 'passed',
        }]));
    }
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...submission, status }]),
      }),
    });
    db.update.mockReturnValue({ set });

    await service.processDecision(
      {
        itemId: 'submission-1',
        itemType: 'generated_code',
        action,
        reason: GeneratedReviewReason.MISSING_PREVIEW,
        notes: 'Preview URL does not load',
      },
      actorId,
      actorRole,
    );

    expect(db.update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status,
        reviewerId: actorId,
        decisionReason: JSON.stringify({
          reason: GeneratedReviewReason.MISSING_PREVIEW,
          reasonLabel: GeneratedReviewReasonLabels[GeneratedReviewReason.MISSING_PREVIEW],
          notes: 'Preview URL does not load',
        }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: auditAction,
        resourceType: 'generated_code',
        resourceId: 'submission-1',
        metadata: {
          reason: GeneratedReviewReason.MISSING_PREVIEW,
          reasonLabel: GeneratedReviewReasonLabels[GeneratedReviewReason.MISSING_PREVIEW],
          notes: 'Preview URL does not load',
          previousStatus: 'under_review',
          newStatus: status,
        },
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'owner-1',
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        submissionId: 'submission-1',
        reason: GeneratedReviewReason.MISSING_PREVIEW,
        reasonLabel: GeneratedReviewReasonLabels[GeneratedReviewReason.MISSING_PREVIEW],
        notes: 'Preview URL does not load',
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'submitter-1',
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        submissionId: 'submission-1',
        reason: GeneratedReviewReason.MISSING_PREVIEW,
        reasonLabel: GeneratedReviewReasonLabels[GeneratedReviewReason.MISSING_PREVIEW],
        notes: 'Preview URL does not load',
      }),
    );
  });

  it('rejects app submissions with structured reason persistence and participant notifications', async () => {
    const { service, db, notificationsService } = createService();
    const submission = {
      id: 'submission-2',
      ownerId: 'owner-2',
      submittedBy: 'submitter-2',
      itemType: 'app_submission',
      status: 'under_review',
      artifactId: 'artifact-2',
      qualityReportId: 'quality-2',
    };
    db.select.mockReturnValueOnce(selectLimitResult([submission]));
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...submission, status: 'rejected' }]),
      }),
    });
    db.update.mockReturnValue({ set });

    await service.processDecision(
      {
        itemId: 'submission-2',
        itemType: 'app_submission',
        action: 'reject',
        reason: GeneratedReviewReason.SECURITY_RISK,
        notes: 'Secrets were committed in the generated repository',
      },
      actorId,
      actorRole,
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        decisionReason: JSON.stringify({
          reason: GeneratedReviewReason.SECURITY_RISK,
          reasonLabel: GeneratedReviewReasonLabels[GeneratedReviewReason.SECURITY_RISK],
          notes: 'Secrets were committed in the generated repository',
        }),
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'owner-2',
      NotificationType.GENERATED_REVIEW_REJECTED,
      'App submission rejected',
      expect.any(String),
      expect.objectContaining({
        submissionId: 'submission-2',
        itemType: 'app_submission',
        reason: GeneratedReviewReason.SECURITY_RISK,
        reasonLabel: GeneratedReviewReasonLabels[GeneratedReviewReason.SECURITY_RISK],
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'submitter-2',
      NotificationType.GENERATED_REVIEW_REJECTED,
      'App submission rejected',
      expect.any(String),
      expect.objectContaining({
        submissionId: 'submission-2',
        itemType: 'app_submission',
        reason: GeneratedReviewReason.SECURITY_RISK,
      }),
    );
  });

  it('claims a generated code review submission and moves it under review', async () => {
    const { service, db, auditLogService } = createService();
    const submission = {
      id: 'submission-1',
      itemType: 'generated_code',
      status: 'pending_review',
    };
    db.select.mockReturnValueOnce(selectLimitResult([submission]));
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...submission, status: 'under_review' }]),
      }),
    });
    db.update.mockReturnValue({ set });

    const result = await service.claimReviewItem('submission-1', 'generated_code', actorId, actorRole);

    expect(result.item).toMatchObject({ status: 'under_review' });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'under_review',
        reviewerId: actorId,
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'generated_code',
        resourceId: 'submission-1',
      }),
    );
  });

  it.each([
    ['talent_portfolio', 'TALENT_PORTFOLIO_CLAIMED'],
    ['ugc_submission', 'UGC_SUBMISSION_CLAIMED'],
  ])('claims %s moderation items without changing their queue status', async (itemType, auditAction) => {
    const { service, db, auditLogService } = createService();
    const item = {
      id: 'creator-review-1',
      status: 'pending_review',
      reviewNotes: null,
    };
    db.select.mockReturnValueOnce(selectLimitResult([item]));
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...item, reviewedBy: actorId }]),
      }),
    });
    db.update.mockReturnValue({ set });

    const result = await service.claimReviewItem('creator-review-1', itemType, actorId, actorRole);

    expect(result.item).toMatchObject({ status: 'pending_review', reviewedBy: actorId });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewedBy: actorId,
        reviewNotes: 'Review claimed',
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: auditAction,
        resourceType: itemType,
        resourceId: 'creator-review-1',
      }),
    );
  });

  it('blocks generated code approval when quality report evidence is missing', async () => {
    const { service, db } = createService();
    db.select.mockReturnValueOnce(selectLimitResult([{
      id: 'submission-1',
      itemType: 'generated_code',
      status: 'under_review',
      artifactId: 'artifact-1',
      qualityReportId: null,
    }]));

    await expect(
      service.processDecision(
        {
          itemId: 'submission-1',
          itemType: 'generated_code',
          action: 'approve',
        },
        actorId,
        actorRole,
      ),
    ).rejects.toThrow('missing_quality_report');

    expect(db.update).not.toHaveBeenCalled();
  });

  it('blocks generated code approval when required sandbox statuses are missing', async () => {
    const { service, db } = createService();
    db.select
      .mockReturnValueOnce(selectLimitResult([{
        id: 'submission-1',
        itemType: 'generated_code',
        status: 'under_review',
        artifactId: 'artifact-1',
        qualityReportId: 'quality-1',
      }]))
      .mockReturnValueOnce(selectLimitResult([{ id: 'artifact-1' }]))
      .mockReturnValueOnce(selectLimitResult([{
        id: 'quality-1',
        status: 'passed',
        lintStatus: 'passed',
        typecheckStatus: 'passed',
        testStatus: 'not_run',
        securityStatus: 'passed',
      }]));

    await expect(
      service.processDecision(
        {
          itemId: 'submission-1',
          itemType: 'generated_code',
          action: 'approve',
        },
        actorId,
        actorRole,
      ),
    ).rejects.toThrow('missing_required_sandbox_statuses:testStatus');

    expect(db.update).not.toHaveBeenCalled();
  });

  it('blocks terminal generated review submissions from being changed again', async () => {
    const { service, db } = createService();
    db.select.mockReturnValueOnce(selectLimitResult([{
      id: 'submission-1',
      itemType: 'generated_code',
      status: 'approved',
      artifactId: 'artifact-1',
      qualityReportId: 'quality-1',
    }]));

    await expect(
      service.processDecision(
        {
          itemId: 'submission-1',
          itemType: 'generated_code',
          action: 'reject',
        },
        actorId,
        actorRole,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves listing decisions, notifies the seller, and writes an audit log', async () => {
    const { service, supabase, update, notificationsService, auditLogService } = createService();

    const result = await service.processDecision(
      {
        itemId: listing.id,
        itemType: 'listing',
        action: 'approve',
        notes: 'Meets marketplace policy',
      },
      actorId,
      actorRole,
      '127.0.0.1',
    );

    expect(result).toEqual({ success: true, message: 'listing processed successfully' });
    expect(supabase.from).toHaveBeenCalledWith('listings');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        approved_by: actorId,
        rejection_reason: null,
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      listing.seller_id,
      NotificationType.LISTING_APPROVED,
      'Listing Approved',
      'Your listing for OpsPilot has been approved and is now live.',
      { listingId: listing.id, reason: undefined },
    );
    expect(auditLogService.log).toHaveBeenCalledWith({
      actorId,
      actorRole,
      action: AuditAction.LISTING_APPROVED,
      resourceType: 'listing',
      resourceId: listing.id,
      metadata: {
        reason: undefined,
        notes: 'Meets marketplace policy',
        newStatus: 'active',
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('rejects listing decisions with a rejection reason and rejected notification', async () => {
    const { service, update, notificationsService, auditLogService } = createService();

    await service.processDecision(
      {
        itemId: listing.id,
        itemType: 'listing',
        action: 'reject',
        reason: 'Missing revenue evidence',
      },
      actorId,
      actorRole,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        approved_by: actorId,
        rejection_reason: 'Missing revenue evidence',
      }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      listing.seller_id,
      NotificationType.LISTING_REJECTED,
      'Listing Rejected',
      'Your listing for OpsPilot has been rejected.',
      { listingId: listing.id, reason: 'Missing revenue evidence' },
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LISTING_REJECTED,
        metadata: expect.objectContaining({ newStatus: 'rejected' }),
      }),
    );
  });

  it('rejects unsupported listing actions before writing updates', async () => {
    const { service, update } = createService();

    await expect(
      service.processDecision(
        {
          itemId: listing.id,
          itemType: 'listing',
          action: 'pause',
        },
        actorId,
        actorRole,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['talent_portfolio', 'approve', 'approved', 'TALENT_PORTFOLIO_APPROVED'],
    ['talent_portfolio', 'reject', 'rejected', 'TALENT_PORTFOLIO_REJECTED'],
    ['ugc_submission', 'approve', 'approved', 'UGC_SUBMISSION_APPROVED'],
    ['ugc_submission', 'reject', 'rejected', 'UGC_SUBMISSION_REJECTED'],
  ])('processes %s %s decisions with reviewer metadata and audit log', async (itemType, action, status, auditAction) => {
    const { service, db, auditLogService } = createService();
    const existing = {
      id: 'creator-review-1',
      status: 'pending_review',
      talentId: 'talent-1',
      submitterId: 'creator-1',
    };
    db.select.mockReturnValueOnce(selectLimitResult([existing]));
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...existing, status }]),
      }),
    });
    db.update.mockReturnValue({ set });

    const result = await service.processDecision(
      {
        itemId: 'creator-review-1',
        itemType,
        action,
        reason: action === 'reject' ? 'Policy mismatch' : undefined,
        notes: 'Reviewed by admin',
      },
      actorId,
      actorRole,
      '127.0.0.1',
    );

    expect(result).toEqual({ success: true, message: `${itemType} processed successfully` });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status,
        reviewedBy: actorId,
        reviewNotes: action === 'reject' ? 'Policy mismatch' : 'Reviewed by admin',
      }),
    );
    expect(set.mock.calls[0][0].reviewedAt).toBeInstanceOf(Date);
    expect(auditLogService.log).toHaveBeenCalledWith({
      actorId,
      actorRole,
      action: auditAction,
      resourceType: itemType,
      resourceId: 'creator-review-1',
      metadata: {
        reason: action === 'reject' ? 'Policy mismatch' : undefined,
        notes: 'Reviewed by admin',
        previousStatus: 'pending_review',
        newStatus: status,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('returns submitted legal applications as pending admin review with signed document evidence', async () => {
    const application = {
      id: 'license-app-1',
      user_id: 'user-1',
      license_type_id: 'license-1',
      status: 'submitted',
      submitted_at: '2026-06-01T10:00:00.000Z',
      application_data: {
        personalInfo: { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '+2348000000000' },
        businessInfo: { businessName: 'Analytical Apps', businessType: 'llc', businessAddress: 'Lagos' },
        requiredDocuments: ['Certificate of incorporation'],
      },
      license_type: {
        name: 'Business Registration',
        category: 'business',
        issuing_authority: 'CAC',
      },
    };
    const fromResponses = [
      selectInCountResult(1),
      selectInCountResult(0),
      selectLegalQueueResult([application], 1),
      selectInDataResult([
        {
          id: 'doc-1',
          application_id: 'license-app-1',
          document_type: 'Certificate of incorporation',
          file_url: 'user-1/license-app-1/cac.pdf',
          uploaded_at: '2026-06-01T10:01:00.000Z',
        },
      ]),
    ];
    const supabase = {
      from: jest.fn(() => fromResponses.shift()),
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://signed.example.com/cac.pdf' },
            error: null,
          }),
        }),
      },
    };
    const service = new ModerationService(
      supabase as any,
      { select: jest.fn(), update: jest.fn() },
      { log: jest.fn() } as any,
      { notify: jest.fn() } as any,
    );

    const result = await service.getQueue({
      type: 'legal_application',
      status: 'pending_review',
      page: 1,
      limit: 20,
    });

    expect(result.summary).toEqual({ pending_review: 1, rejected: 0 });
    expect(result.items[0]).toMatchObject({
      id: 'license-app-1',
      itemType: 'legal_application',
      status: 'pending_review',
      licenseName: 'Business Registration',
      documents: [
        expect.objectContaining({
          documentType: 'Certificate of incorporation',
          fileUrl: 'https://signed.example.com/cac.pdf',
        }),
      ],
    });
  });

  it('blocks legal application approval until all required documents are uploaded', async () => {
    const application = {
      id: 'license-app-2',
      user_id: 'user-2',
      status: 'under_review',
      application_data: {
        personalInfo: { fullName: 'Grace Hopper', email: 'grace@example.com', phone: '+2348000000001' },
        businessInfo: { businessName: 'Compiler Apps', businessType: 'llc', businessAddress: 'Abuja' },
        requiredDocuments: ['Certificate of incorporation', 'Tax registration'],
      },
      license_type: {
        name: 'Business Registration',
      },
    };
    const fromResponses = [
      selectSingleDataResult(application),
      selectEqCountResult(1),
    ];
    const auditLogService = { log: jest.fn() };
    const notificationsService = { notify: jest.fn() };
    const service = new ModerationService(
      { from: jest.fn(() => fromResponses.shift()) } as any,
      { select: jest.fn(), update: jest.fn() },
      auditLogService as any,
      notificationsService as any,
    );

    await expect(
      service.processDecision(
        {
          itemId: 'license-app-2',
          itemType: 'legal_application',
          action: 'approve',
        },
        actorId,
        actorRole,
      ),
    ).rejects.toThrow('missing_required_license_documents');

    expect(auditLogService.log).not.toHaveBeenCalled();
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});

const selectWhereResult = (rows: any[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(rows),
  }),
});

const selectPagedResult = (rows: any[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        offset: jest.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const selectLimitResult = (rows: any[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(rows),
    }),
  }),
});

const selectInCountResult = (count: number) => ({
  select: jest.fn().mockReturnValue({
    in: jest.fn().mockResolvedValue({ count, error: null }),
  }),
});

const selectInDataResult = (data: any[]) => ({
  select: jest.fn().mockReturnValue({
    in: jest.fn().mockResolvedValue({ data, error: null }),
  }),
});

const selectLegalQueueResult = (data: any[], count: number) => ({
  select: jest.fn().mockReturnValue({
    in: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data, count, error: null }),
        }),
      }),
    }),
  }),
});

const selectSingleDataResult = (data: any) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data, error: null }),
    }),
  }),
});

const selectEqCountResult = (count: number) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ count, error: null }),
  }),
});
