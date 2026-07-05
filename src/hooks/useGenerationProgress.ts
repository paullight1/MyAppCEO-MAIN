import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface GenerationProgress {
    nodeId: string;
    progress: number;
    status: 'queued' | 'pending' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled';
    imageUrl?: string;
    error?: string;
    updatedAt: string;
}

interface UseGenerationProgressOptions {
    ideaId: string;
    enabled?: boolean;
}

export function useGenerationProgress({
    ideaId,
    enabled = true,
}: UseGenerationProgressOptions) {
    const [progressMap, setProgressMap] = useState<Record<string, GenerationProgress>>({});
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const initializeProgress = useCallback((nodeIds: string[]) => {
        const initialProgress: Record<string, GenerationProgress> = {};
        nodeIds.forEach(nodeId => {
            initialProgress[nodeId] = {
                nodeId,
                progress: 0,
                status: 'pending',
                updatedAt: new Date().toISOString(),
            };
        });
        setProgressMap(initialProgress);
    }, []);

    const updateProgress = useCallback((nodeId: string, update: Partial<GenerationProgress>) => {
        setProgressMap(prev => ({
            ...prev,
            [nodeId]: {
                ...prev[nodeId],
                ...update,
                nodeId,
                updatedAt: new Date().toISOString(),
            },
        }));
    }, []);

    const resetProgress = useCallback(() => {
        setProgressMap({});
    }, []);

    const mapProgressRow = useCallback((row: any): GenerationProgress => ({
        nodeId: row.node_id,
        progress: row.progress || 0,
        status: row.status === 'running' ? 'processing' : row.status || 'queued',
        imageUrl: row.image_url,
        error: row.error,
        updatedAt: row.updated_at || new Date().toISOString(),
    }), []);

    const loadPersistedProgress = useCallback(async () => {
        if (!enabled || !ideaId) return;

        const { data, error: fetchError } = await supabase
            .from('design_generation_progress')
            .select('node_id, progress, status, image_url, error, updated_at')
            .eq('idea_id', ideaId)
            .order('updated_at', { ascending: false });

        if (fetchError) {
            setError(fetchError.message || 'Failed to load generation progress');
            return;
        }

        const recovered: Record<string, GenerationProgress> = {};
        (data || []).forEach((row) => {
            if (!recovered[row.node_id]) {
                recovered[row.node_id] = mapProgressRow(row);
            }
        });
        setProgressMap(recovered);
    }, [enabled, ideaId, mapProgressRow]);

    useEffect(() => {
        if (!enabled || !ideaId) return;

        void loadPersistedProgress();

        const channelName = `design-progress-${ideaId}`;

        // Subscribe to real-time updates
        const channel = supabase.channel(channelName);

        (channel as any)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'design_generation_progress',
                filter: `idea_id=eq.${ideaId}`,
            }, (payload) => {
                const newProgress = payload.new as any;
                if (newProgress) {
                    updateProgress(newProgress.node_id, {
                        progress: newProgress.progress || 0,
                        status: newProgress.status || 'processing',
                        imageUrl: newProgress.image_url,
                        error: newProgress.error,
                    });
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'design_generation_progress',
                filter: `idea_id=eq.${ideaId}`,
            }, (payload) => {
                const updatedProgress = payload.new as any;
                if (updatedProgress) {
                    updateProgress(updatedProgress.node_id, {
                        progress: updatedProgress.progress || 0,
                        status: updatedProgress.status || 'processing',
                        imageUrl: updatedProgress.image_url,
                        error: updatedProgress.error,
                    });
                }
            })
            .on('system', { event: 'connected' }, () => {
                setIsConnected(true);
                setError(null);
            })
            .on('system', { event: 'disconnected' }, () => {
                setIsConnected(false);
            })
            .on('system', { event: 'error' }, (payload: any) => {
                setError(payload.error?.message || 'Connection error');
            })
            // The subscribe status callback is the reliable connection signal in
            // supabase-js v2 (the 'system' events above are best-effort). Drive
            // the Live/Offline indicator from it.
            .subscribe((status: string, err?: Error) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setError(null);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setIsConnected(false);
                    setError(err?.message || (status === 'TIMED_OUT' ? 'Realtime connection timed out' : 'Realtime channel error'));
                } else if (status === 'CLOSED') {
                    setIsConnected(false);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            setIsConnected(false);
        };
    }, [ideaId, enabled, updateProgress, loadPersistedProgress]);

    // Manual progress update (for non-WebSocket scenarios)
    const setNodeProgress = useCallback((
        nodeId: string,
        progress: number,
        status: GenerationProgress['status'] = 'processing',
        imageUrl?: string
    ) => {
        updateProgress(nodeId, { progress, status, imageUrl });
    }, [updateProgress]);

    // Get overall progress percentage
    const getOverallProgress = useCallback(() => {
        const entries = Object.values(progressMap);
        if (entries.length === 0) return 0;
        
        const totalProgress = entries.reduce((sum, item) => sum + item.progress, 0);
        return Math.round(totalProgress / entries.length);
    }, [progressMap]);

    // Get completed count
    const getCompletedCount = useCallback(() => {
        return Object.values(progressMap).filter(item => item.status === 'completed').length;
    }, [progressMap]);

    // Get failed count
    const getFailedCount = useCallback(() => {
        return Object.values(progressMap).filter(item => item.status === 'failed').length;
    }, [progressMap]);

    return {
        progressMap,
        isConnected,
        error,
        initializeProgress,
        updateProgress,
        resetProgress,
        loadPersistedProgress,
        setNodeProgress,
        getOverallProgress,
        getCompletedCount,
        getFailedCount,
    };
}

export default useGenerationProgress;
