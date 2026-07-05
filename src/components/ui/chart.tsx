import React, { ReactNode } from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Card, CardHeader, CardTitle, CardDescription } from './Card';

/**
 * Token-aware charting foundation.
 *
 * Every colour resolves to a CSS variable, so charts automatically follow the
 * active light/dark theme instead of shipping hardcoded hex (the previous
 * pattern in RevenueChart / PerformanceChart). Series colours come from the
 * `--chart-1..6` categorical palette defined in `index.css`.
 */

export const CHART_SERIES = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
] as const;

/** Pick a categorical series colour by index (wraps around the palette). */
export const seriesColor = (index: number): string => CHART_SERIES[index % CHART_SERIES.length];

/** Shared recharts theme values (axes, grid, cursor) as themeable CSS-var strings. */
export const chartTheme = {
    grid: 'hsl(var(--border))',
    axis: 'hsl(var(--muted-foreground))',
    axisFontSize: 12,
    cursor: 'hsl(var(--muted) / 0.5)',
    tooltipCursor: { fill: 'hsl(var(--muted) / 0.4)' },
} as const;

export interface ChartTooltipItem {
    name?: string | number;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
}

interface ChartTooltipProps {
    /** Injected by recharts at render time. */
    active?: boolean;
    payload?: ChartTooltipItem[];
    label?: string | number;
    valueFormatter?: (value: number | string, name: string) => string;
    labelFormatter?: (label: string) => string;
}

/**
 * Themed tooltip. Pass `valueFormatter` to control how each datum renders
 * (e.g. currency vs plain number) — replaces the per-chart inline `$`/`toLocaleString`.
 */
export function ChartTooltip({
    active,
    payload,
    label,
    valueFormatter,
    labelFormatter,
}: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg">
            {label != null && (
                <p className="mb-1.5 text-xs font-semibold text-foreground">
                    {labelFormatter ? labelFormatter(String(label)) : String(label)}
                </p>
            )}
            <div className="space-y-1">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                            aria-hidden="true"
                        />
                        <span className="text-muted-foreground capitalize">{entry.name}</span>
                        <span className="ml-auto font-semibold text-foreground">
                            {valueFormatter && entry.value != null
                                ? valueFormatter(entry.value, String(entry.name))
                                : String(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Convenience `<Tooltip>` pre-wired to the themed content + cursor. */
export function ThemedTooltip({
    valueFormatter,
    labelFormatter,
    cursor = true,
}: {
    valueFormatter?: (value: number | string, name: string) => string;
    labelFormatter?: (label: string) => string;
    cursor?: boolean | object;
}) {
    return (
        <Tooltip
            cursor={cursor === true ? chartTheme.tooltipCursor : cursor}
            content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />}
        />
    );
}

interface ChartCardProps {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    /** Fixed pixel height for the plotted area. Default 300. */
    height?: number;
    /** True when there is no data to plot — renders an inline empty state. */
    isEmpty?: boolean;
    emptyLabel?: string;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}

/**
 * Standard chart surface: a `Card` with an optional header/action row and a
 * `ResponsiveContainer`-wrapped plotting area. Gives every chart in the app the
 * same padding, border, empty-state and responsive behaviour.
 */
export function ChartCard({
    title,
    description,
    action,
    height = 300,
    isEmpty = false,
    emptyLabel = 'No data to display yet.',
    className,
    bodyClassName,
    children,
}: ChartCardProps) {
    return (
        <Card className={cn('overflow-hidden', className)}>
            {(title || action) && (
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                    <div className="space-y-1">
                        {title && <CardTitle className="text-base">{title}</CardTitle>}
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </CardHeader>
            )}
            <div className={cn('px-4 pb-4', !title && 'pt-4', bodyClassName)}>
                {isEmpty ? (
                    <div
                        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center"
                        style={{ height }}
                    >
                        <BarChart3 className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium text-muted-foreground">{emptyLabel}</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        {children as React.ReactElement}
                    </ResponsiveContainer>
                )}
            </div>
        </Card>
    );
}

export interface BreakdownDatum {
    label: string;
    value: number;
    /** 0–100. If omitted it is computed from the share of the total. */
    percentage?: number;
    colorIndex?: number;
}

interface BreakdownListProps {
    items: BreakdownDatum[];
    valueFormatter?: (value: number) => string;
    total?: number;
    totalLabel?: string;
    className?: string;
    emptyLabel?: string;
}

/**
 * Accessible horizontal "share of total" list (progress-bar style). Replaces the
 * hand-rolled, light-only bar lists in RevenueBreakdown / AnalyticsPage.
 */
export function BreakdownList({
    items,
    valueFormatter = (v) => v.toLocaleString(),
    total,
    totalLabel = 'Total',
    className,
    emptyLabel = 'No data yet.',
}: BreakdownListProps) {
    const sum = total ?? items.reduce((acc, i) => acc + i.value, 0);

    if (items.length === 0) {
        return <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>{emptyLabel}</p>;
    }

    return (
        <div className={cn('space-y-4', className)}>
            {items.map((item, i) => {
                const pct = item.percentage ?? (sum > 0 ? (item.value / sum) * 100 : 0);
                const color = seriesColor(item.colorIndex ?? i);
                return (
                    <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2 font-medium text-foreground">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                                {item.label}
                            </span>
                            <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{valueFormatter(item.value)}</span>
                                <span className="ml-1.5 tabular-nums">{Math.round(pct)}%</span>
                            </span>
                        </div>
                        <div
                            className="h-2 w-full overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-label={item.label}
                            aria-valuenow={Math.round(pct)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                );
            })}
            {total !== undefined && (
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="font-medium text-muted-foreground">{totalLabel}</span>
                    <span className="text-base font-bold text-foreground">{valueFormatter(sum)}</span>
                </div>
            )}
        </div>
    );
}
