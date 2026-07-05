import React from 'react';
import { CheckCircle2, XCircle, DollarSign, Users, TrendingUp, ArrowRight } from 'lucide-react';

interface Activity {
    id: string;
    type: 'success' | 'error' | 'info' | 'money' | 'users';
    message: string;
    time: string;
}

const ACTIVITIES: Activity[] = [
    { id: '1', type: 'success', message: 'Connected Stripe successfully', time: '5m ago' },
    { id: '2', type: 'money', message: 'New offer: $42,000 on VoiceLab', time: '2h ago' },
    { id: '3', type: 'users', message: 'Campaign reached 1,000 downloads', time: '4h ago' },
    { id: '4', type: 'info', message: 'Dividend distributed: $8,500', time: '1d ago' },
    { id: '5', type: 'success', message: 'New investor joined stake offering', time: '2d ago' },
];

const ICON_MAP = {
    success: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
    error: { icon: XCircle, color: 'text-rose-500 bg-rose-50' },
    info: { icon: TrendingUp, color: 'text-blue-500 bg-blue-50' },
    money: { icon: DollarSign, color: 'text-amber-500 bg-amber-50' },
    users: { icon: Users, color: 'text-purple-500 bg-purple-50' },
};

export const RecentActivity: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[#1a1a2e]">Recent Activity</h3>
                <button className="text-sm font-semibold text-[#e94560] hover:text-[#d63d56] flex items-center gap-1 transition-colors">
                    View All <ArrowRight size={14} />
                </button>
            </div>

            <div className="space-y-4">
                {ACTIVITIES.map((activity) => {
                    const { icon: Icon, color } = ICON_MAP[activity.type];
                    return (
                        <div key={activity.id} className="flex items-start gap-3 group">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                                <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#1a1a2e] group-hover:text-[#e94560] transition-colors cursor-pointer">
                                    {activity.message}
                                </p>
                                <p className="text-xs text-slate-400">{activity.time}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};