import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { automations, socialAccounts } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

export interface AutomationNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CreateAutomationPayload {
  appId: string;
  name: string;
  description?: string;
  flowData: {
    nodes: AutomationNode[];
    edges: AutomationEdge[];
  };
  triggers: Array<{
    type: string;
    value?: string;
    platform?: string;
  }>;
}

export interface Automation {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  flowData: {
    nodes: AutomationNode[];
    edges: AutomationEdge[];
  };
  triggers: Array<{
    type: string;
    value?: string;
    platform?: string;
  }>;
  status: string;
  stats: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AutomationService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async createAutomation(data: CreateAutomationPayload): Promise<Automation> {
    const [automation] = await this.db.insert(automations).values({
      appId: data.appId,
      name: data.name,
      description: data.description,
      flowData: data.flowData,
      triggers: data.triggers,
      status: 'draft',
      stats: { triggers: 0, conversions: 0 },
    }).returning();

    return automation;
  }

  async getAutomations(appId: string): Promise<Automation[]> {
    return this.db.select().from(automations).where(eq(automations.appId, appId));
  }

  async getAutomation(id: string): Promise<Automation | null> {
    const [automation] = await this.db.select().from(automations).where(eq(automations.id, id));
    return automation || null;
  }

  async updateAutomation(id: string, data: Partial<CreateAutomationPayload>): Promise<Automation> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    const [automation] = await this.db
      .update(automations)
      .set(updateData)
      .where(eq(automations.id, id))
      .returning();
    
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }
    return automation;
  }

  async deleteAutomation(id: string): Promise<{ success: boolean }> {
    await this.db.delete(automations).where(eq(automations.id, id));
    return { success: true };
  }

  async publishAutomation(id: string): Promise<Automation> {
    const [automation] = await this.db
      .update(automations)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();
    
    return automation;
  }

  async pauseAutomation(id: string): Promise<Automation> {
    const [automation] = await this.db
      .update(automations)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();
    
    return automation;
  }

  async processWebhook(
    platform: string,
    platformUserId: string,
    message: string,
    appId: string,
  ): Promise<{ triggered: boolean; actions: any[] }> {
    const automationsList = await this.db
      .select()
      .from(automations)
      .where(
        and(
          eq(automations.appId, appId),
          eq(automations.status, 'active'),
        ),
      );

    const triggerResults: any[] = [];

    for (const automation of automationsList) {
      const triggers = automation.triggers as any[];
      
      for (const trigger of triggers) {
        if (trigger.type === 'keyword' && message.toLowerCase().includes(trigger.value.toLowerCase())) {
          const result = await this.executeAutomation(automation, platform, platformUserId, message);
          triggerResults.push(result);
          
          await this.incrementStats(automation.id, 'triggers');
        }
      }
    }

    return {
      triggered: triggerResults.length > 0,
      actions: triggerResults,
    };
  }

  private async executeAutomation(
    automation: Automation,
    platform: string,
    platformUserId: string,
    message: string,
  ): Promise<any> {
    const flowData = automation.flowData as any;
    const executedActions: any[] = [];

    const actionNodes = flowData.nodes.filter((node: any) => node.type === 'action');
    
    for (const node of actionNodes) {
      const actionResult = await this.executeAction(node.data, platform, platformUserId, message);
      executedActions.push(actionResult);
    }

    return { automationId: automation.id, actions: executedActions };
  }

  private async executeAction(
    actionData: Record<string, any>,
    platform: string,
    platformUserId: string,
    message: string,
  ): Promise<any> {
    const { actionType, message: replyMessage, mediaUrl, tags, httpUrl } = actionData;

    switch (actionType) {
      case 'reply':
        return {
          type: 'send_message',
          platform,
          platformUserId,
          message: replyMessage,
          mediaUrl,
        };
      
      case 'add_tag':
        return {
          type: 'add_tag',
          platform,
          platformUserId,
          tags: tags || [],
        };
      
      case 'http_request':
        return {
          type: 'http_request',
          url: httpUrl,
          method: 'POST',
          body: { platform, platformUserId, message },
        };
      
      default:
        return { type: 'unknown', actionType };
    }
  }

  private async incrementStats(automationId: string, statKey: string): Promise<void> {
    const [automation] = await this.db
      .select()
      .from(automations)
      .where(eq(automations.id, automationId));

    const stats = (automation.stats as Record<string, any>) || {};
    stats[statKey] = (stats[statKey] || 0) + 1;

    await this.db
      .update(automations)
      .set({ stats, updatedAt: new Date() })
      .where(eq(automations.id, automationId));
  }
}