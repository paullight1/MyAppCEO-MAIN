import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGetAuth, apiPatch, apiPost } from '../lib/apiClient';
import { PRDNode, PRDValidationResult, PRDVersionMetadata } from '../components/prd/types';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

interface UsePRDOptions {
    ideaId?: string;
    autoSaveDelay?: number;
    enabled?: boolean;
}

export function usePRD({ ideaId, autoSaveDelay = 5000, enabled = true }: UsePRDOptions = {}) {
    const [prdNodes, setPrdNodes] = useState<PRDNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [validation, setValidation] = useState<PRDValidationResult | null>(null);
    const [currentVersion, setCurrentVersion] = useState<number | null>(null);
    const [versionHistory, setVersionHistory] = useState<PRDVersionMetadata[]>([]);
    
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingDataRef = useRef<PRDNode[] | null>(null);

    const applyMetadata = useCallback((data: any) => {
        if (typeof data?.currentVersion === 'number') {
            setCurrentVersion(data.currentVersion);
        }
        if (Array.isArray(data?.versions)) {
            setVersionHistory(data.versions);
        }
        if (data?.validation) {
            setValidation(data.validation);
        }
        if (data?.lastSavedAt) {
            setLastSaved(new Date(data.lastSavedAt));
        }
    }, []);

    const loadVersionHistory = useCallback(async () => {
        if (!ideaId || !enabled) return null;

        try {
            const response = await apiGetAuth<ApiResponse<{ currentVersion: number; versions: PRDVersionMetadata[] }> | { currentVersion?: number; versions?: PRDVersionMetadata[] }>(`/ideas/${ideaId}/prd/versions`);
            const data: any = 'success' in response ? response.data : response;
            applyMetadata(data);
            return data;
        } catch (err) {
            console.warn('Failed to load PRD version history:', err);
            return null;
        }
    }, [ideaId, enabled, applyMetadata]);

    const loadPRD = useCallback(async () => {
        if (!ideaId || !enabled) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await apiGetAuth<ApiResponse<{ nodes: PRDNode[] }> | { nodes?: PRDNode[]; prd?: any }>(`/ideas/${ideaId}/prd`);
            const data: any = 'success' in response ? response.data : response;
            
            if (data) {
                setPrdNodes(data.nodes || data.prd?.nodes || data.prd?.pages || []);
                applyMetadata(data);
                if (!data.lastSavedAt) setLastSaved(new Date());
                void loadVersionHistory();
            } else {
                console.warn('No PRD found for idea:', ideaId);
            }
        } catch (err) {
            console.error('Failed to load PRD:', err);
            setError(err instanceof Error ? err.message : 'Failed to load PRD');
        } finally {
            setIsLoading(false);
        }
    }, [ideaId, enabled, applyMetadata, loadVersionHistory]);

    const savePRD = useCallback(async (nodes: PRDNode[]) => {
        if (!ideaId || !enabled) return false;
        
        setIsSaving(true);
        setError(null);
        
        try {
            const response = await apiPatch<ApiResponse<{ nodes: PRDNode[] }>>(`/ideas/${ideaId}/prd`, {
                nodes,
                baseVersion: currentVersion,
                lastSavedAt: lastSaved?.toISOString(),
            });
            
            if (response.success) {
                setLastSaved(new Date());
                applyMetadata(response.data);
                void loadVersionHistory();
                setHasUnsavedChanges(false);
                pendingDataRef.current = null;
                return true;
            }
            
            throw new Error(response.message || 'Failed to save PRD');
        } catch (err) {
            console.error('Failed to save PRD:', err);
            setError(err instanceof Error ? err.message : 'Failed to save PRD');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [ideaId, enabled, applyMetadata, loadVersionHistory, currentVersion, lastSaved]);

    const scheduleAutoSave = useCallback((nodes: PRDNode[]) => {
        if (!ideaId || !enabled) return;
        
        pendingDataRef.current = nodes;
        setHasUnsavedChanges(true);
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(async () => {
            if (pendingDataRef.current) {
                await savePRD(pendingDataRef.current);
            }
        }, autoSaveDelay);
    }, [ideaId, enabled, autoSaveDelay, savePRD]);

    const updatePRD = useCallback((nodes: PRDNode[]) => {
        setPrdNodes(nodes);
        scheduleAutoSave(nodes);
    }, [scheduleAutoSave]);

    const applyGraphResponse = useCallback((payload: any) => {
        const data = payload && 'success' in payload ? payload.data : payload;
        const nodes = data?.nodes || data?.graph?.nodes || data?.prd?.nodes || data?.prd?.pages;
        if (Array.isArray(nodes)) {
            setPrdNodes(nodes);
            setHasUnsavedChanges(false);
            pendingDataRef.current = null;
        }
        if (data?.validation) {
            setValidation(data.validation);
        }
        applyMetadata(data);
        return data;
    }, [applyMetadata]);

    const loadGraph = useCallback(async () => {
        if (!ideaId || !enabled) return null;

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiGetAuth<ApiResponse<any>>(`/ideas/${ideaId}/prd/graph`);
            return applyGraphResponse(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load PRD graph');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [ideaId, enabled, applyGraphResponse]);

    const patchNode = useCallback(async (nodeId: string, patch: Partial<PRDNode>) => {
        if (!ideaId || !enabled) return null;

        setIsSaving(true);
        setError(null);

        try {
            const response = await apiPatch<ApiResponse<any>>(`/ideas/${ideaId}/prd/nodes/${nodeId}`, {
                ...patch,
                baseVersion: currentVersion,
                lastSavedAt: lastSaved?.toISOString(),
            });
            setLastSaved(new Date());
            void loadVersionHistory();
            return applyGraphResponse(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update PRD node');
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [ideaId, enabled, applyGraphResponse, loadVersionHistory, currentVersion, lastSaved]);

    const refineNode = useCallback(async (nodeId: string, instructions?: string) => {
        if (!ideaId || !enabled) return null;

        setIsSaving(true);
        setError(null);

        try {
            const response = await apiPost<ApiResponse<any>>(`/ideas/${ideaId}/prd/nodes/${nodeId}/refine`, { instructions });
            setLastSaved(new Date());
            void loadVersionHistory();
            return applyGraphResponse(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refine PRD node');
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [ideaId, enabled, applyGraphResponse, loadVersionHistory]);

    const expandNode = useCallback(async (nodeId: string, instructions?: string) => {
        if (!ideaId || !enabled) return null;

        setIsSaving(true);
        setError(null);

        try {
            const response = await apiPost<ApiResponse<any>>(`/ideas/${ideaId}/prd/nodes/${nodeId}/expand`, { instructions });
            setLastSaved(new Date());
            void loadVersionHistory();
            return applyGraphResponse(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to expand PRD node');
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [ideaId, enabled, applyGraphResponse, loadVersionHistory]);

    const validatePRD = useCallback(async () => {
        if (!ideaId || !enabled) return null;

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiPost<ApiResponse<any>>(`/ideas/${ideaId}/prd/validate`, {});
            const data = response.data || response;
            if (data?.validation) setValidation(data.validation);
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to validate PRD');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [ideaId, enabled]);

    const forceSave = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        if (pendingDataRef.current) {
            return await savePRD(pendingDataRef.current);
        }
        
        if (hasUnsavedChanges) {
            return await savePRD(prdNodes);
        }
        
        return true;
    }, [savePRD, prdNodes, hasUnsavedChanges, pendingDataRef]);

    useEffect(() => {
        if (ideaId && enabled) {
            loadPRD();
        }
        
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [ideaId, enabled, loadPRD]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    return {
        prdNodes,
        isLoading,
        isSaving,
        lastSaved,
        error,
        hasUnsavedChanges,
        validation,
        currentVersion,
        versionHistory,
        updatePRD,
        forceSave,
        loadGraph,
        loadVersionHistory,
        patchNode,
        refineNode,
        expandNode,
        validatePRD,
        reload: loadPRD,
    };
}

export default usePRD;
