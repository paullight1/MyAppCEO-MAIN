export const IDEA_TABLE = 'ideas';

export const IDEA_STATUS = {
  DRAFT: 'draft',
  PRD_GENERATING: 'prd_generating',
  PRD_GENERATED: 'prd_generated',
  DESIGNING: 'designing',
  DESIGN_COMPLETE: 'design_complete',
  ESTIMATING: 'estimating',
  READY_FOR_FUNDING: 'ready_for_funding',
  SUBMITTED_FOR_FUNDING: 'submitted_for_funding',
  ARCHIVED: 'archived',
  CONVERTED_TO_APP: 'converted_to_app',
} as const;

export type IdeaStatus = (typeof IDEA_STATUS)[keyof typeof IDEA_STATUS];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  draft: 'Draft',
  prd_generating: 'Generating PRD',
  prd_generated: 'PRD Ready',
  designing: 'Designing',
  design_complete: 'Designs Ready',
  estimating: 'Estimating',
  ready_for_funding: 'Ready for Funding',
  submitted_for_funding: 'Campaign Active',
  archived: 'Archived',
  converted_to_app: 'Converted to App',
};

/** True while the idea is mid-way through an async AI step (shows a spinner). */
export const IDEA_STATUS_IN_PROGRESS: Record<IdeaStatus, boolean> = {
  draft: false,
  prd_generating: true,
  prd_generated: false,
  designing: true,
  design_complete: false,
  estimating: true,
  ready_for_funding: false,
  submitted_for_funding: false,
  archived: false,
  converted_to_app: false,
};

/**
 * The linear "happy path" a user walks from raw idea to a live app. Each stage
 * groups the granular statuses that belong to it. Drives the PipelineStepper.
 */
export interface PipelineStage {
  key: string;
  label: string;
  /** lucide-react icon name, resolved by the presentation layer */
  icon: string;
  /** statuses that mean "the user is currently on this stage" */
  statuses: IdeaStatus[];
}

export const IDEA_PIPELINE_STAGES: PipelineStage[] = [
  { key: 'idea', label: 'Idea', icon: 'Lightbulb', statuses: [IDEA_STATUS.DRAFT] },
  { key: 'prd', label: 'PRD', icon: 'FileText', statuses: [IDEA_STATUS.PRD_GENERATING, IDEA_STATUS.PRD_GENERATED] },
  { key: 'design', label: 'Design', icon: 'Palette', statuses: [IDEA_STATUS.DESIGNING, IDEA_STATUS.DESIGN_COMPLETE] },
  { key: 'estimate', label: 'Estimate', icon: 'Calculator', statuses: [IDEA_STATUS.ESTIMATING] },
  { key: 'funding', label: 'Funding', icon: 'Rocket', statuses: [IDEA_STATUS.READY_FOR_FUNDING, IDEA_STATUS.SUBMITTED_FOR_FUNDING] },
  { key: 'app', label: 'App', icon: 'Boxes', statuses: [IDEA_STATUS.CONVERTED_TO_APP] },
];

export type PipelineStageState = 'complete' | 'active' | 'upcoming';

/** Ordered index of each status along the happy path, for stage math. */
const IDEA_STATUS_ORDER: Record<IdeaStatus, number> = {
  draft: 0,
  prd_generating: 1,
  prd_generated: 1,
  designing: 2,
  design_complete: 2,
  estimating: 3,
  ready_for_funding: 4,
  submitted_for_funding: 4,
  converted_to_app: 5,
  archived: -1,
};

/**
 * Given the current idea status, return each pipeline stage annotated with
 * whether it is complete, active, or upcoming. `archived` ideas report every
 * stage as upcoming (the walk is paused).
 */
export const getPipelineStageStates = (
  status: string,
): Array<PipelineStage & { state: PipelineStageState; inProgress: boolean }> => {
  const current = (status || IDEA_STATUS.DRAFT) as IdeaStatus;
  const currentOrder = IDEA_STATUS_ORDER[current] ?? -1;
  const inProgress = IDEA_STATUS_IN_PROGRESS[current] ?? false;

  return IDEA_PIPELINE_STAGES.map((stage, index) => {
    let state: PipelineStageState;
    if (currentOrder < 0) {
      state = 'upcoming';
    } else if (index < currentOrder) {
      state = 'complete';
    } else if (index === currentOrder) {
      state = 'active';
    } else {
      state = 'upcoming';
    }
    return { ...stage, state, inProgress: state === 'active' && inProgress };
  });
};

