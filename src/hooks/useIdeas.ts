import { apiGet, apiGetAuth, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';
import { supabase } from '../lib/supabaseClient';
import {
  IDEA_STATUS,
  IDEA_TABLE,
  IdeaStatus,
  assertIdeaStatusTransition,
  normalizeIdeaPayload,
  validateIdeaInput,
} from '../utils/ideaLifecycle';

export interface Feature {
  name: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
}

export interface Idea {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  platform: string;
  targetAudience?: string;
  features?: Feature[];
  status: string;
  prdDocument?: any;
  designMockups?: DesignMockup[];
  prototypeUrl?: string;
  costEstimate?: number;
  costBreakdown?: any;
  timelineWeeks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignMockup {
  id: string;
  ideaId: string;
  screenName: string;
  screenType: 'phone' | 'tablet' | 'web';
  imageUrl: string;
  thumbnailUrl?: string;
  figmaUrl?: string;
  orderIndex: number;
  annotations?: any[];
  createdAt: string;
}

export interface PRDDocument {
  executiveSummary: string;
  problemStatement: string;
  proposedSolution: string;
  targetAudience: {
    primary: string[];
    secondary: string[];
  };
  marketAnalysis: {
    targetMarket: string;
    marketSize: string;
    competitors: any[];
  };
  features: any[];
  userStories: any[];
  technicalRequirements: string[];
  milestones: any[];
  risks: any[];
}

export interface CostEstimate {
  totalEstimate: number;
  currency: string;
  timelineWeeks: number;
  breakdown: {
    category: string;
    hours: number;
    rate: number;
    subtotal: number;
  }[];
  assumptions: string[];
  risks: string[];
}

const isBackendUnavailable = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('Backend API is not available') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('ERR_CONNECTION') ||
    message.includes('ERR_FAILED')
  );
};

