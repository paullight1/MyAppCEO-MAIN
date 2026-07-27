export interface GlobalMetrics {
    total_users: number;
    active_talents: number;
    active_creators: number;
    total_ttv: number;
    platform_commission: number;
    pending_approvals: number;
    active_jobs: number;
}

export interface ModerationItem {
    id: string;
    type: 'portfolio' | 'ugc' | 'dispute';
    title: string;
    user_name: string;
    submitted_at: string;
    status: 'pending' | 'flagged';
}
