import { apiGetAuth, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface DevelopmentPhase {
  id: string;
  appId: string;
  phaseNumber: number;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  estimatedEndDate: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  completionPct: number;
  notes: string | null;
  milestones?: DevelopmentMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentMilestone {
  id: string;
  phaseId: string;
  appId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'overdue' | 'cancelled';
  requiresOwnerApproval: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  orderIndex: number;
  tasks?: DevelopmentTask[];
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentTask {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
  assignedTo: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  orderIndex: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressUpdate {
  id: string;
  appId: string;
  phaseId: string | null;
  milestoneId: string | null;
  title: string;
  content: string;
  attachments: any[];
  visibility: 'owner_only' | 'investors' | 'public';
  authorId: string;
  author?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentRecord {
  id: string;
  appId: string;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  storeUrl: string | null;
  downloadUrl: string | null;
  version: string;
  buildNumber: number;
  status: 'preparing' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'live';
  submittedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  liveAt: string | null;
  notes: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  appId: string;
  userId: string;
  role: 'lead_developer' | 'developer' | 'designer' | 'project_manager' | 'qa_engineer' | 'devops';
  canUpdateProgress: boolean;
  canPostUpdates: boolean;
  canManageTasks: boolean;
  status: 'active' | 'inactive' | 'removed';
  user?: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  addedAt: string;
  removedAt: string | null;
}

export interface AppProgress {
  phases: DevelopmentPhase[];
  deployments: DeploymentRecord[];
  team: TeamMember[];
  updates: ProgressUpdate[];
  overallProgress: number;
  totalMilestones: number;
  completedMilestones: number;
}

export interface InvestorNotification {
  id: string;
  investorId: string;
  appId: string;
  type: string;
  title: string;
  content: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  read: boolean;
  readAt: string | null;
  emailSent: boolean;
  emailSentAt: string | null;
  createdAt: string;
}

export const useDevelopment = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const initializePhases = (appId: string) =>
    run(() => apiPost<{ success: boolean; data: AppProgress }>(`/development/apps/${appId}/initialize`, {}));

  const getAppProgress = (appId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: AppProgress }>(`/development/apps/${appId}/progress`));

  const getPhases = (appId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: DevelopmentPhase[] }>(`/development/apps/${appId}/phases`));

  const getPhase = (phaseId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: DevelopmentPhase }>(`/development/phases/${phaseId}`));

  const updatePhase = (phaseId: string, data: Partial<DevelopmentPhase>) =>
    run(() => apiPatch<{ success: boolean; data: DevelopmentPhase }>(`/development/phases/${phaseId}`, data));

  const startPhase = (phaseId: string) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentPhase }>(`/development/phases/${phaseId}/start`, {}));

  const completePhase = (phaseId: string) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentPhase }>(`/development/phases/${phaseId}/complete`, {}));

  const getMilestones = (phaseId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: DevelopmentMilestone[] }>(`/development/phases/${phaseId}/milestones`));

  const getMilestone = (milestoneId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: DevelopmentMilestone }>(`/development/milestones/${milestoneId}`));

  const createMilestone = (phaseId: string, data: { title: string; description?: string; requiresOwnerApproval?: boolean }) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentMilestone }>(`/development/phases/${phaseId}/milestones`, data));

  const updateMilestone = (milestoneId: string, data: Partial<DevelopmentMilestone>) =>
    run(() => apiPatch<{ success: boolean; data: DevelopmentMilestone }>(`/development/milestones/${milestoneId}`, data));

  const completeMilestone = (milestoneId: string) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentMilestone }>(`/development/milestones/${milestoneId}/complete`, {}));

  const approveMilestone = (milestoneId: string) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentMilestone }>(`/development/milestones/${milestoneId}/approve`, {}));

  const rejectMilestone = (milestoneId: string, reason: string) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentMilestone }>(`/development/milestones/${milestoneId}/reject`, { reason }));

  const getTasks = (milestoneId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: DevelopmentTask[] }>(`/development/milestones/${milestoneId}/tasks`));

  const createTask = (milestoneId: string, data: { title: string; description?: string; assignedTo?: string; estimatedHours?: number }) =>
    run(() => apiPost<{ success: boolean; data: DevelopmentTask }>(`/development/milestones/${milestoneId}/tasks`, data));

  const updateTask = (taskId: string, data: Partial<DevelopmentTask>) =>
    run(() => apiPatch<{ success: boolean; data: DevelopmentTask }>(`/development/tasks/${taskId}`, data));

  const getProgressUpdates = (appId: string, limit = 20, offset = 0) =>
    run(() => apiGetAuth<{ success: boolean; data: ProgressUpdate[] }>(`/development/apps/${appId}/updates?limit=${limit}&offset=${offset}`));

  const createProgressUpdate = (appId: string, data: { title: string; content: string; phaseId?: string; milestoneId?: string; visibility?: string }) =>
    run(() => apiPost<{ success: boolean; data: ProgressUpdate }>(`/development/apps/${appId}/updates`, data));

  const getDeployments = (appId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: DeploymentRecord[] }>(`/development/apps/${appId}/deployments`));

  const createDeployment = (appId: string, data: { platform: string; version: string; buildNumber: number; storeUrl?: string; downloadUrl?: string; notes?: string }) =>
    run(() => apiPost<{ success: boolean; data: DeploymentRecord }>(`/development/apps/${appId}/deployments`, data));

  const updateDeployment = (deploymentId: string, data: Partial<DeploymentRecord>) =>
    run(() => apiPatch<{ success: boolean; data: DeploymentRecord }>(`/development/deployments/${deploymentId}`, data));

  const getTeam = (appId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: TeamMember[] }>(`/development/apps/${appId}/team`));

  const addTeamMember = (appId: string, data: { userId: string; role: string; equityPct?: number; canUpdateProgress?: boolean; canPostUpdates?: boolean; canManageTasks?: boolean }) =>
    run(() => apiPost<{ success: boolean; data: TeamMember }>(`/development/apps/${appId}/team`, data));

  const updateTeamMember = (memberId: string, data: Partial<TeamMember>) =>
    run(() => apiPatch<{ success: boolean; data: TeamMember }>(`/development/team/${memberId}`, data));

  const removeTeamMember = (memberId: string) =>
    run(() => apiDelete<{ success: boolean }>(`/development/team/${memberId}`));

  const getInvestorApps = () =>
    run(() => apiGetAuth<{ success: boolean; data: any[] }>('/development/investor/apps'));

  const getNotifications = (limit = 50) =>
    run(() => apiGetAuth<{ success: boolean; data: InvestorNotification[] }>(`/development/investor/notifications?limit=${limit}`));

  const markNotificationRead = (notificationId: string) =>
    run(() => apiPost<{ success: boolean; data: InvestorNotification }>(`/development/investor/notifications/${notificationId}/read`, {}));

  const markAllNotificationsRead = () =>
    run(() => apiPost<{ success: boolean }>('/development/investor/notifications/read-all', {}));

  return {
    initializePhases,
    getAppProgress,
    getPhases,
    getPhase,
    updatePhase,
    startPhase,
    completePhase,
    getMilestones,
    getMilestone,
    createMilestone,
    updateMilestone,
    completeMilestone,
    approveMilestone,
    rejectMilestone,
    getTasks,
    createTask,
    updateTask,
    getProgressUpdates,
    createProgressUpdate,
    getDeployments,
    createDeployment,
    updateDeployment,
    getTeam,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    getInvestorApps,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    isLoading,
    error,
  };
};
