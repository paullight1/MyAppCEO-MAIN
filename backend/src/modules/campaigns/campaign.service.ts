import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { campaigns } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { CreateCampaignDto, UpdateCampaignStatusDto } from './dto/campaign.dto';

@Injectable()
export class CampaignService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(dto: CreateCampaignDto, userId: string) {
    const [newCampaign] = await this.db.insert(campaigns).values({
      ...dto,
      createdBy: userId,
      totalBudget: dto.totalBudget.toString(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: 'draft',
    }).returning();

    return newCampaign;
  }

  async findByApp(appId: string) {
    return await this.db.select().from(campaigns).where(eq(campaigns.appId, appId));
  }

  async updateStatus(id: string, dto: UpdateCampaignStatusDto) {
    const [updated] = await this.db
      .update(campaigns)
      .set({
        status: dto.status,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return updated;
  }

  async findOne(id: string) {
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!campaign) throw new NotFoundException(`Campaign with ID ${id} not found`);
    return campaign;
  }
}
