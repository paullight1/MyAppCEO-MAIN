import { ApiResponse } from '../../../packages/types/src';
import { apiGetAuth, apiPost } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  listingId?: string;
  lastMessageAt: string;
  lastMessage?: Pick<Message, 'content' | 'senderId'>;
}

export interface SendMessagePayload {
  recipientId: string;
  content: string;
  listingId?: string;
  conversationId?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMessages = () => {
  const { run, isLoading, error } = useApiRunner();

  /**
   * Send a direct message (creates a new conversation if none exists).
   * Maps to POST /messages
   */
  const sendMessage = (payload: SendMessagePayload) =>
    run(() => apiPost<ApiResponse<Message>>('/messages', payload));

  /**
   * List all conversations for the authenticated user.
   * Maps to GET /messages/conversations
   */
  const getConversations = () =>
    run(() => apiGetAuth<ApiResponse<Conversation[]>>('/messages/conversations'));

  /**
   * Get all messages in a specific conversation.
   * Maps to GET /messages/conversation/:id
   */
  const getMessages = (conversationId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<Message[]>>(`/messages/conversation/${conversationId}`),
    );

  return {
    sendMessage,
    getConversations,
    getMessages,
    isLoading,
    error,
  };
};
