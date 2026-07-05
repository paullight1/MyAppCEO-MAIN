import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TimeseriesData } from '../hooks/usePromotionAnalytics';
import { chartTheme, seriesColor, ThemedTooltip } from './ui/chart';
import { formatCompactCurrency, formatCompactNumber, formatCurrency, formatNumber } from '../utils/format';

interface PerformanceChartProps {
    data: TimeseriesData[];
    type: 'spend-revenue' | 'reach' | 'conversions';
}

const axisProps = {
    stroke: chartTheme.axis,
    fontSize: chartTheme.axisFontSize,
    tickLine: false,
    axisLine: false,
} as const;

const formatSpendRevenue = (value: number | string, name: string) =>
    name === 'spend' || name === 'revenue' ? formatCurrency(Number(value)) : formatNumber(Number(value));

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, type }) => {
    if (data.length === 0) {
        return (
            <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-foreground">No chart data yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Live analytics will populate this chart when connected.</p>
            </div>
        );
    }

    if (type === 'spend-revenue') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="date" {...axisProps} />
                    <YAxis yAxisId="left" {...axisProps} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <YAxis yAxisId="right" orientation="right" {...axisProps} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <ThemedTooltip valueFormatter={formatSpendRevenue} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="spend" name="spend" stroke={seriesColor(4)} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="revenue" stroke={seriesColor(2)} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'reach') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={seriesColor(1)} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={seriesColor(1)} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="date" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={(v) => formatCompactNumber(v)} />
                    <ThemedTooltip valueFormatter={(v) => formatNumber(Number(v))} />
                    <Area type="monotone" dataKey="reach" name="reach" stroke={seriesColor(1)} strokeWidth={2} fill="url(#reachGradient)" />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'conversions') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="date" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={(v) => formatCompactNumber(v)} />
                    <ThemedTooltip valueFormatter={(v) => formatNumber(Number(v))} />
                    <Bar dataKey="conversions" name="conversions" fill={seriesColor(3)} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return null;
};
