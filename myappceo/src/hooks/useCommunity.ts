import { useState, useCallback } from 'react';
import { apiGet, apiGetAuth, apiPost, apiPatch, apiDelete } from '../lib/apiClient';

export interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  sortOrder: number;
  status: 'active' | 'archived';
  topicCount: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  forumId: string;
  userId: string;
  title: string;
  slug: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  viewCount: number;
  replyCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  forum?: Forum;
  upvotes: number;
  downvotes: number;
  userVote?: 'upvote' | 'downvote' | null;
  isBookmarked?: boolean;
}

export interface Post {
  id: string;
  topicId: string;
  userId: string;
  parentId?: string;
  content: string;
  isAcceptedAnswer: boolean;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  upvotes: number;
  downvotes: number;
  userVote?: 'upvote' | 'downvote' | null;
  replies?: Post[];
}

export interface CommunityUserStats {
  id: string;
  userId: string;
  reputation: number;
  topicsCount: number;
  postsCount: number;
  upvotesReceived: number;
  downvotesReceived: number;
  answersAccepted: number;
  isVerified: boolean;
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TopicFilters {
  forum?: string;
  sort?: 'latest' | 'popular' | 'trending';
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VoteDto {
  targetType: 'topic' | 'post';
  targetId: string;
  voteType: 'upvote' | 'downvote';
}

export interface CreateTopicDto {
  title: string;
  content: string;
  forumSlug: string;
  tags?: string[];
}

export interface CreatePostDto {
  content: string;
  parentId?: string;
}

export const useCommunity = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const getForums = useCallback(async (): Promise<Forum[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<Forum[]>('/community/forums');
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forums');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getForumBySlug = useCallback(async (slug: string): Promise<Forum> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<Forum>(`/community/forums/${slug}`);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forum');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTopics = useCallback(async (filters: TopicFilters = {}): Promise<PaginatedResponse<Topic>> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.forum) params.append('forum', filters.forum);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);

      const queryString = params.toString();
      const data = await apiGet<PaginatedResponse<Topic>>(
        `/community/topics${queryString ? `?${queryString}` : ''}`
      );
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topics');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTrendingTopics = useCallback(async (): Promise<Topic[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<Topic[]>('/community/topics/trending');
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trending topics');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTopicBySlug = useCallback(async (slug: string): Promise<Topic> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<Topic>(`/community/topics/${slug}`);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topic');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTopic = useCallback(async (dto: CreateTopicDto): Promise<Topic> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPost<Topic>('/community/topics', dto);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to create topic');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTopic = useCallback(async (id: string, dto: Partial<CreateTopicDto>): Promise<Topic> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPatch<Topic>(`/community/topics/${id}`, dto);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to update topic');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTopic = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiDelete(`/community/topics/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete topic');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPosts = useCallback(async (topicId: string): Promise<Post[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<Post[]>(`/community/topics/${topicId}/posts`);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPost = useCallback(async (topicId: string, dto: CreatePostDto): Promise<Post> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPost<Post>(`/community/topics/${topicId}/posts`, dto);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (id: string, dto: { content: string }): Promise<Post> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPatch<Post>(`/community/posts/${id}`, dto);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to update post');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiDelete(`/community/posts/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete post');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptAnswer = useCallback(async (postId: string): Promise<Post> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPost<Post>(`/community/posts/${postId}/accept`, {});
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to accept answer');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const vote = useCallback(async (dto: VoteDto): Promise<{ success: boolean; action: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ success: boolean; action: string }>('/community/votes', dto);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to vote');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserStats = useCallback(async (userId: string): Promise<CommunityUserStats> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<CommunityUserStats>(`/community/users/${userId}/stats`);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user stats');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCommunityStars = useCallback(async (): Promise<CommunityUserStats[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<CommunityUserStats[]>('/community/stars');
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch community stars');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bookmarkTopic = useCallback(async (topicId: string): Promise<{ bookmarked: boolean }> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ bookmarked: boolean }>(`/community/topics/${topicId}/bookmark`, {});
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to bookmark topic');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getBookmarks = useCallback(async (): Promise<Topic[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetAuth<Topic[]>('/community/bookmarks');
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookmarks');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    clearError,
    getForums,
    getForumBySlug,
    getTopics,
    getTrendingTopics,
    getTopicBySlug,
    createTopic,
    updateTopic,
    deleteTopic,
    getPosts,
    createPost,
    updatePost,
    deletePost,
    acceptAnswer,
    vote,
    getUserStats,
    getCommunityStars,
    bookmarkTopic,
    getBookmarks,
  };
};