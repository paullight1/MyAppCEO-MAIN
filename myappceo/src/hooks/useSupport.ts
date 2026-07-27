import { useCallback } from 'react';
import { ApiResponse } from '../../../packages/types/src';
import { apiGetAuth, apiPost, apiUpload } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportStatus = 'open' | 'waiting' | 'in_progress' | 'resolved' | 'closed' | 'escalated';

export interface SupportAttachment {
  id?: string;
  name: string;
  url: string;
  contentType?: string;
  size?: number;
}

export interface SupportTicket {
  id: string;
  category: string;
  priority: SupportPriority;
  subject: string;
  message: string;
  status: SupportStatus;
  slaDueAt?: string | null;
  escalationReason?: string | null;
  attachments?: SupportAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSupportTicketPayload {
  category: string;
  priority: SupportPriority;
  subject: string;
  message: string;
  attachments?: SupportAttachment[];
}

export const SUPPORT_CATEGORIES = [
  'Account access',
  'Creator payments',
  'Social automation',
  'Marketplace listing',
  'Escrow or transfer',
  'Billing',
  'Bug report',
  'Other',
];

export const validateSupportTicket = (payload: CreateSupportTicketPayload): string[] => {
  const errors: string[] = [];
  if (!payload.category) errors.push('Choose a support category.');
  if (!payload.priority) errors.push('Choose a priority.');
  if (!payload.subject.trim()) errors.push('Subject is required.');
  if (payload.subject.length > 140) errors.push('Subject must be 140 characters or fewer.');
  if (!payload.message.trim()) errors.push('Describe the issue before submitting.');
  if (payload.message.length > 5000) errors.push('Message must be 5,000 characters or fewer.');
  return errors;
};

export const useSupport = () => {
  const { run, isLoading, error } = useApiRunner();

  const createTicket = useCallback((payload: CreateSupportTicketPayload) =>
    run(() => {
      const errors = validateSupportTicket(payload);
      if (errors.length) return Promise.reject(new Error(errors[0]));
      return apiPost<ApiResponse<SupportTicket>>('/support/tickets', payload);
    }), [run]);

  const getTickets = useCallback(() =>
    run(() => apiGetAuth<ApiResponse<SupportTicket[]>>('/support/tickets')), [run]);

  const getTicket = useCallback((ticketId: string) =>
    run(() => apiGetAuth<ApiResponse<SupportTicket>>(`/support/tickets/${ticketId}`)), [run]);

  const uploadAttachment = useCallback((formData: FormData) =>
    run(() => apiUpload<ApiResponse<SupportAttachment>>('/support/attachments', formData)), [run]);

  return {
    createTicket,
    getTickets,
    getTicket,
    uploadAttachment,
    isLoading,
    error,
  };
};
