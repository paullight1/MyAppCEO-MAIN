import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { talentPortfolios, users, ugcSubmissions } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class CreatorsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async findAllTalents() {
    return await this.db
      .select({
        id: talentPortfolios.id,
        talentId: talentPortfolios.talentId,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        skills: talentPortfolios.skills,
        bio: talentPortfolios.bio,
        hourlyRate: talentPortfolios.hourlyRate,
        status: talentPortfolios.status,
      })
      .from(talentPortfolios)
      .innerJoin(users, eq(talentPortfolios.talentId, users.id))
      .where(eq(talentPortfolios.status, 'approved'));
  }

  async findPortfolioByTalent(talentId: string) {
    const [portfolio] = await this.db
      .select()
      .from(talentPortfolios)
      .where(eq(talentPortfolios.talentId, talentId));
    
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return portfolio;
  }

  async createPortfolio(talentId: string, data: any) {
    const [newPortfolio] = await this.db
      .insert(talentPortfolios)
      .values({
        talentId,
        skills: data.skills,
        experienceYears: data.experienceYears,
        bio: data.bio,
        portfolioLinks: data.portfolioLinks,
        hourlyRate: data.hourlyRate?.toString(),
        status: 'pending_review',
      })
      .returning();
    return newPortfolio;
  }

  async submitUGC(submitterId: string, data: any) {
    const [submission] = await this.db
      .insert(ugcSubmissions)
      .values({
        submitterId,
        appId: data.appId,
        platform: data.platform,
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        caption: data.caption,
        status: 'pending_review',
      })
      .returning();
    return submission;
  }

  async findRecentUGC() {
    return await this.db
      .select()
      .from(ugcSubmissions)
      .where(eq(ugcSubmissions.status, 'approved'))
      .orderBy(desc(ugcSubmissions.createdAt))
      .limit(20);
  }
}
