import { Injectable, Inject, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DRIZZLE } from '../../database/database.module';
import { ceoApiKeys, apps, appMetrics, appLifecycle, lifecycleSteps } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { StripeConnectorService } from './connectors/stripe-connector.service';

/** Hash used for API-key lookup. Raw keys are never stored. */
const hashApiKey = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

/** Non-secret masked hint shown in the dashboard. */
const previewApiKey = (raw: string): string =>
  `${raw.slice(0, 8)}…${raw.slice(-4)}`;

// Columns safe to return to the dashboard — never includes the key hash.
const publicKeyColumns = {
  id: ceoApiKeys.id,
  userId: ceoApiKeys.userId,
  appId: ceoApiKeys.appId,
  name: ceoApiKeys.name,
  keyPreview: ceoApiKeys.keyPreview,
  status: ceoApiKeys.status,
  lastUsedAt: ceoApiKeys.lastUsedAt,
  createdAt: ceoApiKeys.createdAt,
  updatedAt: ceoApiKeys.updatedAt,
};

@Injectable()
export class CeoControlService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private stripeConnector: StripeConnectorService
  ) {}

  async generateApiKey(userId: string, appId: string | null, name: string) {
    const rawKey = `mvp_ceo_${randomBytes(24).toString('hex')}`;

    const [newKey] = await this.db.insert(ceoApiKeys).values({
      userId,
      appId,
      name,
      apiKey: hashApiKey(rawKey),
      keyPreview: previewApiKey(rawKey),
      status: 'active',
    }).returning(publicKeyColumns);

    // The raw key is returned exactly once; it cannot be recovered later.
    return { ...newKey, apiKey: rawKey };
  }

  async listApiKeys(userId: string) {
    return this.db.select(publicKeyColumns).from(ceoApiKeys).where(eq(ceoApiKeys.userId, userId));
  }

  async revokeApiKey(userId: string, keyId: string) {
    return this.db.update(ceoApiKeys)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(and(eq(ceoApiKeys.id, keyId), eq(ceoApiKeys.userId, userId)))
      .returning(publicKeyColumns);
  }

  async validateApiKey(apiKey: string) {
    const [keyRecord] = await this.db.select().from(ceoApiKeys).where(and(eq(ceoApiKeys.apiKey, hashApiKey(apiKey)), eq(ceoApiKeys.status, 'active')));
    if (!keyRecord) throw new UnauthorizedException('Invalid or inactive API Key');

    await this.db.update(ceoApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(ceoApiKeys.id, keyRecord.id));

    return keyRecord;
  }

  /**
   * Validates a key AND enforces that it is scoped to the requested app.
   * Unscoped (global) keys are rejected so a single key cannot read arbitrary
   * apps by iterating ids.
   */
  async validateApiKeyForApp(apiKey: string, appId: string) {
    const keyRecord = await this.validateApiKey(apiKey);
    if (!keyRecord.appId || keyRecord.appId !== appId) {
      throw new UnauthorizedException('API Key is not authorized for this app');
    }
    return keyRecord;
  }

  async getAppStats(appId: string) {
    const [app] = await this.db.select().from(apps).where(eq(apps.id, appId));
    if (!app) throw new NotFoundException('App not found');

    // Fetch real-time data from Stripe using the app's connected account id.
    // Apps without a linked Stripe account simply report no live financials
    // instead of failing the whole stats request.
    const liveFinancials = app.stripeAccountId
      ? await this.stripeConnector.fetchFinancials(app.stripeAccountId).catch(() => null)
      : null;

    // Fetch lifecycle progress
    const [lifecycle] = await this.db.select().from(appLifecycle).where(eq(appLifecycle.appId, appId));

    const metrics = await this.db.select().from(appMetrics)
      .where(eq(appMetrics.appId, appId))
      .orderBy(appMetrics.date);

    return {
      app,
      metrics,
      worth: app.estimatedValue,
      liveFinancials,
      lifecycle: lifecycle || null,
    };
  }

  // --- Lifecycle Progress Management ---

  async getLifecycle(appId: string) {
    const [progress] = await this.db.select().from(appLifecycle).where(eq(appLifecycle.appId, appId));
    const allSteps = await this.db.select().from(lifecycleSteps).orderBy(lifecycleSteps.order);
    
    return {
      progress: progress || { currentStepId: 'plan', completionPercentage: 0 },
      steps: allSteps,
    };
  }

  async updateLifecycle(appId: string, stepId: string, percentage: number, userId: string) {
    // Check if progress exists
    const [existing] = await this.db.select().from(appLifecycle).where(eq(appLifecycle.appId, appId));

    if (existing) {
      return this.db.update(appLifecycle)
        .set({ 
          currentStepId: stepId, 
          completionPercentage: percentage, 
          lastUpdatedBy: userId, 
          updatedAt: new Date() 
        })
        .where(eq(appLifecycle.appId, appId))
        .returning();
    } else {
      return this.db.insert(appLifecycle).values({
        appId,
        currentStepId: stepId,
        completionPercentage: percentage,
        lastUpdatedBy: userId,
      }).returning();
    }
  }

  async triggerAlert(appId: string, issue: string, severity: string) {
    console.log(`Alert System: [${severity}] App ${appId} - ${issue}`);
    // In reality, this would send an SMS/Email via Twilio/Resend
    // and also store in an 'alerts' table
    return { status: 'alert_sent', timestamp: new Date() };
  }
}
