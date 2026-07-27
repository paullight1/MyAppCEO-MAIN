import { ApiResponse } from '../../../packages/types/src';
import { apiPost } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface ValuationResponse {
  suggestedPrice: number;
  multipleUsed: number;
  insight: string;
}

export interface ValuationInput {
  name: string;
  category: string;
  monthlyRevenue: number;
  description: string;
}

export const useAI = () => {
  const { run, isLoading, error } = useApiRunner();

  /** Get an AI-generated valuation suggestion for a listing */
  const getValuationSuggestion = (data: ValuationInput) =>
    run(() => apiPost<ApiResponse<ValuationResponse>>('/ai/valuation', data));

  return {
    getValuationSuggestion,
    isLoading,
    error,
  };
};
