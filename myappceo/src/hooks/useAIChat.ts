import { useState } from 'react';
import { ApiResponse } from '../../../packages/types/src';
import { apiPost, apiGetAuth } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'ai';
  content: string;
  requires_response?: boolean;
  question_type?: 'text' | 'choice' | 'number' | 'boolean';
  question_options?: string[];
}

export interface ConversationSession {
  id: string;
  title: string;
  context_type: string;
  status: string;
  initial_data: Record<string, any>;
  result?: Record<string, any>;
  created_at: string;
}

export const useAIChat = () => {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { run, isLoading, error } = useApiRunner();

  const startConversation = (
    contextType: 'valuation' | 'listing' | 'pitch' | 'general',
    message: string,
    initialData?: Record<string, any>,
  ) =>
    run(async () => {
      const response = await apiPost<ApiResponse<{
        sessionId: string;
        message: string;
        requiresResponse: boolean;
        questionType?: string;
        questionOptions?: string[];
      }>>('/ai/chat/start', {
        contextType,
        message,
        initialData,
      });

      if (response?.data) {
        setCurrentSession({
          id: response.data.sessionId,
          title: initialData?.name || 'New Conversation',
          context_type: contextType,
          status: 'active',
          initial_data: initialData || {},
          created_at: new Date().toISOString(),
        });

        setMessages([{
          role: 'ai',
          content: response.data.message,
          requires_response: response.data.requiresResponse,
          question_type: response.data.questionType as any,
          question_options: response.data.questionOptions,
        }]);

        return response.data;
      }
      return null;
    });

  const sendMessage = (sessionId: string, message: string) =>
    run(async () => {
      const response = await apiPost<ApiResponse<{
        message: string;
        requiresResponse: boolean;
        questionType?: string;
        questionOptions?: string[];
        result?: Record<string, any>;
      }>>(`/ai/chat/${sessionId}/message`, { message });

      if (response?.data) {
        setMessages(prev => [
          ...prev,
          { role: 'user', content: message },
          {
            role: 'ai',
            content: response.data.message,
            requires_response: response.data.requiresResponse,
            question_type: response.data.questionType as any,
            question_options: response.data.questionOptions,
          },
        ]);

        if (response.data.result) {
          setCurrentSession(prev => prev ? { ...prev, result: response.data.result, status: 'completed' } : null);
        }

        return response.data;
      }
      return null;
    });

  const getConversation = (sessionId: string) =>
    run(async () => {
      const response = await apiGetAuth<ApiResponse<{ session: ConversationSession; messages: ChatMessage[] }>>(`/ai/chat/${sessionId}`);

      if (response?.data) {
        setCurrentSession(response.data.session);
        setMessages(response.data.messages);
        return response.data;
      }
      return null;
    });

  const listConversations = () =>
    run(async () => {
      const response = await apiGetAuth<ApiResponse<ConversationSession[]>>('/ai/conversations');
      return response?.data || [];
    });

  const clearConversation = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  return {
    currentSession,
    messages,
    isLoading,
    error,
    startConversation,
    sendMessage,
    getConversation,
    listConversations,
    clearConversation,
  };
};