import { ApiResponse } from '../../../packages/types/src';
import { apiPost, apiGetAuth, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface VideoPost {
  id: string;
  appId: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  caption?: string;
  platforms: string[];
  status: 'uploading' | 'processing' | 'posted' | 'failed';
  platformPosts?: Record<string, { postId?: string; url?: string; status: string; error?: string }>;
  createdAt: string;
}

export interface UploadVideoPayload {
  appId: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  caption: string;
  platforms: string[];
}

export const VIDEO_UPLOAD_LIMITS = {
  maxSizeBytes: 500 * 1024 * 1024,
  maxDurationSeconds: 10 * 60,
  maxCaptionLength: 2200,
  acceptedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
};

export const validateVideoUpload = (payload: UploadVideoPayload): string[] => {
  const errors: string[] = [];
  if (!payload.appId) errors.push('Select an app before uploading video.');
  if (!payload.fileUrl) errors.push('Upload a video file first.');
  if (!payload.caption?.trim()) errors.push('Caption is required.');
  if (payload.caption.length > VIDEO_UPLOAD_LIMITS.maxCaptionLength) errors.push(`Caption must be ${VIDEO_UPLOAD_LIMITS.maxCaptionLength} characters or fewer.`);
  if (!payload.platforms.length) errors.push('Choose at least one connected platform.');
  if (payload.duration && payload.duration > VIDEO_UPLOAD_LIMITS.maxDurationSeconds) errors.push('Video duration must be 10 minutes or less.');
  return errors;
};

export const useVideoPost = () => {
  const { run, isLoading, error } = useApiRunner();

  const uploadVideo = (payload: UploadVideoPayload) =>
    run(() => {
      const errors = validateVideoUpload(payload);
      if (errors.length) return Promise.reject(new Error(errors[0]));
      return apiPost<ApiResponse<VideoPost>>('/video/upload', payload);
    });

  const getVideoPosts = (appId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<VideoPost[]>>(`/video/list/${appId}`),
    );

  const deleteVideo = (videoId: string) =>
    run(() =>
      apiDelete<{ success: boolean }>(`/video/${videoId}`),
    );

  return {
    uploadVideo,
    getVideoPosts,
    deleteVideo,
    isLoading,
    error,
  };
};
