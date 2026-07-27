import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change?: number;
    changeLabel?: string;
    icon: React.ReactNode;
    gradient: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan' | 'amber' | 'rose';
    footer?: string;
}

const BG_GRADIENTS = {
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-violet-500 to-purple-600',
    green: 'from-emerald-500 to-teal-600',
    orange: 'from-orange-500 to-amber-600',
    pink: 'from-pink-500 to-rose-600',
    cyan: 'from-cyan-500 to-teal-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-600',
};

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    change,
    changeLabel = 'vs last month',
    icon,
    gradient,
    footer,
}) => {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    const isNeutral = change === 0;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${BG_GRADIENTS[gradient]} border-0 p-6 transition-all duration-300 text-white`}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-4">
                    <p className="text-sm font-medium text-white/80">{title}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
                    {change !== undefined && (
                        <div className="flex items-center gap-2">
                            <span
                                className={`flex items-center gap-1 text-sm font-semibold ${
                                    isPositive
                                        ? 'text-white'
                                        : isNegative
                                        ? 'text-white/80'
                                        : 'text-white/60'
                                }`}
                            >
                                {isPositive && <TrendingUp size={14} />}
                                {isNegative && <TrendingDown size={14} />}
                                {isNeutral && <Minus size={14} />}
                                {isPositive && '+'}
                                {change}%
                            </span>
                            <span className="text-xs text-white/60">{changeLabel}</span>
                        </div>
                    )}
                </div>
                <div
                    className={`w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white`}
                >
                    {icon}
                </div>
            </div>
            {footer && (
                <p className="mt-4 pt-4 border-t border-white/20 text-xs text-white/60">{footer}</p>
            )}
            <div
                className="absolute -bottom-8 -right-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"
            />
        </div>
    );
};