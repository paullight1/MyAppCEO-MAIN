import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGetAuth, apiPost } from '../lib/apiClient';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export type GenerationJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type GenerationJobType = 'prd' | 'design' | 'build_plan' | 'code' | 'screen_spec';
export type GeneratedArtifactType = 'prd' | 'design' | 'build_plan' | 'screen_spec' | 'code_scaffold' | 'test_plan' | 'deployment_plan';

export interface GenerationJob {
  id: string;
  ownerId: string;
  ideaId?: string | null;
  appId?: string | null;
  jobType: GenerationJobType;
  status: GenerationJobStatus;
  idempotencyKey?: string | null;
  model?: string | null;
  promptVersion?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string | null;
  retryCount?: number;
  costUnits?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedArtifact {
  id: string;
  ownerId: string;
  ideaId?: string | null;
  appId?: string | null;
  jobId?: string | null;
  artifactType: GeneratedArtifactType;
  name: string;
  content: any;
  metadata?: Record<string, unknown>;
  version: number;
  createdAt: string;
}

export interface QualityReport {
  id: string;
  artifactId?: string | null;
  status: string;
  lintStatus: string;
  typecheckStatus: string;
  testStatus: string;
  securityStatus: string;
  accessibilityStatus: string;
  summary?: string | null;
  logs?: any[];
  createdAt: string;
}

export interface ReviewSubmission {
  id: string;
  ideaId?: string | null;
  artifactId?: string | null;
  qualityReportId?: string | null;
  itemType: 'generated_code' | 'app_submission';
  status: string;
  submittedAt: string;
  updatedAt: string;
}

interface GenerationActionResult {
  job?: GenerationJob;
  artifact?: GeneratedArtifact;
  qualityReport?: QualityReport;
}

interface SubmitReviewPayload {
  artifactId?: string;
  qualityReportId?: string;
  itemType?: 'generated_code' | 'app_submission';
}

interface GenerationOptions {
  instructions?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  idempotencyKey?: string;
}

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${key}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return String(value ?? '');
};

const hashKey = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const buildIdempotencyKey = (
  prefix: string,
  parts: Record<string, unknown>,
) => `${prefix}-${hashKey(stableStringify(parts))}`;

export const useGenerationArtifacts = (ideaId?: string) => {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [latestQualityReport, setLatestQualityReport] = useState<QualityReport | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<ReviewSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(
    fn: () => Promise<T>,
    setBusy: (value: boolean) => void,
  ): Promise<T | null> => {
    try {
      setBusy(true);
      setError(null);
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation request failed';
      setError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const loadArtifacts = useCallback(async () => {
    if (!ideaId) return null;

    return run(async () => {
      const response = await apiGetAuth<ApiResponse<GeneratedArtifact[]>>(`/generation/ideas/${ideaId}/artifacts`);
      const nextArtifacts = response.data || [];
      setArtifacts(nextArtifacts);
      return nextArtifacts;
    }, setIsLoading);
  }, [ideaId, run]);

  const createBuildPlan = useCallback((instructionsOrOptions?: string | GenerationOptions) => {
    if (!ideaId) return Promise.resolve(null);
    const options = typeof instructionsOrOptions === 'string'
      ? { instructions: instructionsOrOptions }
      : instructionsOrOptions || {};

    return run(async () => {
      const response = await apiPost<ApiResponse<GenerationActionResult>>(
        `/generation/ideas/${ideaId}/build-plan`,
        {
          idempotencyKey: options.idempotencyKey || buildIdempotencyKey('build-plan', {
            ideaId,
            instructions: options.instructions || '',
            provider: options.provider || 'default',
            model: options.model || 'default',
            promptVersion: options.promptVersion || 'v1',
          }),
          promptVersion: options.promptVersion || 'v1',
          ...options,
        },
      );

      if (response.data?.job) setActiveJob(response.data.job);
      if (response.data?.artifact) setArtifacts((current) => [response.data!.artifact!, ...current]);
      return response.data || null;
    }, setIsMutating);
  }, [ideaId, run]);

  const generateCode = useCallback((instructionsOrOptions?: string | GenerationOptions) => {
    if (!ideaId) return Promise.resolve(null);
    const options = typeof instructionsOrOptions === 'string'
      ? { instructions: instructionsOrOptions }
      : instructionsOrOptions || {};

    return run(async () => {
      const response = await apiPost<ApiResponse<GenerationActionResult>>(
        `/generation/ideas/${ideaId}/code`,
        {
          idempotencyKey: options.idempotencyKey || buildIdempotencyKey('code', {
            ideaId,
            instructions: options.instructions || '',
            provider: options.provider || 'default',
            model: options.model || 'default',
            promptVersion: options.promptVersion || 'v1',
          }),
          promptVersion: options.promptVersion || 'v1',
          ...options,
        },
      );

      if (response.data?.job) setActiveJob(response.data.job);
      if (response.data?.artifact) setArtifacts((current) => [response.data!.artifact!, ...current]);
      if (response.data?.qualityReport) setLatestQualityReport(response.data.qualityReport);
      return response.data || null;
    }, setIsMutating);
  }, [ideaId, run]);

  const generateScreen = useCallback((nodeId: string, options: GenerationOptions = {}) => {
    if (!ideaId) return Promise.resolve(null);

    return run(async () => {
      const response = await apiPost<ApiResponse<GenerationActionResult>>(
        `/generation/ideas/${ideaId}/screens/${nodeId}`,
        {
          idempotencyKey: options.idempotencyKey || buildIdempotencyKey('screen', {
            ideaId,
            nodeId,
            instructions: options.instructions || '',
            provider: options.provider || 'default',
            model: options.model || 'default',
            promptVersion: options.promptVersion || 'v1',
          }),
          promptVersion: options.promptVersion || 'v1',
          ...options,
        },
      );

      if (response.data?.job) setActiveJob(response.data.job);
      if (response.data?.artifact) setArtifacts((current) => [response.data!.artifact!, ...current]);
      return response.data || null;
    }, setIsMutating);
  }, [ideaId, run]);

  const submitForReview = useCallback((payload: SubmitReviewPayload = {}) => {
    if (!ideaId) return Promise.resolve(null);

    return run(async () => {
      const response = await apiPost<ApiResponse<ReviewSubmission>>(
        `/generation/ideas/${ideaId}/submit-review`,
        payload,
      );

      if (response.data) setLatestSubmission(response.data);
      return response.data || null;
    }, setIsMutating);
  }, [ideaId, run]);

  const getJob = useCallback((jobId: string) => (
    run(async () => {
      const response = await apiGetAuth<ApiResponse<GenerationJob>>(`/generation/jobs/${jobId}`);
      if (response.data) setActiveJob(response.data);
      return response.data || null;
    }, setIsLoading)
  ), [run]);

  useEffect(() => {
    if (ideaId) {
      void loadArtifacts();
    }
  }, [ideaId, loadArtifacts]);

  const latestBuildPlan = useMemo(
    () => artifacts.find((artifact) => artifact.artifactType === 'build_plan') || null,
    [artifacts],
  );

  const latestCodeArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.artifactType === 'code_scaffold') || null,
    [artifacts],
  );

  return {
    artifacts,
    latestBuildPlan,
    latestCodeArtifact,
    activeJob,
    latestQualityReport,
    latestSubmission,
    isLoading,
    isMutating,
    error,
    loadArtifacts,
    createBuildPlan,
    generateCode,
    generateScreen,
    submitForReview,
    getJob,
    buildIdempotencyKey,
  };
};

export default useGenerationArtifacts;
