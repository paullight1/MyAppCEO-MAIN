import { apiGetAuth } from '../lib/apiClient';
import { ApiResponse } from '../../../packages/types/src';
import { useApiRunner } from './useApiRunner';

export interface FinanceSummary {
    month: string;
    revenue: number;
    expenses: number;
}

export interface UserStakeListing {
    name: string;
    category: string;
    monthlyRevenue: number;
}

export interface UserStake {
    id: string;
    userId: string;
    listingId: string;
    ownershipPercentage: number;
    amountInvested: number;
    currentValue: number;
    totalDividends: number;
    acquiredAt: string;
    listing?: UserStakeListing;
}

export interface FinanceData {
    summary: FinanceSummary[];
    stakes: UserStake[];
    currency?: string;
    metrics: {
        totalRevenue: number;
        totalRevenueChange: number;
        portfolioValue: number;
        portfolioValueChange: number;
        netProfit: number;
        netProfitChange: number;
        dividendsEarned: number;
        dividendsEarnedChange: number;
    };
    revenueBySource: {
        source: string;
        value: number;
        pct: number;
    }[];
}

export const useFinances = () => {
    const { run, isLoading, error } = useApiRunner({ objectReturn: true });

    const getFinancesDashboard = (filters?: { startDate?: string; endDate?: string; currency?: string }) =>
        run(() => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.set('startDate', filters.startDate);
            if (filters?.endDate) params.set('endDate', filters.endDate);
            if (filters?.currency) params.set('currency', filters.currency);
            const qs = params.toString();
            return apiGetAuth<ApiResponse<FinanceData>>(`/finances/dashboard${qs ? `?${qs}` : ''}`);
        });

    return {
        getFinancesDashboard,
        isLoading,
        error,
    };
};
