import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { scheduledPosts, socialAccounts } from '../../database/schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';

export interface CreateScheduledPostPayload {
  appId: string;
  userId: string;
  content: string;
  mediaUrls?: string[];
  platforms: string[];
  scheduledAt: Date;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface ScheduledPost {
  id: string;
  appId: string;
  userId: string;
  content: string;
  mediaUrls: string[] | null;
  platforms: string[];
  scheduledAt: Date;
  timezone: string;
  status: string;
  publishedAt: Date | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  parentPostId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SchedulerService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async createScheduledPost(data: CreateScheduledPostPayload): Promise<ScheduledPost> {
    if (new Date(data.scheduledAt) <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const [post] = await this.db.insert(scheduledPosts).values({
      appId: data.appId,
      userId: data.userId,
      content: data.content,
      mediaUrls: data.mediaUrls,
      platforms: data.platforms,
      scheduledAt: data.scheduledAt,
      timezone: data.timezone || 'UTC',
      isRecurring: data.isRecurring || false,
      recurrenceRule: data.recurrenceRule,
      status: 'pending',
    }).returning();

    return post;
  }

  async getScheduledPosts(appId: string): Promise<ScheduledPost[]> {
    return this.db
      .select()
      .from(scheduledPosts)
      .where(eq(scheduledPosts.appId, appId))
      .orderBy(asc(scheduledPosts.scheduledAt));
  }

  async getCalendarData(appId: string, startDate: Date, endDate: Date): Promise<ScheduledPost[]> {
    return this.db
      .select()
      .from(scheduledPosts)
      .where(
        and(
          eq(scheduledPosts.appId, appId),
          gte(scheduledPosts.scheduledAt, startDate),
          lte(scheduledPosts.scheduledAt, endDate),
        ),
      )
      .orderBy(asc(scheduledPosts.scheduledAt));
  }

  async getScheduledPost(id: string): Promise<ScheduledPost | null> {
    const [post] = await this.db.select().from(scheduledPosts).where(eq(scheduledPosts.id, id));
    return post || null;
  }

  async updateScheduledPost(id: string, data: Partial<CreateScheduledPostPayload>): Promise<ScheduledPost> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    const [post] = await this.db
      .update(scheduledPosts)
      .set(updateData)
      .where(eq(scheduledPosts.id, id))
      .returning();
    
    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }
    return post;
  }

  async cancelScheduledPost(id: string): Promise<{ success: boolean }> {
    await this.db
      .update(scheduledPosts)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(scheduledPosts.id, id));
    return { success: true };
  }

  async publishNow(id: string): Promise<{ success: boolean; post?: any }> {
    const [post] = await this.db.select().from(scheduledPosts).where(eq(scheduledPosts.id, id));
    
    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (post.status !== 'pending') {
      throw new BadRequestException('Post is not in pending status');
    }

    const platformResults: Record<string, any> = {};

    for (const platform of post.platforms) {
      try {
        const account = await this.db
          .select()
          .from(socialAccounts)
          .where(
            and(
              eq(socialAccounts.appId, post.appId),
              eq(socialAccounts.platform, platform),
            ),
          )
          .then((rows: any[]) => rows[0]);

        if (!account) {
          platformResults[platform] = { status: 'failed', error: 'No connected account' };
          continue;
        }

        const result = await this.postToPlatform(platform, account, post);
        platformResults[platform] = { status: 'posted', postId: result.postId, url: result.url };
      } catch (error: any) {
        platformResults[platform] = { status: 'failed', error: error.message };
      }
    }

    const allSuccessful = Object.values(platformResults).every((r: any) => r.status === 'posted');

    await this.db
      .update(scheduledPosts)
      .set({
        status: allSuccessful ? 'published' : 'failed',
        publishedAt: new Date(),
        platformPosts: platformResults,
        updatedAt: new Date(),
      })
      .where(eq(scheduledPosts.id, id));

    return { success: allSuccessful };
  }

  async getPendingPostsToPublish(): Promise<ScheduledPost[]> {
    const now = new Date();
    return this.db
      .select()
      .from(scheduledPosts)
      .where(
        and(
          eq(scheduledPosts.status, 'pending'),
          lte(scheduledPosts.scheduledAt, now),
        ),
      );
  }

  async processScheduledPost(id: string): Promise<void> {
    const result = await this.publishNow(id);
    
    if (result.success) {
      const post = await this.getScheduledPost(id);
      if (post?.isRecurring && post.recurrenceRule) {
        await this.createNextRecurringPost(post);
      }
    }
  }

  private async createNextRecurringPost(parentPost: ScheduledPost): Promise<void> {
    const nextDate = this.calculateNextDate(parentPost.scheduledAt, parentPost.recurrenceRule!);
    
    await this.db.insert(scheduledPosts).values({
      appId: parentPost.appId,
      userId: parentPost.userId,
      content: parentPost.content,
      mediaUrls: parentPost.mediaUrls,
      platforms: parentPost.platforms,
      scheduledAt: nextDate,
      timezone: parentPost.timezone,
      isRecurring: true,
      recurrenceRule: parentPost.recurrenceRule,
      parentPostId: parentPost.id,
      status: 'pending',
    });
  }

  private calculateNextDate(currentDate: Date, rule: string): Date {
    const date = new Date(currentDate);
    
    switch (rule) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      default:
        break;
    }
    
    return date;
  }

  private async postToPlatform(platform: string, account: any, post: any): Promise<{ postId: string; url: string }> {
    switch (platform) {
      case 'instagram':
        return this.postToInstagram(account, post);
      case 'tiktok':
        return this.postToTikTok(account, post);
      case 'twitter':
        return this.postToTwitter(account, post);
      default:
        throw new BadRequestException(`Platform ${platform} not supported`);
    }
  }

  private async postToInstagram(account: any, post: any): Promise<{ postId: string; url: string }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${account.platformUserId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify({
          media_type: 'IMAGE',
          image_url: post.mediaUrls?.[0],
          caption: post.content,
          access_token: account.accessToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Instagram API error: ${error}`);
    }

    const result = await response.json();
    return { postId: result.id, url: `https://instagram.com/p/${result.id}` };
  }

  private async postToTikTok(account: any, post: any): Promise<{ postId: string; url: string }> {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_title: post.content.substring(0, 100),
          media_urls: post.mediaUrls,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`TikTok API error: ${error}`);
    }

    const result = await response.json();
    return { postId: result.post_id, url: `https://tiktok.com/@${account.username}/video/${result.post_id}` };
  }

  private async postToTwitter(account: any, post: any): Promise<{ postId: string; url: string }> {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({ text: post.content }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Twitter API error: ${error}`);
    }

    const result = await response.json();
    return { postId: result.data.id, url: `https://twitter.com/i/status/${result.data.id}` };
  }
}