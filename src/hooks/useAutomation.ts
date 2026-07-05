import { useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiPost, apiGetAuth, apiPatch, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface AutomationNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
}

export interface Automation {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  flowData: {
    nodes: AutomationNode[];
    edges: AutomationEdge[];
  };
  triggers: Array<{
    type: string;
    value?: string;
    platform?: string;
  }>;
  status: 'draft' | 'active' | 'paused' | 'failed';
  stats: Record<string, number>;
  createdAt: string;
}

export interface CreateAutomationPayload {
  appId: string;
  name: string;
  description?: string;
  flowData: {
    nodes: AutomationNode[];
    edges: AutomationEdge[];
  };
  triggers: Array<{
    type: string;
    value?: string;
    platform?: string;
  }>;
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export const validateAutomationPayload = (payload: CreateAutomationPayload): string[] => {
  const errors: string[] = [];
  if (!payload.appId) errors.push('Select an app before creating automations.');
  if (!payload.name.trim()) errors.push('Automation name is required.');
  if (!payload.flowData.nodes.some(node => node.type === 'trigger')) errors.push('Add at least one trigger.');
  if (!payload.flowData.nodes.some(node => node.type === 'action')) errors.push('Add at least one action.');

  payload.flowData.nodes.forEach(node => {
    if (node.type === 'trigger') {
      const triggerType = node.data.triggerType;
      if (['keyword', 'mention', 'hashtag'].includes(triggerType) && !String(node.data.triggerValue || '').trim()) {
        errors.push(`${triggerType} triggers need a value.`);
      }
    }
    if (node.type === 'action') {
      const actionType = node.data.actionType;
      if (actionType === 'reply' && !String(node.data.message || '').trim()) errors.push('Reply actions need a message.');
      if (actionType === 'add_tag' && !String(node.data.tags || '').trim()) errors.push('Tag actions need at least one tag.');
      if (actionType === 'http_request' && !isValidUrl(String(node.data.httpUrl || ''))) {
        errors.push('HTTP request actions need a valid URL.');
      }
      if (actionType === 'http_request' && String(node.data.secret || '').trim()) {
        errors.push('Do not enter raw secrets in the browser. Save credentials in backend secret storage first.');
      }
    }
  });

  return Array.from(new Set(errors));
};

export const useAutomation = () => {
  const { run, isLoading, error } = useApiRunner();

  const createAutomation = useCallback((payload: CreateAutomationPayload) =>
    run(() => {
      const errors = validateAutomationPayload(payload);
      if (errors.length) return Promise.reject(new Error(errors[0]));
      return apiPost<ApiResponse<Automation>>('/automations', payload);
    }), [run]);

  const getAutomations = useCallback((appId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<Automation[]>>(`/automations/${appId}`),
    ), [run]);

  const getAutomation = useCallback((id: string) =>
    run(() =>
      apiGetAuth<ApiResponse<Automation>>(`/automations/detail/${id}`),
    ), [run]);

  const updateAutomation = useCallback((id: string, data: Partial<CreateAutomationPayload>) =>
    run(() =>
      apiPatch<ApiResponse<Automation>>(`/automations/${id}`, data),
    ), [run]);

  const deleteAutomation = useCallback((id: string) =>
    run(() =>
      apiDelete<{ success: boolean }>(`/automations/${id}`),
    ), [run]);

  const publishAutomation = useCallback((id: string) =>
    run(() =>
      apiPost<ApiResponse<Automation>>(`/automations/${id}/publish`, {}),
    ), [run]);

  const pauseAutomation = useCallback((id: string) =>
    run(() =>
      apiPost<ApiResponse<Automation>>(`/automations/${id}/pause`, {}),
    ), [run]);

  return {
    createAutomation,
    getAutomations,
    getAutomation,
    updateAutomation,
    deleteAutomation,
    publishAutomation,
    pauseAutomation,
    isLoading,
    error,
  };
};