const generateSlug = (title: string) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'idea'}-${suffix}`;
};

const mapIdeaRow = (row: any): Idea => ({
  id: row.id,
  ownerId: row.ownerId || row.owner_id,
  title: row.title,
  slug: row.slug,
  description: row.description,
  category: row.category,
  platform: row.platform,
  targetAudience: row.targetAudience || row.target_audience,
  features: row.features || [],
  status: row.status,
  prdDocument: row.prdDocument || row.prd_document,
  designMockups: row.designMockups || row.design_mockups || [],
  prototypeUrl: row.prototypeUrl || row.prototype_url,
  costEstimate: typeof row.cost_estimate === 'number' ? row.cost_estimate : row.costEstimate || row.cost_estimate?.totalEstimate,
  costBreakdown: row.costBreakdown || row.cost_breakdown,
  timelineWeeks: row.timelineWeeks || row.timeline_weeks,
  createdAt: row.createdAt || row.created_at,
  updatedAt: row.updatedAt || row.updated_at,
});

export const useIdeas = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const createIdea = (formData: {
    title: string;
    description: string;
    category?: string;
    platform?: string;
    targetAudience?: string;
    features?: Feature[];
  }) =>
    run(async () => {
      const validation = validateIdeaInput(formData);
      if (!validation.valid) {
        throw new Error(Object.values(validation.errors)[0] || 'Please check the idea details.');
      }

      const payload = normalizeIdeaPayload(formData);

      try {
        return await apiPost<{ success: boolean; data: Idea }>('/ideas', payload);
      } catch (err) {
        if (!isBackendUnavailable(err)) throw err;

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw new Error('Please sign in again before creating an idea.');
        }

        const { data, error: insertError } = await supabase
          .from(IDEA_TABLE)
          .insert({
            owner_id: userData.user.id,
            title: payload.title,
            slug: generateSlug(payload.title),
            description: payload.description,
            category: payload.category,
            platform: payload.platform,
            target_audience: payload.targetAudience || null,
            features: payload.features,
            status: IDEA_STATUS.DRAFT,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message || 'Failed to create idea.');
        }

        return { success: true, data: mapIdeaRow(data) };
      }
    });

  const getIdeas = (filters: Record<string, string> = {}) =>
    run(() => {
      const qs = new URLSearchParams(filters).toString();
      return apiGet<{ success: boolean; data: Idea[] }>(`/ideas${qs ? `?${qs}` : ''}`);
    });

  const getMyIdeas = () =>
    run(async () => {
      try {
        return await apiGetAuth<{ success: boolean; data: Idea[] }>('/ideas/me');
      } catch (err) {
        if (!isBackendUnavailable(err)) throw err;

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw new Error('Please sign in again to view your ideas.');
        }

        const { data, error: fetchError } = await supabase
          .from(IDEA_TABLE)
          .select('*')
          .eq('owner_id', userData.user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to load ideas.');
        }

        return { success: true, data: (data || []).map(mapIdeaRow) };
      }
    });

  const getIdeaById = (id: string) =>
    run(async () => {
      try {
        return await apiGetAuth<{ success: boolean; data: Idea }>(`/ideas/${id}`);
      } catch (err) {
        if (!isBackendUnavailable(err)) throw err;

        const { data: userData } = await supabase.auth.getUser();

        let query = supabase
          .from(IDEA_TABLE)
          .select('*')
          .eq('id', id);

        if (userData.user) {
          query = query.or(`owner_id.eq.${userData.user.id},status.in.(${IDEA_STATUS.READY_FOR_FUNDING},${IDEA_STATUS.SUBMITTED_FOR_FUNDING})`);
        } else {
          query = query.in('status', [IDEA_STATUS.READY_FOR_FUNDING, IDEA_STATUS.SUBMITTED_FOR_FUNDING]);
        }

        const { data, error: fetchError } = await query.single();

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to load idea.');
        }

        return { success: true, data: mapIdeaRow(data) };
      }
    });

  const updateIdea = (id: string, formData: Partial<Idea>) =>
    run(async () => {
      if (formData.status) {
        const current = await getIdeaById(id);
        const currentIdea = current.success && current.data ? ((current.data as any).data || current.data) as Idea : null;
        if (currentIdea) assertIdeaStatusTransition(currentIdea.status, formData.status as IdeaStatus);
      }

      try {
        return await apiPatch<{ success: boolean; data: Idea }>(`/ideas/${id}`, formData);
      } catch (err) {
        if (!isBackendUnavailable(err)) throw err;

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw new Error('Please sign in again before updating this idea.');
        }

        const updatePayload: Record<string, unknown> = {};
        if (formData.title !== undefined) updatePayload.title = formData.title.trim();
        if (formData.description !== undefined) updatePayload.description = formData.description.trim();
        if (formData.category !== undefined) updatePayload.category = formData.category;
        if (formData.platform !== undefined) updatePayload.platform = formData.platform;
        if (formData.targetAudience !== undefined) updatePayload.target_audience = formData.targetAudience;
        if (formData.features !== undefined) updatePayload.features = formData.features;
        if (formData.status !== undefined) updatePayload.status = formData.status;

        const { data, error: updateError } = await supabase
          .from(IDEA_TABLE)
          .update(updatePayload)
          .eq('id', id)
          .eq('owner_id', userData.user.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update idea.');
        }

        return { success: true, data: mapIdeaRow(data) };
      }
    });

  const deleteIdea = (id: string) =>
    run(async () => {
      try {
        return await apiDelete<{ success: boolean; message: string }>(`/ideas/${id}`);
      } catch (err) {
        if (!isBackendUnavailable(err)) throw err;

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw new Error('Please sign in again before deleting this idea.');
        }

        const { error: deleteError } = await supabase
          .from(IDEA_TABLE)
          .delete()
          .eq('id', id)
          .eq('owner_id', userData.user.id);

        if (deleteError) {
          throw new Error(deleteError.message || 'Failed to delete idea.');
        }

        return { success: true, message: 'Idea deleted.' };
      }
    });

  const archiveIdea = (id: string) =>
    updateIdea(id, { status: IDEA_STATUS.ARCHIVED });

  const generatePRD = (id: string, options?: {
    additionalContext?: string;
    includeTechnicalSpecs?: boolean;
    targetTimelineWeeks?: number;
  }) =>
    run(() => apiPost<{ success: boolean; prd: PRDDocument; version: number }>(`/ideas/${id}/generate-prd`, options || {}));

  const getPRD = (id: string) =>
    run(() => apiGetAuth<{ success: boolean; prd: PRDDocument; currentVersion: number; versions: any[] }>(`/ideas/${id}/prd`));

  const generateDesigns = (id: string, options?: {
    style?: string;
    primaryColor?: string;
    deviceTypes?: string[];
    screens?: string[];
  }) =>
    run(() => apiPost<{ success: boolean; mockups: DesignMockup[] }>(`/ideas/${id}/generate-designs`, options || {}));

  const getDesigns = (id: string) =>
    run(() => apiGetAuth<{ success: boolean; mockups: DesignMockup[] }>(`/ideas/${id}/designs`));

  const estimateCost = (id: string, options?: {
    timelineWeeks?: number;
    teamLocation?: string;
    includeMaintenance?: boolean;
  }) =>
    run(() => apiPost<{ success: boolean; data: CostEstimate }>(`/ideas/${id}/estimate-cost`, options || {}));

  const convertToApp = (id: string) =>
    run(() =>
      apiPost<{
        success: boolean;
        data: {
          app: { app_id: string; app_name: string; app_status: string; role: string };
          idea: Idea;
          alreadyConverted: boolean;
        };
      }>(`/ideas/${id}/convert-to-app`, {}),
    );

  return {
    createIdea,
    getIdeas,
    getMyIdeas,
    getIdeaById,
    updateIdea,
    deleteIdea,
    archiveIdea,
    generatePRD,
    getPRD,
    generateDesigns,
    getDesigns,
    estimateCost,
    convertToApp,
    isLoading,
    error,
  };
};