export const IDEA_STATUS_TRANSITIONS: Record<IdeaStatus, IdeaStatus[]> = {
  draft: ['prd_generating', 'prd_generated', 'archived'],
  prd_generating: ['prd_generated', 'draft', 'archived'],
  prd_generated: ['designing', 'design_complete', 'archived'],
  designing: ['design_complete', 'prd_generated', 'archived'],
  design_complete: ['estimating', 'ready_for_funding', 'archived'],
  estimating: ['ready_for_funding', 'design_complete', 'archived'],
  ready_for_funding: ['submitted_for_funding', 'converted_to_app', 'archived'],
  submitted_for_funding: ['converted_to_app', 'archived'],
  archived: ['draft'],
  converted_to_app: ['archived'],
};

const VALID_CATEGORIES = new Set([
  'mobile_app',
  'web_app',
  'saas',
  'marketplace',
  'social',
  'ai_product',
  'game',
  'productivity',
  'other',
]);

const VALID_PLATFORMS = new Set(['mobile', 'web', 'desktop', 'cross_platform']);
const VALID_PRIORITIES = new Set(['must_have', 'should_have', 'nice_to_have']);

export interface IdeaValidationInput {
  title?: string;
  description?: string;
  category?: string;
  platform?: string;
  targetAudience?: string;
  features?: Array<{
    name?: string;
    description?: string;
    priority?: string;
  }>;
}

export interface IdeaValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const validateIdeaInput = (input: IdeaValidationInput): IdeaValidationResult => {
  const errors: Record<string, string> = {};
  const title = input.title?.trim() || '';
  const description = input.description?.trim() || '';
  const targetAudience = input.targetAudience?.trim() || '';
  const features = input.features || [];

  if (title.length < 3) {
    errors.title = 'Use at least 3 characters for the app name.';
  } else if (title.length > 120) {
    errors.title = 'Keep the app name under 120 characters.';
  }

  if (description.length < 20) {
    errors.description = 'Use at least 20 characters for the description.';
  } else if (description.length > 5000) {
    errors.description = 'Keep the description under 5,000 characters.';
  }

  if (input.category && !VALID_CATEGORIES.has(input.category)) {
    errors.category = 'Choose a supported category.';
  }

  if (input.platform && !VALID_PLATFORMS.has(input.platform)) {
    errors.platform = 'Choose a supported platform.';
  }

  if (targetAudience.length > 1000) {
    errors.targetAudience = 'Keep the audience description under 1,000 characters.';
  }

  features.forEach((feature, index) => {
    const prefix = `features.${index}`;
    if (!feature.name?.trim()) {
      errors[`${prefix}.name`] = 'Feature name is required.';
    }
    if (!feature.description?.trim()) {
      errors[`${prefix}.description`] = 'Feature description is required.';
    }
    if (feature.priority && !VALID_PRIORITIES.has(feature.priority)) {
      errors[`${prefix}.priority`] = 'Choose a supported feature priority.';
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
};

export const canTransitionIdeaStatus = (from: string, to: IdeaStatus) => {
  const current = (from || IDEA_STATUS.DRAFT) as IdeaStatus;
  return IDEA_STATUS_TRANSITIONS[current]?.includes(to) || false;
};

export const assertIdeaStatusTransition = (from: string, to: IdeaStatus) => {
  if (!canTransitionIdeaStatus(from, to)) {
    const currentLabel = IDEA_STATUS_LABELS[(from || IDEA_STATUS.DRAFT) as IdeaStatus] || from || 'Unknown';
    const nextLabel = IDEA_STATUS_LABELS[to] || to;
    throw new Error(`Cannot move idea from ${currentLabel} to ${nextLabel}.`);
  }
};

export const normalizeIdeaPayload = (input: IdeaValidationInput) => ({
  title: input.title?.trim() || '',
  description: input.description?.trim() || '',
  category: input.category || 'other',
  platform: input.platform || 'mobile',
  targetAudience: input.targetAudience?.trim() || undefined,
  features: (input.features || []).map((feature) => ({
    name: feature.name?.trim() || '',
    description: feature.description?.trim() || '',
    priority: (feature.priority || 'must_have') as 'must_have' | 'should_have' | 'nice_to_have',
  })),
});

export const isPotentialDuplicateIdea = (
  candidate: Pick<IdeaValidationInput, 'title' | 'description'>,
  existing: Array<Pick<IdeaValidationInput, 'title' | 'description'>>,
) => {
  const title = candidate.title?.trim().toLowerCase();
  const description = candidate.description?.trim().toLowerCase();

  if (!title) return false;

  return existing.some((idea) => {
    const existingTitle = idea.title?.trim().toLowerCase();
    const existingDescription = idea.description?.trim().toLowerCase();
    return existingTitle === title || (!!description && existingDescription === description);
  });
};
