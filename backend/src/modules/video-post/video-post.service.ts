import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { videoPosts, socialAccounts } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateVideoPostPayload {
  appId: string;
  userId: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  caption?: string;
  platforms: string[];
}

export interface VideoPost {
  id: string;
  appId: string;
  userId: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  caption: string | null;
  platforms: string[];
  status: string;
  platformPosts: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class VideoPostService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async createVideoPost(data: CreateVideoPostPayload): Promise<VideoPost> {
    const [video] = await this.db.insert(videoPosts).values({
      appId: data.appId,
      userId: data.userId,
      fileUrl: data.fileUrl,
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration,
      caption: data.caption,
      platforms: data.platforms,
      status: 'processing',
      platformPosts: {},
    }).returning();

    this.processVideoPost(video.id, data).catch(console.error);

    return video;
  }

  async getVideoPosts(appId: string): Promise<VideoPost[]> {
    return this.db.select().from(videoPosts).where(eq(videoPosts.appId, appId)).orderBy(videoPosts.createdAt);
  }

  async getVideoPost(id: string): Promise<VideoPost | null> {
    const [video] = await this.db.select().from(videoPosts).where(eq(videoPosts.id, id));
    return video || null;
  }

  async deleteVideoPost(id: string): Promise<{ success: boolean }> {
    await this.db.delete(videoPosts).where(eq(videoPosts.id, id));
    return { success: true };
  }

  async updateVideoPostStatus(id: string, status: string, platformPosts?: Record<string, any>): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (platformPosts) {
      updateData.platformPosts = platformPosts;
    }
    await this.db.update(videoPosts).set(updateData).where(eq(videoPosts.id, id));
  }

  private async processVideoPost(videoId: string, data: CreateVideoPostPayload): Promise<void> {
    const platformResults: Record<string, any> = {};

    for (const platform of data.platforms) {
      try {
        const account = await this.db
          .select()
          .from(socialAccounts)
          .where(
            and(
              eq(socialAccounts.appId, data.appId),
              eq(socialAccounts.platform, platform),
            ),
          )
          .then((rows: any[]) => rows[0]);

        if (!account) {
          platformResults[platform] = { status: 'failed', error: 'No connected account' };
          continue;
        }

        const result = await this.postToPlatform(platform, account, data);
        platformResults[platform] = { status: 'posted', postId: result.postId, url: result.url };
      } catch (error: any) {
        platformResults[platform] = { status: 'failed', error: error.message };
      }
    }

    const allSuccessful = Object.values(platformResults).every((r: any) => r.status === 'posted');
    await this.updateVideoPostStatus(videoId, allSuccessful ? 'posted' : 'failed', platformResults);
  }

  private async postToPlatform(platform: string, account: any, data: CreateVideoPostPayload): Promise<{ postId: string; url: string }> {
    switch (platform) {
      case 'instagram':
        return this.postToInstagram(account, data);
      case 'tiktok':
        return this.postToTikTok(account, data);
      case 'twitter':
        return this.postToTwitter(account, data);
      default:
        throw new BadRequestException(`Platform ${platform} not supported`);
    }
  }

  private async postToInstagram(account: any, data: CreateVideoPostPayload): Promise<{ postId: string; url: string }> {
    // Instagram Graph API - Create video container
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${account.platformUserId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify({
          media_type: 'VIDEO',
          video_url: data.fileUrl,
          caption: data.caption || '',
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

  private async postToTikTok(account: any, data: CreateVideoPostPayload): Promise<{ postId: string; url: string }> {
    // TikTok API - Upload video
    const response = await fetch(
      'https://open.tiktokapis.com/v2/video/upload/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: JSON.stringify({
          upload_url: data.fileUrl,
          caption: data.caption || '',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`TikTok API error: ${error}`);
    }

    const result = await response.json();
    return { postId: result.video_id, url: `https://tiktok.com/@${account.username}/video/${result.video_id}` };
  }

  private async postToTwitter(account: any, data: CreateVideoPostPayload): Promise<{ postId: string; url: string }> {
    // Twitter API v2 - Upload media and create tweet
    const mediaResponse = await fetch(
      'https://upload.twitter.com/1.1/media/upload.json',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify({
          media: data.fileUrl,
          media_type: 'video/mp4',
        }),
      }
    );

    if (!mediaResponse.ok) {
      const error = await mediaResponse.text();
      throw new BadRequestException(`Twitter media upload error: ${error}`);
    }

    const media = await mediaResponse.json();

    const tweetResponse = await fetch(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify({
          text: data.caption || '',
          media: { media_ids: [media.media_id_string] },
        }),
      }
    );

    if (!tweetResponse.ok) {
      const error = await tweetResponse.text();
      throw new BadRequestException(`Twitter tweet error: ${error}`);
    }

    const tweet = await tweetResponse.json();
    return { postId: tweet.data.id, url: `https://twitter.com/i/status/${tweet.data.id}` };
  }
}