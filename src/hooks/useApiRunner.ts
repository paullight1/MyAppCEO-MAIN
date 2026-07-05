import { useState, useCallback } from 'react';

interface UseApiRunnerOptions {
    /** Use object-style return { success, data } instead of T | null */
    objectReturn?: boolean;
}

interface ApiRunnerResult<T> {
    success: boolean;
    data: T | null;
    error?: string;
}

export function useApiRunner(options: UseApiRunnerOptions & { objectReturn: true }): {
    run: <T>(fn: () => Promise<T>) => Promise<ApiRunnerResult<T>>;
    isLoading: boolean;
    error: string | null;
};
export function useApiRunner(options?: UseApiRunnerOptions & { objectReturn?: false }): {
    run: <T>(fn: () => Promise<T>) => Promise<T | null>;
    isLoading: boolean;
    error: string | null;
};
export function useApiRunner(options: UseApiRunnerOptions = {}) {
    const { objectReturn = false } = options;
    const [activeRequests, setActiveRequests] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const isLoading = activeRequests > 0;

    const run = useCallback(async <T>(fn: () => Promise<T>): Promise<ApiRunnerResult<T> | T | null> => {
        try {
            setActiveRequests((prev) => prev + 1);
            setError(null);
            const data = await fn();
            if (objectReturn) {
                return { success: true, data };
            }
            return data;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
            if (objectReturn) {
                return { success: false, data: null, error: message };
            }
            return null;
        } finally {
            setActiveRequests((prev) => Math.max(0, prev - 1));
        }
    }, [objectReturn]);

    return { run, isLoading, error };
}
