import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { 
  communityForums, 
  communityTopics, 
  communityPosts, 
  communityVotes, 
  communityUserStats,
  communityBookmarks,
  users 
} from '../../database/schema';
import { eq, and, desc, asc, sql, like, or, gt } from 'drizzle-orm';
import { 
  CreateTopicDto, 
  UpdateTopicDto, 
  CreatePostDto, 
  UpdatePostDto, 
  VoteDto, 
  TopicFilterDto,
  PaginatedResponseDto 
} from './dto/community.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + uuidv4().slice(0, 8);
  }

  async getForums() {
    const forums = await this.db
      .select()
      .from(communityForums)
      .where(eq(communityForums.status, 'active'))
      .orderBy(asc(communityForums.sortOrder));

    const forumsWithCounts = await Promise.all(
      forums.map(async (forum: any) => {
        const [topicCount, postCount] = await Promise.all([
          this.db.select({ count: sql<number>`count(*)` })
            .from(communityTopics)
            .where(eq(communityTopics.forumId, forum.id)),
          this.db.select({ count: sql<number>`count(*)` })
            .from(communityPosts)
            .innerJoin(communityTopics, eq(communityTopics.forumId, forum.id)),
        ]);
        
        return {
          ...forum,
          topicCount: topicCount[0]?.count || 0,
          postCount: postCount[0]?.count || 0,
        };
      })
    );

    return forumsWithCounts;
  }

  async getForumBySlug(slug: string) {
    const [forum] = await this.db
      .select()
      .from(communityForums)
      .where(and(
        eq(communityForums.slug, slug),
        eq(communityForums.status, 'active')
      ));

    if (!forum) {
      throw new NotFoundException(`Forum with slug ${slug} not found`);
    }

    const [topicCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(communityTopics)
      .where(eq(communityTopics.forumId, forum.id));

    return { ...forum, topicCount: topicCount?.count || 0 };
  }

  async getTopics(filters: TopicFilterDto, userId?: string): Promise<PaginatedResponseDto<any>> {
    const { forum, sort = 'latest', page = 1, limit = 20, search } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (forum) {
      const [forumData] = await this.db
        .select()
        .from(communityForums)
        .where(eq(communityForums.slug, forum));
      
      if (forumData) {
        conditions.push(eq(communityTopics.forumId, forumData.id));
      }
    }

    if (search) {
      conditions.push(
        or(
          like(communityTopics.title, `%${search}%`),
          like(communityTopics.content, `%${search}%`)
        )
      );
    }

    let orderBy;
    switch (sort) {
      case 'popular':
        orderBy = desc(communityTopics.viewCount);
        break;
      case 'trending':
        orderBy = desc(sql`(${communityTopics.viewCount} + ${communityTopics.replyCount} * 2)`);
        break;
      default:
        orderBy = desc(communityTopics.isPinned);
    }

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(communityTopics)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const topics = await this.db
      .select({
        id: communityTopics.id,
        title: communityTopics.title,
        slug: communityTopics.slug,
        content: communityTopics.content,
        viewCount: communityTopics.viewCount,
        replyCount: communityTopics.replyCount,
        isPinned: communityTopics.isPinned,
        isSolved: communityTopics.isSolved,
        tags: communityTopics.tags,
        createdAt: communityTopics.createdAt,
        forumId: communityTopics.forumId,
        userId: communityTopics.userId,
      })
      .from(communityTopics)
      .leftJoin(users, eq(communityTopics.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy, desc(communityTopics.createdAt))
      .limit(limit)
      .offset(offset);

    const topicsWithVotes = await Promise.all(
      topics.map(async (topic: any) => {
        const [voteCount] = await this.db
          .select({ 
            upvotes: sql<number>`count(*) filter (where vote_type = 'upvote')`,
            downvotes: sql<number>`count(*) filter (where vote_type = 'downvote')`
          })
          .from(communityVotes)
          .where(eq(communityVotes.targetId, topic.id));

        let userVote = null;
        if (userId) {
          const [vote] = await this.db
            .select()
            .from(communityVotes)
            .where(and(
              eq(communityVotes.userId, userId),
              eq(communityVotes.targetId, topic.id),
              eq(communityVotes.targetType, 'topic')
            ));
          userVote = vote?.voteType || null;
        }

        return {
          ...topic,
          author: topic.userId ? {
            id: topic.userId,
            fullName: (users as any).fullName,
            avatarUrl: (users as any).avatarUrl,
          } : null,
          upvotes: voteCount?.upvotes || 0,
          downvotes: voteCount?.downvotes || 0,
          userVote,
        };
      })
    );

    return {
      data: topicsWithVotes,
      total: countResult?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    };
  }

  async getTopicBySlug(slug: string, userId?: string) {
    const [topic] = await this.db
      .select()
      .from(communityTopics)
      .where(eq(communityTopics.slug, slug));

    if (!topic) {
      throw new NotFoundException(`Topic with slug ${slug} not found`);
    }

    await this.db
      .update(communityTopics)
      .set({ viewCount: sql`${communityTopics.viewCount} + 1` })
      .where(eq(communityTopics.id, topic.id));

    const [author] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, topic.userId));

    const [forum] = await this.db
      .select()
      .from(communityForums)
      .where(eq(communityForums.id, topic.forumId));

    const [voteCount] = await this.db
      .select({ 
        upvotes: sql<number>`count(*) filter (where vote_type = 'upvote')`,
        downvotes: sql<number>`count(*) filter (where vote_type = 'downvote')`
      })
      .from(communityVotes)
      .where(and(
        eq(communityVotes.targetId, topic.id),
        eq(communityVotes.targetType, 'topic')
      ));

    let userVote = null;
    if (userId) {
      const [vote] = await this.db
        .select()
        .from(communityVotes)
        .where(and(
          eq(communityVotes.userId, userId),
          eq(communityVotes.targetId, topic.id),
          eq(communityVotes.targetType, 'topic')
        ));
      userVote = vote?.voteType || null;
    }

    let isBookmarked = false;
    if (userId) {
      const [bookmark] = await this.db
        .select()
        .from(communityBookmarks)
        .where(and(
          eq(communityBookmarks.userId, userId),
          eq(communityBookmarks.topicId, topic.id)
        ));
      isBookmarked = !!bookmark;
    }

    return {
      ...topic,
      author,
      forum,
      upvotes: voteCount?.upvotes || 0,
      downvotes: voteCount?.downvotes || 0,
      userVote,
      isBookmarked,
    };
  }

  async createTopic(dto: CreateTopicDto, userId: string) {
    const [forum] = await this.db
      .select()
      .from(communityForums)
      .where(eq(communityForums.slug, dto.forumSlug));

    if (!forum) {
      throw new NotFoundException(`Forum with slug ${dto.forumSlug} not found`);
    }

    const slug = this.generateSlug(dto.title);

    const [topic] = await this.db.insert(communityTopics).values({
      forumId: forum.id,
      userId,
      title: dto.title,
      content: dto.content,
      slug,
      tags: dto.tags || [],
    }).returning();

    await this.upsertUserStats(userId);

    await this.db
      .update(communityUserStats)
      .set({ 
        topicsCount: sql`${communityUserStats.topicsCount} + 1`,
        reputation: sql`${communityUserStats.reputation} + 5`,
      })
      .where(eq(communityUserStats.userId, userId));

    return this.getTopicBySlug(slug, userId);
  }

  async updateTopic(id: string, dto: UpdateTopicDto, userId: string) {
    const [topic] = await this.db
      .select()
      .from(communityTopics)
      .where(eq(communityTopics.id, id));

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    if (topic.userId !== userId) {
      throw new ForbiddenException('You can only edit your own topics');
    }

    const [updated] = await this.db
      .update(communityTopics)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(communityTopics.id, id))
      .returning();

    return this.getTopicBySlug(updated.slug, userId);
  }

  async deleteTopic(id: string, userId: string) {
    const [topic] = await this.db
      .select()
      .from(communityTopics)
      .where(eq(communityTopics.id, id));

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    if (topic.userId !== userId) {
      throw new ForbiddenException('You can only delete your own topics');
    }

    await this.db.delete(communityTopics).where(eq(communityTopics.id, id));

    await this.db
      .update(communityUserStats)
      .set({ 
        topicsCount: sql`${communityUserStats.topicsCount} - 1`,
      })
      .where(eq(communityUserStats.userId, userId));

    return { success: true };
  }

  async getPosts(topicId: string, userId?: string) {
    const [topic] = await this.db
      .select()
      .from(communityTopics)
      .where(eq(communityTopics.id, topicId));

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    const posts = await this.db
      .select({
        id: communityPosts.id,
        content: communityPosts.content,
        isAcceptedAnswer: communityPosts.isAcceptedAnswer,
        voteCount: communityPosts.voteCount,
        parentId: communityPosts.parentId,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        userId: communityPosts.userId,
        topicId: communityPosts.topicId,
      })
      .from(communityPosts)
      .where(eq(communityPosts.topicId, topicId))
      .orderBy(asc(communityPosts.isAcceptedAnswer), desc(communityPosts.voteCount), asc(communityPosts.createdAt));

    const postsWithAuthors = await Promise.all(
      posts.map(async (post: any) => {
        const [author] = await this.db
          .select({
            id: users.id,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, post.userId));

        const [voteCount] = await this.db
          .select({ 
            upvotes: sql<number>`count(*) filter (where vote_type = 'upvote')`,
            downvotes: sql<number>`count(*) filter (where vote_type = 'downvote')`
          })
          .from(communityVotes)
          .where(and(
            eq(communityVotes.targetId, post.id),
            eq(communityVotes.targetType, 'post')
          ));

        let userVote = null;
        if (userId) {
          const [vote] = await this.db
            .select()
            .from(communityVotes)
            .where(and(
              eq(communityVotes.userId, userId),
              eq(communityVotes.targetId, post.id),
              eq(communityVotes.targetType, 'post')
            ));
          userVote = vote?.voteType || null;
        }

        return {
          ...post,
          author,
          upvotes: voteCount?.upvotes || 0,
          downvotes: voteCount?.downvotes || 0,
          userVote,
        };
      })
    );

    return postsWithAuthors;
  }

  async createPost(topicId: string, dto: CreatePostDto, userId: string) {
    const [topic] = await this.db
      .select()
      .from(communityTopics)
      .where(eq(communityTopics.id, topicId));

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.isLocked) {
      throw new ForbiddenException('This topic is locked');
    }

    const [post] = await this.db.insert(communityPosts).values({
      topicId,
      userId,
      parentId: dto.parentId || null,
      content: dto.content,
    }).returning();

    await this.upsertUserStats(userId);

    await this.db
      .update(communityUserStats)
      .set({ 
        postsCount: sql`${communityUserStats.postsCount} + 1`,
        reputation: sql`${communityUserStats.reputation} + 2`,
      })
      .where(eq(communityUserStats.userId, userId));

    const [author] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId));

    return { ...post, author, upvotes: 0, downvotes: 0, userVote: null };
  }

  async updatePost(id: string, dto: UpdatePostDto, userId: string) {
    const [post] = await this.db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, id));

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const [updated] = await this.db
      .update(communityPosts)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(communityPosts.id, id))
      .returning();

    return updated;
  }

  async deletePost(id: string, userId: string) {
    const [post] = await this.db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, id));

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.db.delete(communityPosts).where(eq(communityPosts.id, id));

    await this.db
      .update(communityUserStats)
      .set({ 
        postsCount: sql`${communityUserStats.postsCount} - 1`,
      })
      .where(eq(communityUserStats.userId, userId));

    return { success: true };
  }

  async acceptAnswer(postId: string, userId: string) {
    const [post] = await this.db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const [topic] = await this.db
      .select()
      .from(communityTopics)
      .where(eq(communityTopics.id, post.topicId));

    if (topic.userId !== userId) {
      throw new ForbiddenException('Only the topic author can accept an answer');
    }

    await this.db
      .update(communityPosts)
      .set({ isAcceptedAnswer: false })
      .where(and(
        eq(communityPosts.topicId, post.topicId),
        eq(communityPosts.isAcceptedAnswer, true)
      ));

    const [updated] = await this.db
      .update(communityPosts)
      .set({ isAcceptedAnswer: true })
      .where(eq(communityPosts.id, postId))
      .returning();

    await this.db
      .update(communityTopics)
      .set({ isSolved: true })
      .where(eq(communityTopics.id, post.topicId));

    await this.db
      .update(communityUserStats)
      .set({ 
        answersAccepted: sql`${communityUserStats.answersAccepted} + 1`,
        reputation: sql`${communityUserStats.reputation} + 25`,
      })
      .where(eq(communityUserStats.userId, post.userId));

    return updated;
  }

  async vote(dto: VoteDto, userId: string) {
    const existingVote = await this.db
      .select()
      .from(communityVotes)
      .where(and(
        eq(communityVotes.userId, userId),
        eq(communityVotes.targetId, dto.targetId),
        eq(communityVotes.targetType, dto.targetType)
      ));

    if (existingVote.length > 0) {
      if (existingVote[0].voteType === dto.voteType) {
        await this.db
          .delete(communityVotes)
          .where(eq(communityVotes.id, existingVote[0].id));

        await this.updateVoteCount(dto.targetType, dto.targetId, dto.voteType, 'remove');
        
        return { success: true, action: 'removed' };
      }

      await this.db
        .update(communityVotes)
        .set({ voteType: dto.voteType })
        .where(eq(communityVotes.id, existingVote[0].id));

      await this.updateVoteCount(dto.targetType, dto.targetId, dto.voteType, 'change');
      
      return { success: true, action: 'changed' };
    }

    await this.db.insert(communityVotes).values({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      voteType: dto.voteType,
    });

    await this.updateVoteCount(dto.targetType, dto.targetId, dto.voteType, 'add');
    await this.updateUserReputation(dto.targetType, dto.targetId, dto.voteType);

    return { success: true, action: 'added' };
  }

  private async updateVoteCount(targetType: string, targetId: string, voteType: string, action: 'add' | 'remove' | 'change') {
    const table = targetType === 'topic' ? communityTopics : communityPosts;
    const voteCountColumn = targetType === 'topic' 
      ? sql`${table}.viewCount`
      : communityPosts.voteCount;

    let updateValue;
    if (action === 'add') {
      updateValue = voteType === 'upvote' 
        ? sql`${voteCountColumn} + 1`
        : sql`${voteCountColumn} - 1`;
    } else if (action === 'remove') {
      updateValue = voteType === 'upvote'
        ? sql`${voteCountColumn} - 1`
        : sql`${voteCountColumn} + 1`;
    } else {
      updateValue = voteType === 'upvote'
        ? sql`${voteCountColumn} + 2`
        : sql`${voteCountColumn} - 2`;
    }

    await this.db
      .update(table)
      .set({ viewCount: updateValue } as any)
      .where(eq(table.id as any, targetId));
  }

  private async updateUserReputation(targetType: string, targetId: string, voteType: string) {
    let targetUserId: string;
    
    if (targetType === 'topic') {
      const [topic] = await this.db
        .select()
        .from(communityTopics)
        .where(eq(communityTopics.id, targetId));
      targetUserId = topic?.userId;
    } else {
      const [post] = await this.db
        .select()
        .from(communityPosts)
        .where(eq(communityPosts.id, targetId));
      targetUserId = post?.userId;
    }

    if (!targetUserId) return;

    const repChange = voteType === 'upvote' ? 10 : -2;

    await this.db
      .update(communityUserStats)
      .set({ 
        upvotesReceived: voteType === 'upvote' 
          ? sql`${communityUserStats.upvotesReceived} + 1`
          : communityUserStats.upvotesReceived,
        downvotesReceived: voteType === 'downvote'
          ? sql`${communityUserStats.downvotesReceived} + 1`
          : communityUserStats.downvotesReceived,
        reputation: sql`${communityUserStats.reputation} + ${repChange}`,
      })
      .where(eq(communityUserStats.userId, targetUserId));
  }

  async getUserStats(userId: string) {
    let stats = await this.db
      .select()
      .from(communityUserStats)
      .where(eq(communityUserStats.userId, userId));

    if (stats.length === 0) {
      await this.upsertUserStats(userId);
      stats = await this.db
        .select()
        .from(communityUserStats)
        .where(eq(communityUserStats.userId, userId));
    }

    const [user] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    return {
      ...stats[0],
      user,
    };
  }

  async getCommunityStars() {
    const stars = await this.db
      .select()
      .from(communityUserStats)
      .orderBy(desc(communityUserStats.reputation))
      .limit(10);

    const starsWithUsers = await Promise.all(
      stars.map(async (stat: any) => {
        const [user] = await this.db
          .select({
            id: users.id,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, stat.userId));

        return { ...stat, user };
      })
    );

    return starsWithUsers;
  }

  async bookmarkTopic(topicId: string, userId: string) {
    const existing = await this.db
      .select()
      .from(communityBookmarks)
      .where(and(
        eq(communityBookmarks.userId, userId),
        eq(communityBookmarks.topicId, topicId)
      ));

    if (existing.length > 0) {
      await this.db
        .delete(communityBookmarks)
        .where(eq(communityBookmarks.id, existing[0].id));
      return { bookmarked: false };
    }

    await this.db.insert(communityBookmarks).values({
      userId,
      topicId,
    });

    return { bookmarked: true };
  }

  async getBookmarks(userId: string) {
    const bookmarks = await this.db
      .select({
        id: communityBookmarks.id,
        topicId: communityBookmarks.topicId,
        createdAt: communityBookmarks.createdAt,
      })
      .from(communityBookmarks)
      .where(eq(communityBookmarks.userId, userId))
      .orderBy(desc(communityBookmarks.createdAt));

    const topics = await Promise.all(
      bookmarks.map(async (bookmark: any) => {
        const [topic] = await this.db
          .select()
          .from(communityTopics)
          .where(eq(communityTopics.id, bookmark.topicId));
        return topic;
      })
    );

    return topics.filter(Boolean);
  }

  async getTrendingTopics() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const topics = await this.db
      .select()
      .from(communityTopics)
      .where(gt(communityTopics.createdAt, oneDayAgo))
      .orderBy(desc(sql`(${communityTopics.viewCount} + ${communityTopics.replyCount} * 2)`))
      .limit(5);

    return topics;
  }

  private async upsertUserStats(userId: string) {
    const existing = await this.db
      .select()
      .from(communityUserStats)
      .where(eq(communityUserStats.userId, userId));

    if (existing.length === 0) {
      await this.db.insert(communityUserStats).values({
        userId,
      });
    }
  }
}
