import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DashboardOverview, ApiResponse } from '../../../../packages/types/src';
import { apiGetAuth } from '../lib/apiClient';

const unwrapResponse = <T>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
};

export const useDashboardData = (appId?: string) => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(appId));
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!appId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await apiGetAuth<ApiResponse<DashboardOverview> | DashboardOverview>(
        `/analytics/overview/${appId}`,
      );
      setData(unwrapResponse(result));
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch dashboard data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchOverview();

    if (!appId) return;

    // Real-time fallback — re-fetch on meaningful app row mutations
    const subscription = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'apps', filter: `id=eq.${appId}` },
        () => fetchOverview(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [appId, fetchOverview]);

  return { data, isLoading, error, refetch: fetchOverview };
};
