import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { 
  crowdfundingCampaigns, 
  investmentCommitments, 
  escrowAccounts, 
  campaignShares,
  appIdeas,
  users,
  progressUpdates,
  investorNotifications,
  apps,
  appCoowners,
  appInvestmentHoldings,
} from '../../database/schema';
import { eq, and, desc, gte, lte, sql, inArray, or } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'crypto';
import { 
  CreateCampaignDto, 
  UpdateCampaignDto, 
  InvestDto, 
  ConfirmInvestmentDto,
  CreateShareLinkDto,
  CampaignFilterDto,
  CalculateStakeDto,
} from './dto/campaign.dto';

@Injectable()
export class CrowdfundingService {
  private readonly logger = new Logger(CrowdfundingService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
  ) {}

  async create(dto: CreateCampaignDto, ownerId: string) {
    const slug = this.generateSlug(dto.title);
    let appId = dto.appId;

    if (appId) {
      const [app] = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!app) {
        throw new NotFoundException('App not found');
      }
      if (app.ownerId !== ownerId) {
        throw new ForbiddenException('You can only raise funding for apps you own');
      }
    }
    
    let ideaId = dto.ideaId;
    if (!ideaId) {
      const [idea] = await this.db
        .select()
        .from(appIdeas)
        .where(and(
          eq(appIdeas.ownerId, ownerId),
          eq(appIdeas.status, 'ready_for_funding')
        ))
        .orderBy(desc(appIdeas.createdAt))
        .limit(1);
      
      if (idea) {
        ideaId = idea.id;
      }
    }

    const endDate = dto.durationDays 
      ? new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [campaign] = await this.db
      .insert(crowdfundingCampaigns)
      .values({
        ownerId,
        ideaId,
        appId,
        title: dto.title,
        slug,
        shortDescription: dto.shortDescription,
        longDescription: dto.longDescription,
        coverImageUrl: dto.coverImageUrl,
        videoUrl: dto.videoUrl,
        fundingGoal: dto.fundingGoal.toString(),
        minInvestment: dto.minInvestment?.toString() || '100.00',
        maxInvestment: dto.maxInvestment?.toString(),
        equityOfferedPct: dto.equityOfferedPct.toString(),
        preMoneyValuation: dto.preMoneyValuation.toString(),
        fundingType: dto.fundingType || 'split',
        endDate,
        maxInvestors: dto.maxInvestors || 100,
        status: 'draft',
        shareToken: this.generateShareToken(),
      })
      .returning();

    await this.db
      .insert(escrowAccounts)
      .values({
        campaignId: campaign.id,
        stripeConnectAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID || 'pending',
      });

