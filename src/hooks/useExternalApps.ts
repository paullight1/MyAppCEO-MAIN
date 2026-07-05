import { ApiResponse } from '../../../../packages/types/src';
import { apiGet } from '../lib/apiClient';
import { ExternalCatalogResponse, ExternalStoreApp, StorePlatform } from '../types/externalApp';
import { useApiRunner } from './useApiRunner';

interface SearchExternalAppsParams {
  term?: string;
  platform?: StorePlatform;
  country?: string;
  limit?: number;
  category?: string;
}

const toQueryString = (params: SearchExternalAppsParams): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString();
};

export const useExternalApps = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const searchExternalApps = (params: SearchExternalAppsParams = {}) =>
    run(() => {
      const qs = toQueryString(params);
      return apiGet<ApiResponse<ExternalCatalogResponse>>(`/external-apps/search${qs ? `?${qs}` : ''}`);
    });

  const getExternalApp = (platform: Exclude<StorePlatform, 'all'>, id: string, country = 'US') =>
    run(() =>
      apiGet<ApiResponse<ExternalStoreApp>>(
        `/external-apps/${platform}/${encodeURIComponent(id)}?country=${encodeURIComponent(country)}`,
      ),
    );

  return {
    searchExternalApps,
    getExternalApp,
    isLoading,
    error,
  };
};

