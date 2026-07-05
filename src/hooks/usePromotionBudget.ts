import { useCallback, useState } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiGetAuth, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export type RuleStatus = 'active' | 'paused' | 'disabled';
export type TriggerType = 'traffic_threshold' | 'scheduled' | 'manual' | 'performance';
export type ActionType = 'hire_creator' | 'boost_campaign' | 'purchase_ads' | 'featured_slot';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'once';

export interface PromotionBudget {
    id: string;
    userId: string;
    monthlyLimit: number;
    currentSpend: number;
    walletSource: 'main' | 'dedicated';
    autoFund: boolean;
}

export interface TriggerConfig {
    type: TriggerType;
    metric?: 'daily_visitors' | 'page_views' | 'conversion_rate' | 'roi';
    operator?: 'lt' | 'gt' | 'eq';
    value?: number;
    dayOfWeek?: string;
    time?: string;
    timezone?: string;
    period?: string;
}

export interface ActionConfig {
    type: ActionType;
    minBudget?: number;
    maxBudget?: number;
    niche?: string;
    platforms?: string[];
    amount?: number;
    targetCampaign?: string;
    category?: string;
    duration?: string;
}

export interface AutoPromotionRule {
    id: string;
    userId: string;
    name: string;
    trigger: TriggerConfig;
    action: ActionConfig;
    frequency: Frequency;
    status: RuleStatus;
    lastTriggered?: string;
    createdAt: string;
}

export interface PromotionTransaction {
    id: string;
    userId: string;
    ruleId?: string;
    campaignId?: string;
    description: string;
    amount: number;
    type: string;
    status: 'completed' | 'pending' | 'failed';
    createdAt: string;
}

export interface CreateBudgetPayload {
    monthlyLimit: number;
    walletSource: 'main' | 'dedicated';
    autoFund: boolean;
}

export interface CreateRulePayload {
    name: string;
    trigger: TriggerConfig;
    action: ActionConfig;
    frequency: Frequency;
}

export const usePromotionBudget = () => {
    const [budget, setBudget] = useState<PromotionBudget | null>(null);
    const [rules, setRules] = useState<AutoPromotionRule[]>([]);
    const [transactions, setTransactions] = useState<PromotionTransaction[]>([]);
    const { run, isLoading, error } = useApiRunner();

    const fetchBudget = useCallback(() =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<PromotionBudget>>('/promotion/budget');
            setBudget(result?.data || null);
            return result;
        }), [run]);

    const updateBudget = useCallback((payload: CreateBudgetPayload) =>
        run(async () => {
            const result = await apiPost<ApiResponse<PromotionBudget>>('/promotion/budget', payload);
            if (result?.data) setBudget(result.data);
            return result;
        }), [run]);

    const fetchRules = useCallback(() =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<AutoPromotionRule[]>>('/promotion/rules');
            setRules(result?.data || []);
            return result;
        }), [run]);

    const createRule = useCallback((payload: CreateRulePayload) =>
        run(async () => {
            const result = await apiPost<ApiResponse<AutoPromotionRule>>('/promotion/rules', payload);
            if (result?.data) {
                setRules(prev => [...prev, result.data]);
            }
            return result;
        }), [run]);

    const updateRuleStatus = useCallback((id: string, status: RuleStatus) =>
        run(async () => {
            const result = await apiPatch<ApiResponse<AutoPromotionRule>>(`/promotion/rules/${id}/status`, { status });
            if (result?.data) {
                setRules(prev => prev.map(r => r.id === id ? result.data : r));
            }
            return result;
        }), [run]);

    const deleteRule = useCallback((id: string) =>
        run(async () => {
            const result = await apiDelete<ApiResponse<void>>(`/promotion/rules/${id}`);
            if (result?.success) {
                setRules(prev => prev.filter(r => r.id !== id));
            }
            return result;
        }), [run]);

    const fetchTransactions = useCallback(() =>
        run(async () => {
            const result = await apiGetAuth<ApiResponse<PromotionTransaction[]>>('/promotion/transactions');
            setTransactions(result?.data || []);
            return result;
        }), [run]);

    return {
        budget,
        rules,
        transactions,
        isLoading,
        error,
        fetchBudget,
        updateBudget,
        fetchRules,
        createRule,
        updateRuleStatus,
        deleteRule,
        fetchTransactions,
    };
};
