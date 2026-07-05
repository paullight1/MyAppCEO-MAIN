import { useCallback, useState } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiGetAuth, apiPatch } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export type HealthStatus = 'healthy' | 'needs_attention' | 'low_performance';

export interface CampaignMetrics {
    campaignId: string;
    campaignName: string;
    appName: string;
    status: 'active' | 'paused' | 'draft' | 'completed' | 'cancelled';
    budget: number;
    spent: number;
    reach: number;
    conversions: number;
    revenue: number;
    roi: number;
}

export interface CreatorPerformance {
    creatorId: string;
    creatorName: string;
    username: string;
    avatar: string;
    contentPieces: number;
    reach: number;
    conversions: number;
    revenue: number;
    spend: number;
    roi: number;
}

export interface AppMetrics {
    appId: string;
    appName: string;
    category: string;
    totalSpend: number;
    totalRevenue: number;
    totalReach: number;
    conversions: number;
    roi: number;
    healthStatus: HealthStatus;
}

export interface TimeseriesData {
    date: string;
    spend: number;
    revenue: number;
    reach: number;
    conversions: number;
}

export interface AnalyticsOverview {
    totalSpent: number;
    totalReach: number;
    conversionRate: number;
    roi: number;
    activeCampaigns: number;
    topCreator: string;
}

export interface PromotionAnalyticsDateRange {
    start: string;
    end: string;
}

export interface CampaignInspection {
    campaignId: string;
    provider?: string;
    healthStatus: HealthStatus;
    failureReasons?: string[];
    recommendations?: string[];
}

const defaultDateRange = (): PromotionAnalyticsDateRange => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    return { start: startDate.toISOString().slice(0, 10), end };
};

const buildRangeQuery = ({ start, end }: PromotionAnalyticsDateRange) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const query = params.toString();
    return query ? `?${query}` : '';
};

export const usePromotionAnalytics = () => {
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics[]>([]);
    const [creatorPerformance, setCreatorPerformance] = useState<CreatorPerformance[]>([]);
    const [appMetrics, setAppMetrics] = useState<AppMetrics[]>([]);
    const [timeseriesData, setTimeseriesData] = useState<TimeseriesData[]>([]);
    const [dateRange, setDateRange] = useState<PromotionAnalyticsDateRange>(() => defaultDateRange());
    const { run, isLoading, error } = useApiRunner();

    const fetchOverview = useCallback((range = dateRange) =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<AnalyticsOverview>>(`/analytics/promotion/overview${buildRangeQuery(range)}`);
            setOverview(result?.data || null);
            return result;
        }), [dateRange, run]);

    const fetchCampaignMetrics = useCallback((range = dateRange) =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<CampaignMetrics[]>>(`/analytics/promotion/campaigns${buildRangeQuery(range)}`);
            setCampaignMetrics(result?.data || []);
            return result;
        }), [dateRange, run]);

    const fetchCreatorPerformance = useCallback((range = dateRange) =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<CreatorPerformance[]>>(`/analytics/promotion/creators${buildRangeQuery(range)}`);
            setCreatorPerformance(result?.data || []);
            return result;
        }), [dateRange, run]);

    const fetchAppMetrics = useCallback((range = dateRange) =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<AppMetrics[]>>(`/analytics/promotion/apps${buildRangeQuery(range)}`);
            setAppMetrics((result?.data || []).map(app => ({
                ...app,
                healthStatus: app.healthStatus || getHealthStatus(app.roi),
            })));
            return result;
        }), [dateRange, run]);

    const fetchTimeseries = useCallback((range = dateRange) =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<TimeseriesData[]>>(`/analytics/promotion/timeseries${buildRangeQuery(range)}`);
            setTimeseriesData(result?.data || []);
            return result;
        }), [dateRange, run]);

    const setDateRangeFilter = (start: string, end: string) => {
        setDateRange({ start, end });
    };

    const refetchAll = useCallback((range = dateRange) =>
        Promise.allSettled([
            fetchOverview(range),
            fetchCampaignMetrics(range),
            fetchCreatorPerformance(range),
            fetchAppMetrics(range),
            fetchTimeseries(range),
        ]), [dateRange, fetchOverview, fetchCampaignMetrics, fetchCreatorPerformance, fetchAppMetrics, fetchTimeseries]);

    const updateCampaignStatus = useCallback((campaignId: string, status: CampaignMetrics['status'] | 'archived') =>
        run(async () => {
            const result = await apiPatch<ApiResponse<CampaignMetrics>>(`/analytics/promotion/campaigns/${campaignId}/status`, { status });
            if (result?.data) {
                setCampaignMetrics(prev => (
                    status === 'archived'
                        ? prev.filter(campaign => campaign.campaignId !== campaignId)
                        : prev.map(campaign => campaign.campaignId === campaignId ? result.data : campaign)
                ));
            }
            return result;
        }), [run]);

    const inspectCampaign = useCallback((campaignId: string) =>
        run(() => apiGetAuth<ApiResponse<CampaignInspection>>(`/analytics/promotion/campaigns/${campaignId}/inspect${buildRangeQuery(dateRange)}`)),
        [dateRange, run]);

    return {
        overview,
        campaignMetrics,
        creatorPerformance,
        appMetrics,
        timeseriesData,
        dateRange,
        isLoading,
        error,
        fetchOverview,
        fetchCampaignMetrics,
        fetchCreatorPerformance,
        fetchAppMetrics,
        fetchTimeseries,
        refetchAll,
        setDateRangeFilter,
        pauseCampaign: (campaignId: string) => updateCampaignStatus(campaignId, 'paused'),
        resumeCampaign: (campaignId: string) => updateCampaignStatus(campaignId, 'active'),
        archiveCampaign: (campaignId: string) => updateCampaignStatus(campaignId, 'archived'),
        inspectCampaign,
    };
};

export const getHealthStatus = (roi: number): HealthStatus => {
    if (roi >= 3) return 'healthy';
    if (roi >= 1.5) return 'needs_attention';
    return 'low_performance';
};
