import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { socialAccounts, automationRules, talentHireRequests } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class SocialAutomationService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  // --- Social Account Management ---
  async connectAccount(appId: string, data: any) {
    const [account] = await this.db.insert(socialAccounts).values({
      appId,
      platform: data.platform,
      platformUserId: data.platformUserId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      username: data.username,
      avatarUrl: data.avatarUrl,
    }).returning();
    return account;
  }

  async getAccounts(appId: string) {
    return this.db.select().from(socialAccounts).where(eq(socialAccounts.appId, appId));
  }

  // --- Automation Rules ---
  async createRule(appId: string, data: any) {
    const [rule] = await this.db.insert(automationRules).values({
      appId,
      name: data.name,
      triggerType: data.triggerType,
      triggerValue: data.triggerValue,
      actionType: data.actionType,
      actionPayload: data.actionPayload,
    }).returning();
    return rule;
  }

  async getRules(appId: string) {
    return this.db.select().from(automationRules).where(eq(automationRules.appId, appId));
  }

  async toggleRule(ruleId: string, status: 'active' | 'paused') {
    const [updated] = await this.db.update(automationRules)
      .set({ status, updatedAt: new Date() })
      .where(eq(automationRules.id, ruleId))
      .returning();
    return updated;
  }

  /**
   * Mock processor for "ManyChat" style auto-replies
   */
  async processIncomingMessage(platform: string, platformUserId: string, message: string) {
    console.log(`Social Automation: Processing message from ${platformUserId} on ${platform}: "${message}"`);
    
    // 1. Find the connected account
    const [account] = await this.db.select().from(socialAccounts)
      .where(and(eq(socialAccounts.platform, platform), eq(socialAccounts.platformUserId, platformUserId)));
    
    if (!account) return;

    // 2. Find matching rules
    const rules = await this.getRules(account.appId);
    const matchingRule = rules.find((r: any) => 
      r.status === 'active' && 
      r.triggerType === 'keyword' && 
      message.toLowerCase().includes(r.triggerValue.toLowerCase())
    );

    if (matchingRule) {
      console.log(`Social Automation: Found matching rule "${matchingRule.name}". Executing action: ${matchingRule.actionType}`);
      // In a real app, this would call the platform API (X, Meta, etc.) to send a reply
      return {
        executed: true,
        action: matchingRule.actionType,
        reply: matchingRule.actionPayload.message
      };
    }

    return { executed: false };
  }

  // --- Talent Hiring (UGC) ---
  async hireTalent(ceoId: string, appId: string, talentId: string, data: any) {
    const [request] = await this.db.insert(talentHireRequests).values({
      ceoId,
      appId,
      talentId,
      campaignId: data.campaignId,
      proposal: data.proposal,
      budget: data.budget.toString(),
      status: 'pending',
    }).returning();
    
    console.log(`Talent Marketplace: CEO ${ceoId} hired Talent ${talentId} for App ${appId}`);
    return request;
  }

  async getHireRequests(ceoId: string) {
    return this.db.select().from(talentHireRequests).where(eq(talentHireRequests.ceoId, ceoId));
  }
}
