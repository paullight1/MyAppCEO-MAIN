import { useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiPost, apiGetAuth, apiPatch, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface ScheduledPost {
  id: string;
  appId: string;
  content: string;
  mediaUrls: string[] | null;
  platforms: string[];
  scheduledAt: string;
  timezone: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  failureReason?: string | null;
  publishedAt: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdAt: string;
}

export interface CreateScheduledPostPayload {
  appId: string;
  content: string;
  mediaUrls?: string[];
  platforms: string[];
  scheduledAt: string;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export const PLATFORM_POST_LIMITS: Record<string, { maxContentLength: number; maxMediaItems: number; mediaRequired?: boolean }> = {
  instagram: { maxContentLength: 2200, maxMediaItems: 10 },
  tiktok: { maxContentLength: 2200, maxMediaItems: 1, mediaRequired: true },
  twitter: { maxContentLength: 280, maxMediaItems: 4 },
  facebook: { maxContentLength: 63206, maxMediaItems: 10 },
  youtube: { maxContentLength: 5000, maxMediaItems: 1, mediaRequired: true },
};

export const validateScheduledPost = (payload: CreateScheduledPostPayload): string[] => {
  const errors: string[] = [];
  if (!payload.appId) errors.push('Select an app before scheduling.');
  if (!payload.content?.trim()) errors.push('Post content is required.');
  if (!payload.platforms.length) errors.push('Choose at least one connected platform.');
  if (!payload.scheduledAt || new Date(payload.scheduledAt) <= new Date()) errors.push('Scheduled time must be in the future.');
  if (payload.isRecurring && !payload.recurrenceRule) errors.push('Choose a recurrence interval.');

  const mediaCount = payload.mediaUrls?.length || 0;
  payload.platforms.forEach(platform => {
    const limits = PLATFORM_POST_LIMITS[platform];
    if (!limits) return;
    if (payload.content.length > limits.maxContentLength) {
      errors.push(`${platform} posts must be ${limits.maxContentLength} characters or fewer.`);
    }
    if (mediaCount > limits.maxMediaItems) {
      errors.push(`${platform} supports up to ${limits.maxMediaItems} media item${limits.maxMediaItems === 1 ? '' : 's'}.`);
    }
    if (limits.mediaRequired && mediaCount === 0) {
      errors.push(`${platform} requires a media attachment.`);
    }
  });

  return errors;
};

export const useScheduler = () => {
  const { run, isLoading, error } = useApiRunner();

  const createScheduledPost = useCallback((payload: CreateScheduledPostPayload) =>
    run(() => {
      const errors = validateScheduledPost(payload);
      if (errors.length) return Promise.reject(new Error(errors[0]));
      return apiPost<ApiResponse<ScheduledPost>>('/schedule/posts', payload);
    }), [run]);

  const getScheduledPosts = useCallback((appId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<ScheduledPost[]>>(`/schedule/posts/${appId}`),
    ), [run]);

  const getCalendarData = useCallback((appId: string, startDate: string, endDate: string) =>
    run(() =>
      apiGetAuth<ApiResponse<ScheduledPost[]>>(`/schedule/calendar/${appId}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
    ), [run]);

  const updateScheduledPost = useCallback((id: string, data: Partial<CreateScheduledPostPayload>) =>
    run(() =>
      apiPatch<ApiResponse<ScheduledPost>>(`/schedule/posts/${id}`, data),
    ), [run]);

  const cancelScheduledPost = useCallback((id: string) =>
    run(() =>
      apiDelete<{ success: boolean }>(`/schedule/posts/${id}`),
    ), [run]);

  const retryFailedPost = useCallback((id: string) =>
    run(() =>
      apiPost<{ success: boolean }>(`/schedule/posts/${id}/retry`, {}),
    ), [run]);

  const publishNow = useCallback((id: string) =>
    run(() =>
      apiPost<{ success: boolean }>(`/schedule/posts/${id}/publish-now`, {}),
    ), [run]);

  return {
    createScheduledPost,
    getScheduledPosts,
    getCalendarData,
    updateScheduledPost,
    cancelScheduledPost,
    publishNow,
    retryFailedPost,
    isLoading,
    error,
  };
};
