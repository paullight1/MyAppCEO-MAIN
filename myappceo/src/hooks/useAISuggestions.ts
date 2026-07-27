import { useState, useCallback } from 'react';
import { apiPost } from '../lib/apiClient';
import { sanitizePrompt } from '../utils/security';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

interface AISuggestionResponse {
    suggestions: string[];
    confidence: number;
    category?: string;
}

interface UseAISuggestionsOptions {
    ideaId?: string;
}

export function useAISuggestions({ ideaId }: UseAISuggestionsOptions = {}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const generateSuggestions = useCallback(async (
        nodeId: string,
        nodeType: string,
        nodeLabel: string,
        context?: string
    ): Promise<string[]> => {
        setIsLoading(true);
        setError(null);
        
        const sanitizedLabel = sanitizePrompt(nodeLabel);
        const sanitizedContext = context ? sanitizePrompt(context) : undefined;

        try {
            const response = await apiPost<ApiResponse<AISuggestionResponse>>('/ai/prd-suggestions', {
                ideaId,
                nodeId,
                nodeType,
                nodeLabel: sanitizedLabel,
                context: sanitizedContext,
            });

            if (response.success && response.data) {
                const newSuggestions = response.data.suggestions || [];
                setSuggestions(newSuggestions);
                return newSuggestions;
            }

            throw new Error(response.message || 'Failed to generate suggestions');
        } catch (err) {
            console.error('AI suggestions error:', err);
            
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestions';
            setError(errorMessage);

            // Honest failure: surface the error and return no suggestions rather
            // than passing off a hardcoded list as AI-generated output.
            setSuggestions([]);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [ideaId]);

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setError(null);
    }, []);

    return {
        suggestions,
        isLoading,
        error,
        generateSuggestions,
        clearSuggestions,
    };
}

export default useAISuggestions;