    return this.mapToResponse(campaign);
  }

  async findAll(filters: CampaignFilterDto) {
    const conditions = [];
    
    if (filters.status) {
      conditions.push(eq(crowdfundingCampaigns.status, filters.status as any));
    }
    if (filters.minGoal) {
      conditions.push(gte(crowdfundingCampaigns.fundingGoal, filters.minGoal.toString()));
    }
    if (filters.maxGoal) {
      conditions.push(lte(crowdfundingCampaigns.fundingGoal, filters.maxGoal.toString()));
    }

    const result = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(conditions.length > 0 ? and(...conditions) : eq(crowdfundingCampaigns.status, 'active'))
      .orderBy(desc(crowdfundingCampaigns.createdAt));

    return result.map(this.mapToResponse);
  }

  async findMine(userId: string) {
    const result = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.ownerId, userId))
      .orderBy(desc(crowdfundingCampaigns.createdAt));

    return result.map(this.mapToResponse);
  }

  async findOne(id: string) {
    const [campaign] = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.id, id));

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return this.mapToResponse(campaign);
  }

  async findBySlug(slug: string) {
    const [campaign] = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.slug, slug));

    if (!campaign) {
      throw new NotFoundException(`Campaign with slug ${slug} not found`);
    }

    return this.mapToResponse(campaign);
  }

  async findByShareToken(token: string) {
    const [share] = await this.db
      .select()
      .from(campaignShares)
      .where(eq(campaignShares.shareToken, token));

    if (!share) {
      throw new NotFoundException('Invalid share link');
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    if (share.maxUses && share.currentUses >= share.maxUses) {
      throw new BadRequestException('Share link has reached maximum uses');
    }

    await this.db
      .update(campaignShares)
      .set({ 
        currentUses: sql`${campaignShares.currentUses} + 1`,
        viewCount: sql`${campaignShares.viewCount} + 1`
      })
      .where(eq(campaignShares.id, share.id));

    return this.findOne(share.campaignId);
  }

  async update(id: string, dto: UpdateCampaignDto, userId: string) {
    const campaign = await this.findOne(id);
    
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Can only update draft campaigns');
    }

    const [updated] = await this.db
      .update(crowdfundingCampaigns)
      .set({
        ...dto,
        fundingGoal: dto.fundingGoal?.toString(),
        minInvestment: dto.minInvestment?.toString(),
        maxInvestment: dto.maxInvestment?.toString(),
        equityOfferedPct: dto.equityOfferedPct?.toString(),
        preMoneyValuation: dto.preMoneyValuation?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(crowdfundingCampaigns.id, id))
      .returning();

    return this.mapToResponse(updated);
  }

  async publish(id: string, userId: string) {
    const campaign = await this.findOne(id);
    
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('You can only publish your own campaigns');
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Can only publish draft campaigns');
    }

    const [updated] = await this.db
      .update(crowdfundingCampaigns)
      .set({
        status: 'active',
        startDate: new Date(),
        isPublic: true,
        updatedAt: new Date(),
      })
      .where(eq(crowdfundingCampaigns.id, id))
      .returning();

    return this.mapToResponse(updated);
  }

  async cancel(id: string, userId: string, reason?: string) {
    const campaign = await this.findOne(id);
    
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('You can only cancel your own campaigns');
    }

    const commitments = await this.db
      .select()
      .from(investmentCommitments)
      .where(and(
        eq(investmentCommitments.campaignId, id),
        eq(investmentCommitments.status, 'paid')
      ));

    if (commitments.length > 0) {
      await this.processRefunds(id);
    }

    const [updated] = await this.db
      .update(crowdfundingCampaigns)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(crowdfundingCampaigns.id, id))
      .returning();

    return this.mapToResponse(updated);
  }

  async invest(id: string, dto: InvestDto, userId: string) {
    const campaign = await this.findOne(id);

    if (campaign.status !== 'active') {
      throw new BadRequestException('Campaign is not accepting investments');
    }

    const validation = this.validateInvestment(dto.amount, campaign);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    const stakePct = this.calculateStake(
      dto.amount,
      parseFloat(campaign.preMoneyValuation),
      parseFloat(campaign.equityOfferedPct)
    );

    const existingCommitment = await this.db
      .select()
      .from(investmentCommitments)
      .where(and(
        eq(investmentCommitments.campaignId, id),
        eq(investmentCommitments.investorId, userId)
      ))
      .limit(1);

    if (existingCommitment.length > 0) {
      throw new BadRequestException('You have already invested in this campaign');
    }

    const [commitment] = await this.db
      .insert(investmentCommitments)
      .values({
        campaignId: id,
        investorId: userId,
        amount: dto.amount.toString(),
        stakePct: stakePct.toString(),
        valuationAtCommitment: campaign.preMoneyValuation,
        status: 'pending',
      })
      .returning();

    if (!process.env.PAYSTACK_SECRET_KEY) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Paystack is not configured');
      }

      await this.db
        .update(investmentCommitments)
        .set({
          status: 'processing',
          paymentProvider: 'simulated',
          paymentReference: `simulated_${commitment.id}`,
          paymentCurrency: process.env.PAYSTACK_CURRENCY || 'NGN',
          stripePaymentIntentId: `simulated_${commitment.id}`,
        })
        .where(eq(investmentCommitments.id, commitment.id));

      return {
        commitment: this.mapCommitmentToResponse({
          ...commitment,
          status: 'processing',
          paymentProvider: 'simulated',
          paymentReference: `simulated_${commitment.id}`,
          paymentCurrency: process.env.PAYSTACK_CURRENCY || 'NGN',
          stripePaymentIntentId: `simulated_${commitment.id}`,
        }),
        clientSecret: null,
        requiresAction: false,
        simulated: true,
      };
    }

    try {
      const [investor] = await this.db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!investor?.email) {
        throw new BadRequestException('Investor email is required to initialize payment');
      }

      const reference = this.generatePaymentReference(commitment.id);
      const callbackUrl = this.buildPaymentCallbackUrl(dto.returnUri, commitment.id);
      const paystack = await this.initializePaystackTransaction({
        email: investor.email,
        amount: dto.amount,
        reference,
        callbackUrl,
        metadata: {
          commitmentId: commitment.id,
          campaignId: id,
          investorId: userId,
          stakePct: stakePct.toString(),
        },
      });

      await this.db
        .update(investmentCommitments)
        .set({
          paymentProvider: 'paystack',
          paymentReference: paystack.reference,
          paymentCurrency: process.env.PAYSTACK_CURRENCY || 'NGN',
          paymentMetadata: {
            commitmentId: commitment.id,
            campaignId: id,
            investorId: userId,
            stakePct: stakePct.toString(),
          },
          stripePaymentIntentId: paystack.reference,
          status: 'processing',
        })
        .where(eq(investmentCommitments.id, commitment.id));

      return {
        commitment: this.mapCommitmentToResponse({
          ...commitment,
          status: 'processing',
          paymentProvider: 'paystack',
          paymentReference: paystack.reference,
          paymentCurrency: process.env.PAYSTACK_CURRENCY || 'NGN',
          stripePaymentIntentId: paystack.reference,
        }),
        authorizationUrl: paystack.authorizationUrl,
        accessCode: paystack.accessCode,
        reference: paystack.reference,
        provider: 'paystack',
        clientSecret: null,
        requiresAction: true,
      };
    } catch (error) {
      this.logger.error('Failed to initialize Paystack transaction', error);
      await this.db
        .update(investmentCommitments)
        .set({ status: 'failed' })
        .where(eq(investmentCommitments.id, commitment.id));
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async confirmInvestment(id: string, dto: ConfirmInvestmentDto, userId: string) {
    const commitment = await this.db
      .select()
      .from(investmentCommitments)
      .where(eq(investmentCommitments.id, dto.commitmentId))
      .limit(1);

    if (!commitment[0] || commitment[0].investorId !== userId) {
      throw new NotFoundException('Commitment not found');
    }

    if (commitment[0].campaignId !== id) {
      throw new NotFoundException('Commitment not found for this campaign');
    }

    if (commitment[0].status === 'paid') {
      return { success: true, campaign: await this.findOne(id), alreadyConfirmed: true };
    }

    const storedReference = commitment[0].paymentReference || commitment[0].stripePaymentIntentId;
    const paymentReference = dto.paymentReference || dto.paymentIntentId || storedReference;
    if (!paymentReference) {
      throw new BadRequestException('Payment reference is required');
    }

    if (storedReference && paymentReference !== storedReference) {
      throw new BadRequestException('Payment reference does not match this commitment');
    }

    let chargeReference = paymentReference;
    if (!paymentReference.startsWith('simulated_')) {
      const verification = await this.verifyPaystackTransaction(paymentReference);
      this.assertValidPaystackCharge(verification, commitment[0], paymentReference);
      chargeReference = verification.id?.toString() || verification.reference || paymentReference;
    }

    await this.finalizePaidCommitment(
      commitment[0],
      paymentReference,
      chargeReference,
      paymentReference.startsWith('simulated_') ? 'simulated' : 'paystack',
    );

    return { success: true, campaign: await this.findOne(id) };
  }

  async handlePaystackWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }
    if (!this.isValidPaystackSignature(rawBody, signature)) {
      throw new BadRequestException('Paystack webhook signature verification failed');
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    if (event.event !== 'charge.success') {
      return { received: true, ignored: true };
    }

    const reference = event.data?.reference;
    if (!reference) {
      throw new BadRequestException('Paystack webhook missing reference');
    }

    const [commitment] = await this.db
      .select()
      .from(investmentCommitments)
      .where(or(
        eq(investmentCommitments.paymentReference, reference),
        eq(investmentCommitments.stripePaymentIntentId, reference),
      ))
      .limit(1);

    if (!commitment) {
      this.logger.warn(`No investment commitment found for Paystack reference ${reference}`);
      return { received: true, ignored: true };
    }

    if (commitment.status === 'paid') {
      return { received: true, alreadyConfirmed: true };
    }

    if (event.data?.status !== 'success') {
      return { received: true, ignored: true };
    }

    this.assertValidPaystackCharge(event.data, commitment, reference);

    await this.finalizePaidCommitment(
      commitment,
      reference,
      event.data?.id?.toString() || reference,
      'paystack',
    );

    return { received: true, finalized: true };
  }

  private async finalizePaidCommitment(
    commitment: any,
    paymentReference: string,
    chargeReference: string,
    paymentProvider: string,
  ) {
    if (commitment.status === 'paid') {
      return { finalized: false };
    }

    const result = await this.runInTransaction(async (tx) => {
      const now = new Date();
      const finalizedRows = await tx
        .update(investmentCommitments)
        .set({
          status: 'paid',
          paidAt: now,
          paymentProvider,
          paymentReference,
          providerTransactionId: chargeReference,
          paymentCurrency: process.env.PAYSTACK_CURRENCY || 'NGN',
          paymentVerifiedAt: now,
          paymentFinalizedAt: now,
          stripePaymentIntentId: paymentReference,
          stripeChargeId: chargeReference,
          updatedAt: now,
        })
        .where(and(
          eq(investmentCommitments.id, commitment.id),
          inArray(investmentCommitments.status, ['pending', 'processing'] as any),
        ))
        .returning();

      const finalizedCommitment = finalizedRows?.[0];
      if (!finalizedCommitment) {
        return { finalized: false };
      }

      await tx
        .update(crowdfundingCampaigns)
        .set({
          fundingRaised: sql`${crowdfundingCampaigns.fundingRaised} + ${commitment.amount}`,
          currentInvestorCount: sql`${crowdfundingCampaigns.currentInvestorCount} + 1`,
        })
        .where(eq(crowdfundingCampaigns.id, commitment.campaignId));

      const [campaignRow] = await tx
        .select()
        .from(crowdfundingCampaigns)
        .where(eq(crowdfundingCampaigns.id, commitment.campaignId))
        .limit(1);

      if (campaignRow?.appId) {
        await this.recordInvestmentHolding(tx, {
          appId: campaignRow.appId,
          campaignId: commitment.campaignId,
          commitmentId: commitment.id,
          investorId: commitment.investorId,
          amount: commitment.amount,
          stakePct: commitment.stakePct,
        });

        await this.upsertShareholderMembership(tx, {
          appId: campaignRow.appId,
          investorId: commitment.investorId,
          stakePct: commitment.stakePct,
        });

        await tx.insert(investorNotifications).values({
          investorId: commitment.investorId,
          appId: campaignRow.appId,
          type: 'app_launched',
          title: `Investment confirmed: ${campaignRow.title}`,
          content: `Your ${commitment.stakePct}% stake is now recorded for this app.`,
          relatedEntityType: 'investment_commitment',
          relatedEntityId: commitment.id,
        });
      }

      await tx
        .update(escrowAccounts)
        .set({
          totalCommitted: sql`${escrowAccounts.totalCommitted} + ${commitment.amount}`,
          totalHeld: sql`${escrowAccounts.totalHeld} + ${commitment.amount}`,
        })
        .where(eq(escrowAccounts.campaignId, commitment.campaignId));

      return {
        finalized: true,
        campaignId: commitment.campaignId,
      };
    });

    if (!result.finalized) {
      return result;
    }

    const campaign = await this.findOne(commitment.campaignId);

    if (parseFloat(campaign.fundingRaised) >= parseFloat(campaign.fundingGoal)) {
      await this.markAsFunded(commitment.campaignId);
    }

    return result;
  }

  /**
   * Attach an app to every campaign that was raised on an idea (appId null),
   * then materialize ownership for all paid commitments: investment holdings,
   * shareholder co-owner rows, and investor notifications. Called when an idea
   * converts into an app. Idempotent — holdings are keyed by commitmentId and
   * memberships upsert, so re-running is safe.
   */
  async linkIdeaCampaignsToApp(ideaId: string, appId: string) {
    const campaigns = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.ideaId, ideaId));

    let linked = 0;
    let holdingsCreated = 0;

    for (const campaign of campaigns) {
      if (!campaign.appId) {
        await this.db
          .update(crowdfundingCampaigns)
          .set({ appId, updatedAt: new Date() })
          .where(eq(crowdfundingCampaigns.id, campaign.id));
        linked++;
      } else if (campaign.appId !== appId) {
        continue;
      }

      const paidCommitments = await this.db
        .select()
        .from(investmentCommitments)
        .where(and(
          eq(investmentCommitments.campaignId, campaign.id),
          eq(investmentCommitments.status, 'paid'),
        ));

      for (const commitment of paidCommitments) {
        await this.runInTransaction(async (tx) => {
          const existing = await tx
            .select({ id: appInvestmentHoldings.id })
            .from(appInvestmentHoldings)
            .where(eq(appInvestmentHoldings.commitmentId, commitment.id))
            .limit(1);
          if (existing.length > 0) return;

          await this.recordInvestmentHolding(tx, {
            appId,
            campaignId: campaign.id,
            commitmentId: commitment.id,
            investorId: commitment.investorId,
            amount: commitment.amount,
            stakePct: commitment.stakePct,
          });

          await this.upsertShareholderMembership(tx, {
            appId,
            investorId: commitment.investorId,
            stakePct: commitment.stakePct,
          });

          await tx.insert(investorNotifications).values({
            investorId: commitment.investorId,
            appId,
            type: 'app_launched',
            title: `${campaign.title} is now in build`,
            content: `The idea you backed has become an app. Your ${commitment.stakePct}% stake is now recorded on its cap table.`,
            relatedEntityType: 'investment_commitment',
            relatedEntityId: commitment.id,
          });

          holdingsCreated++;
        });
      }
    }

    if (linked || holdingsCreated) {
      this.logger.log(
        `Linked ${linked} idea campaign(s) to app ${appId}; materialized ${holdingsCreated} holding(s)`,
      );
    }

    return { linkedCampaigns: linked, holdingsCreated };
  }

  private async runInTransaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    if (typeof this.db.transaction === 'function') {
      return this.db.transaction(work);
    }
    return work(this.db);
  }

  private async recordInvestmentHolding(tx: any, input: {
    appId: string;
    campaignId: string;
    commitmentId: string;
    investorId: string;
    amount: string;
    stakePct: string;
  }) {
    const existing = await tx
      .select({ id: appInvestmentHoldings.id })
      .from(appInvestmentHoldings)
      .where(eq(appInvestmentHoldings.commitmentId, input.commitmentId))
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await tx.insert(appInvestmentHoldings).values({
      appId: input.appId,
      campaignId: input.campaignId,
      commitmentId: input.commitmentId,
      investorId: input.investorId,
      amount: input.amount,
      stakePct: input.stakePct,
      status: 'active',
    });
  }

  private assertValidPaystackCharge(charge: any, commitment: any, expectedReference: string) {
    if (charge.status !== 'success') {
      throw new BadRequestException('Payment not completed');
    }

    if (charge.reference !== expectedReference) {
      throw new BadRequestException('Payment reference does not match this commitment');
    }

    const expectedAmount = Math.round(Number(commitment.amount || 0) * 100);
    const paidAmount = Number(charge.amount || 0);
    if (paidAmount !== expectedAmount) {
      throw new BadRequestException('Payment amount does not match commitment amount');
    }

    const expectedCurrency = process.env.PAYSTACK_CURRENCY || commitment.paymentCurrency || 'NGN';
    if (charge.currency && charge.currency !== expectedCurrency) {
      throw new BadRequestException('Payment currency does not match campaign currency');
    }

    const metadata = charge.metadata || {};
    if (metadata.commitmentId && metadata.commitmentId !== commitment.id) {
      throw new BadRequestException('Payment metadata does not match this commitment');
    }
    if (metadata.campaignId && metadata.campaignId !== commitment.campaignId) {
      throw new BadRequestException('Payment metadata does not match this campaign');
    }
    if (metadata.investorId && metadata.investorId !== commitment.investorId) {
      throw new BadRequestException('Payment metadata does not match this investor');
    }
  }

  private async upsertShareholderMembership(tx: any, input: { appId: string; investorId: string; stakePct: string }) {
    const [investor] = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, input.investorId))
      .limit(1);

    if (!investor) return;

    const existing = await tx
      .select({ id: appCoowners.id, role: appCoowners.role, equityPct: appCoowners.equityPct })
      .from(appCoowners)
      .where(and(eq(appCoowners.appId, input.appId), eq(appCoowners.userId, input.investorId)))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].role === 'shareholder') {
        await tx
          .update(appCoowners)
          .set({
            equityPct: input.stakePct,
            status: 'accepted',
            joinedAt: new Date(),
          })
          .where(eq(appCoowners.id, existing[0].id));
      }
      return;
    }

    await tx.insert(appCoowners).values({
      appId: input.appId,
      userId: input.investorId,
      email: investor.email,
      role: 'shareholder',
      equityPct: input.stakePct,
      status: 'accepted',
      joinedAt: new Date(),
      ipAssigned: false,
    });
  }

  private isValidPaystackSignature(rawBody: Buffer, signature: string | undefined) {
    if (!process.env.PAYSTACK_SECRET_KEY || !signature) return false;
    const expected = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    return expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  private async initializePaystackTransaction(input: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    metadata: Record<string, string>;
  }) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        currency: process.env.PAYSTACK_CURRENCY || 'NGN',
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result?.status) {
      throw new BadRequestException(result?.message || 'Failed to initialize Paystack transaction');
    }

    return {
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference: result.data.reference,
    };
  }

  private async verifyPaystackTransaction(reference: string) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('Paystack is not configured');
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const result = await response.json();
    if (!response.ok || !result?.status) {
      throw new BadRequestException(result?.message || 'Failed to verify Paystack transaction');
    }

    return result.data;
  }

  private generatePaymentReference(commitmentId: string) {
    return `MCEO-${commitmentId}-${Date.now()}`;
  }

  private buildPaymentCallbackUrl(returnUri: string | undefined, commitmentId: string) {
    if (!returnUri) return undefined;
    const separator = returnUri.includes('?') ? '&' : '?';
    return `${returnUri}${separator}commitmentId=${encodeURIComponent(commitmentId)}`;
  }

  async getInvestors(campaignId: string, userId: string) {
    const campaign = await this.findOne(campaignId);
    
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Only campaign owner can view investors');
    }

    const commitments = await this.db
      .select({
        commitment: investmentCommitments,
        investor: users,
      })
      .from(investmentCommitments)
      .innerJoin(users, eq(investmentCommitments.investorId, users.id))
      .where(eq(investmentCommitments.campaignId, campaignId))
      .orderBy(desc(investmentCommitments.paidAt));

    return commitments.map((c: any) => ({
      id: c.commitment.id,
      investorId: c.investor.id,
      investorName: c.investor.fullName || c.investor.email.split('@')[0],
      amount: parseFloat(c.commitment.amount),
      stakePct: parseFloat(c.commitment.stakePct),
      status: c.commitment.status,
      investedAt: c.commitment.paidAt,
    }));
  }

  async getUserInvestments(userId: string) {
    const result = await this.db
      .select({
        commitment: investmentCommitments,
        campaign: crowdfundingCampaigns,
      })
      .from(investmentCommitments)
      .innerJoin(
        crowdfundingCampaigns,
        eq(investmentCommitments.campaignId, crowdfundingCampaigns.id)
      )
      .where(eq(investmentCommitments.investorId, userId))
      .orderBy(desc(investmentCommitments.createdAt));

    return result.map((r: any) => ({
      commitment: this.mapCommitmentToResponse(r.commitment),
      campaign: this.mapToResponse(r.campaign),
    }));
  }

  async calculateStakeForAmount(id: string, dto: CalculateStakeDto) {
    const campaign = await this.findOne(id);

    const commitments = await this.db
      .select()
      .from(investmentCommitments)
      .where(and(
        eq(investmentCommitments.campaignId, id),
        eq(investmentCommitments.status, 'paid')
      ));

    const totalStakes = commitments.reduce(
      (sum: number, c: any) => sum + parseFloat(c.stakePct),
      0,
    );
    const remainingEquity = parseFloat(campaign.equityOfferedPct) - totalStakes;
    const remainingFunding = parseFloat(campaign.fundingGoal) - parseFloat(campaign.fundingRaised);

    const stakePct = this.calculateStake(
      dto.amount,
      parseFloat(campaign.preMoneyValuation),
      parseFloat(campaign.equityOfferedPct)
    );

    return {
      amount: dto.amount,
      stakePct,
      stakePctFormatted: `${stakePct.toFixed(4)}%`,
      equityRemaining: remainingEquity,
      fundingRemaining: remainingFunding,
      valuation: parseFloat(campaign.preMoneyValuation),
      minInvestment: parseFloat(campaign.minInvestment),
      maxInvestment: campaign.maxInvestment ? parseFloat(campaign.maxInvestment) : null,
      isValid: dto.amount >= parseFloat(campaign.minInvestment) && 
               (dto.amount <= remainingFunding) &&
               (stakePct <= remainingEquity),
      validationErrors: this.validateInvestment(dto.amount, campaign).errors,
    };
  }

  async createShareLink(id: string, dto: CreateShareLinkDto, userId: string) {
    const campaign = await this.findOne(id);
    
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Only campaign owner can create share links');
    }

    const token = this.generateShareToken();
    const expiresAt = dto.expiresInDays 
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [share] = await this.db
      .insert(campaignShares)
      .values({
        campaignId: id,
        shareToken: token,
        shareType: dto.type || 'public',
        maxUses: dto.maxUses,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    return {
      shareToken: share.shareToken,
      shareUrl: `${process.env.FRONTEND_URL}/invest/${share.shareToken}`,
      expiresAt: share.expiresAt,
    };
  }

  private calculateStake(amount: number, valuation: number, equityOfferedPct: number): number {
    const postMoneyValuation = valuation + amount;
    const stakePct = (amount / postMoneyValuation) * equityOfferedPct;
    return Math.round(stakePct * 10000) / 10000;
  }

  private validateInvestment(amount: number, campaign: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (amount < parseFloat(campaign.minInvestment)) {
      errors.push(`Minimum investment is $${campaign.minInvestment}`);
    }

    if (campaign.maxInvestment && amount > parseFloat(campaign.maxInvestment)) {
      errors.push(`Maximum investment is $${campaign.maxInvestment}`);
    }

    const remainingFunding = parseFloat(campaign.fundingGoal) - parseFloat(campaign.fundingRaised);
    if (amount > remainingFunding) {
      errors.push(`Maximum additional investment is $${remainingFunding.toFixed(2)}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  private async markAsFunded(campaignId: string) {
    await this.db
      .update(crowdfundingCampaigns)
      .set({
        status: 'funded',
        fundedAt: new Date(),
      })
      .where(eq(crowdfundingCampaigns.id, campaignId));

    await this.db
      .update(escrowAccounts)
      .set({ status: 'releasing' })
      .where(eq(escrowAccounts.campaignId, campaignId));

    this.logger.log(`Campaign ${campaignId} marked as funded`);
  }

  async releaseEscrow(campaignId: string, userId: string) {
    const [campaign] = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.id, campaignId));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Only campaign owner can release escrow');
    }

    if (campaign.status !== 'funded') {
      throw new BadRequestException('Campaign must be funded to release escrow');
    }

    const [escrow] = await this.db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.campaignId, campaignId));

    if (!escrow) {
      throw new NotFoundException('Escrow account not found');
    }

    await this.db
      .update(escrowAccounts)
      .set({
        status: 'released',
        releasedAt: new Date(),
      })
      .where(eq(escrowAccounts.id, escrow.id));

    return { success: true, message: 'Escrow funds released to your account' };
  }

  async getEscrowDetails(campaignId: string, userId: string) {
    const [campaign] = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.id, campaignId));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Only campaign owner can view escrow details');
    }

    const [escrow] = await this.db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.campaignId, campaignId));

    if (!escrow) {
      throw new NotFoundException('Escrow account not found');
    }

    return {
      totalCommitted: parseFloat(escrow.totalCommitted),
      totalHeld: parseFloat(escrow.totalHeld),
      totalReleased: parseFloat(escrow.totalReleased),
      totalRefunded: parseFloat(escrow.totalRefunded),
      platformFeesEarned: parseFloat(escrow.platformFeesEarned),
      status: escrow.status,
      releasedAt: escrow.releasedAt,
    };
  }

  async postCampaignUpdate(campaignId: string, title: string, content: string, userId: string) {
    const [campaign] = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.id, campaignId));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Only campaign owner can post updates');
    }

    const [update] = await this.db
      .insert(progressUpdates)
      .values({
        appId: campaign.appId,
        title,
        content,
        authorId: userId,
        visibility: 'investors',
      })
      .returning();

    const commitments = await this.db
      .select({ investorId: investmentCommitments.investorId })
      .from(investmentCommitments)
      .where(and(
        eq(investmentCommitments.campaignId, campaignId),
        eq(investmentCommitments.status, 'paid')
      ));

    const investorIds = [...new Set(commitments.map((c: any) => c.investorId))];

    if (investorIds.length > 0) {
      const notifications = investorIds.map(investorId => ({
        investorId,
        appId: campaign.appId,
        type: 'update_posted' as const,
        title: `Update: ${campaign.title}`,
        content: title,
        relatedEntityType: 'update',
        relatedEntityId: update.id,
      }));

      await this.db.insert(investorNotifications).values(notifications);
    }

    return update;
  }

  async getCampaignUpdates(campaignId: string) {
    const [campaign] = await this.db
      .select()
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.id, campaignId));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updates = await this.db
      .select({
        id: progressUpdates.id,
        title: progressUpdates.title,
        content: progressUpdates.content,
        createdAt: progressUpdates.createdAt,
        author: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(progressUpdates)
      .innerJoin(users, eq(progressUpdates.authorId, users.id))
      .where(eq(progressUpdates.appId, campaign.appId))
      .orderBy(desc(progressUpdates.createdAt));

    return updates;
  }

  private async processRefunds(campaignId: string) {
    const commitments = await this.db
      .select()
      .from(investmentCommitments)
      .where(and(
        eq(investmentCommitments.campaignId, campaignId),
        eq(investmentCommitments.status, 'paid')
      ));

    for (const commitment of commitments) {
      try {
        await this.db
          .update(investmentCommitments)
          .set({
            status: 'refunded',
            refundedAt: new Date(),
          })
          .where(eq(investmentCommitments.id, commitment.id));
      } catch (error) {
        this.logger.error(`Failed to refund commitment ${commitment.id}`, error);
      }
    }
  }

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  }

  private generateShareToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private mapToResponse(item: any) {
    return {
      ...item,
      fundingGoal: item.fundingGoal ? parseFloat(item.fundingGoal) : null,
      fundingRaised: item.fundingRaised ? parseFloat(item.fundingRaised) : null,
      minInvestment: item.minInvestment ? parseFloat(item.minInvestment) : null,
      maxInvestment: item.maxInvestment ? parseFloat(item.maxInvestment) : null,
      equityOfferedPct: item.equityOfferedPct ? parseFloat(item.equityOfferedPct) : null,
      preMoneyValuation: item.preMoneyValuation ? parseFloat(item.preMoneyValuation) : null,
      platformFeePct: item.platformFeePct ? parseFloat(item.platformFeePct) : null,
      createdAt: item.createdAt ? new Date(item.createdAt) : null,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : null,
    };
  }

  private mapCommitmentToResponse(item: any) {
    return {
      ...item,
      amount: item.amount ? parseFloat(item.amount) : null,
      stakePct: item.stakePct ? parseFloat(item.stakePct) : null,
      valuationAtCommitment: item.valuationAtCommitment ? parseFloat(item.valuationAtCommitment) : null,
      committedAt: item.committedAt ? new Date(item.committedAt) : null,
      paidAt: item.paidAt ? new Date(item.paidAt) : null,
    };
  }
}
