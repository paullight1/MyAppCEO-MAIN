import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  GenerateDesignDto,
  BatchGenerateDesignsDto,
  DesignResponse
} from './dto/design.dto';
import { appIdeas, designGenerationProgress, designMockups } from '../../database/schema';
import { DRIZZLE } from '../../database/database.module';
import { and, eq } from 'drizzle-orm';
import { MediaService } from '../media/media.service';

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name);
  private openai?: OpenAI;

  constructor(
    private config: ConfigService,
    @Inject(DRIZZLE) private db: any,
    private readonly mediaService: MediaService,
  ) {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateDesign(dto: GenerateDesignDto, userId: string) {
    const promptVersion = dto.promptVersion || 'design-prompt-v1';
    const prompt = this.buildDesignPrompt(dto);

    if (dto.ideaId) {
      await this.ensureIdeaOwner(dto.ideaId, userId);
      const existing = await this.getCompletedProgress(dto.ideaId, dto.nodeId, promptVersion);
      if (existing?.imageUrl) {
        return {
          success: true,
          data: {
            nodeId: dto.nodeId,
            imageUrl: existing.imageUrl,
            prompt,
            idempotent: true,
          },
        };
      }

      await this.upsertProgress(dto.ideaId, userId, dto.nodeId, {
        status: 'running',
        progress: 10,
        promptVersion,
        provider: dto.engine || 'openai',
      });
    }

    // In production, this would call Google Stitch API
    // For now, we use OpenAI DALL-E as a fallback
    try {
      let imageUrl: string;

      if (this.openai) {
        // Use OpenAI DALL-E 3
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: dto.platform === 'mobile' ? '1024x1792' : '1792x1024',
          quality: 'standard',
        });
        const generatedUrl = response.data?.[0]?.url;
        // DALL·E URLs expire (~1h); copy into permanent storage before we
        // persist/return it so previews and the lightbox don't 404 later.
        imageUrl = generatedUrl
          ? await this.mediaService.persistRemoteImage(generatedUrl, `mvplab_marketplace/designs/${dto.ideaId || 'demo'}`)
          : this.generateMockImageUrl(dto);
      } else {
        // Fallback mock image for demo
        imageUrl = this.generateMockImageUrl(dto);
      }

      // Store in database if ideaId provided
      if (dto.ideaId) {
        await this.db.insert(designMockups).values({
          ideaId: dto.ideaId,
          nodeId: dto.nodeId,
          screenName: dto.label,
          screenType: dto.platform,
          imageUrl,
          orderIndex: 0,
          annotations: {
            nodeId: dto.nodeId,
            promptVersion,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        await this.upsertProgress(dto.ideaId, userId, dto.nodeId, {
          status: 'completed',
          progress: 100,
          imageUrl,
          promptVersion,
          provider: dto.engine || 'openai',
        });
      }

      return {
        success: true,
        data: {
          nodeId: dto.nodeId,
          imageUrl,
          prompt,
        },
      };
    } catch (error) {
      this.logger.error('Design generation failed', error);
      if (dto.ideaId) {
        await this.upsertProgress(dto.ideaId, userId, dto.nodeId, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : String(error),
          promptVersion,
          provider: dto.engine || 'openai',
        });
      }
      return {
        success: false,
        error: 'Failed to generate design',
      };
    }
  }

  async generateBatchDesigns(dto: BatchGenerateDesignsDto, userId: string) {
    const results = [];

    for (const node of dto.nodes) {
      const result = await this.generateDesign({
        ...node,
        brandColors: dto.brandColors,
        platform: dto.platform,
        style: dto.style,
        promptVersion: node.promptVersion || dto.promptVersion,
        engine: node.engine || dto.engine,
        ideaId: dto.ideaId,
      }, userId);

      results.push({
        nodeId: node.nodeId,
        ...result,
      });
    }

    return {
      success: true,
      data: results,
    };
  }

  async getDesignByNode(ideaId: string, nodeId: string, userId: string) {
    await this.ensureIdeaOwner(ideaId, userId);

    const mockups = await this.db
      .select()
      .from(designMockups)
      .where(eq(designMockups.ideaId, ideaId));

    const mockup = mockups.find((m: any) => (
      m.nodeId === nodeId
      || m.annotations?.nodeId === nodeId
      || m.screenName.toLowerCase().includes(nodeId.toLowerCase())
    ));

    if (!mockup) {
      return { success: false, error: 'Design not found' };
    }

    return {
      success: true,
      data: this.mapMockupToResponse(mockup),
    };
  }

  async getAllDesigns(ideaId: string, userId: string) {
    await this.ensureIdeaOwner(ideaId, userId);

    const mockups = await this.db
      .select()
      .from(designMockups)
      .where(eq(designMockups.ideaId, ideaId))
      .orderBy(designMockups.orderIndex);

    return {
      success: true,
      data: mockups.map(this.mapMockupToResponse),
    };
  }

  private buildDesignPrompt(dto: Partial<GenerateDesignDto>): string {
    // Rely on the frontend's MindMap-driven generated Prompt Engine request if available
    // This allows Claude or Gemini on the edge to dictate the strict structural constraints
    if (dto.prompt) {
      return dto.prompt;
    }

    const features = dto.children?.length
      ? `Features: ${dto.children.join(', ')}`
      : '';

    const style = dto.style || 'modern';

    return `Mobile app screen design for "${dto.label}" ${dto.description ? `- ${dto.description}` : ''}.
${features}
Style: ${style}, clean UI, Material Design 3
Brand Colors: Primary ${dto.brandColors?.primary || '#3B82F6'}, Secondary ${dto.brandColors?.secondary || '#8B5CF6'}, Accent ${dto.brandColors?.accent || '#10B981'}
Platform: ${dto.platform === 'mobile' ? 'iOS and Android' : dto.platform}
Include: Header, content area, navigation if applicable
Background: Clean white/light gray
Typography: Sans-serif, modern
Spacing: Generous, comfortable
Make it production-ready with realistic content`;
  }

  private async ensureIdeaOwner(ideaId: string, userId: string) {
    const [idea] = await this.db
      .select({ id: appIdeas.id, ownerId: appIdeas.ownerId })
      .from(appIdeas)
      .where(eq(appIdeas.id, ideaId))
      .limit(1);

    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    if (idea.ownerId !== userId) {
      throw new ForbiddenException('You can only access designs for your own ideas');
    }
  }

  private generateMockImageUrl(dto: Partial<GenerateDesignDto>): string {
    const color = (dto.brandColors?.primary || '#3B82F6').replace('#', '');
    const text = encodeURIComponent(dto.label || 'Screen');
    return `https://placehold.co/400x800/${color}/FFFFFF?text=${text}`;
  }

  private async getCompletedProgress(ideaId: string, nodeId: string, promptVersion: string) {
    const [progress] = await this.db
      .select()
      .from(designGenerationProgress)
      .where(and(
        eq(designGenerationProgress.ideaId, ideaId),
        eq(designGenerationProgress.nodeId, nodeId),
        eq(designGenerationProgress.promptVersion, promptVersion),
        eq(designGenerationProgress.status, 'completed'),
      ))
      .limit(1);

    return progress || null;
  }

  private async upsertProgress(
    ideaId: string,
    ownerId: string,
    nodeId: string,
    update: {
      status: string;
      progress: number;
      imageUrl?: string;
      error?: string;
      promptVersion: string;
      provider?: string;
      model?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(designGenerationProgress)
      .where(and(
        eq(designGenerationProgress.ideaId, ideaId),
        eq(designGenerationProgress.nodeId, nodeId),
        eq(designGenerationProgress.promptVersion, update.promptVersion),
      ));
    const row = existing.find((item: any) => item.nodeId === nodeId && item.promptVersion === update.promptVersion);

    if (row) {
      await this.db
        .update(designGenerationProgress)
        .set({
          status: update.status,
          progress: update.progress,
          imageUrl: update.imageUrl,
          error: update.error,
          provider: update.provider,
          model: update.model,
          updatedAt: new Date(),
        })
        .where(eq(designGenerationProgress.id, row.id));
      return;
    }

    await this.db.insert(designGenerationProgress).values({
      ideaId,
      ownerId,
      nodeId,
      status: update.status,
      progress: update.progress,
      imageUrl: update.imageUrl,
      error: update.error,
      promptVersion: update.promptVersion,
      provider: update.provider,
      model: update.model,
    });
  }

  private mapMockupToResponse(mockup: any): DesignResponse {
    return {
      id: mockup.id,
      nodeId: mockup.nodeId || mockup.annotations?.nodeId || mockup.screenName,
      imageUrl: mockup.imageUrl,
      thumbnailUrl: mockup.thumbnailUrl,
      screenName: mockup.screenName,
      screenType: mockup.screenType,
      createdAt: mockup.createdAt,
    };
  }
}
