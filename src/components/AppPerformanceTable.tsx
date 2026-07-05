import React from 'react';
import { AppMetrics } from '../hooks/usePromotionAnalytics';
import { HealthStatusBadge } from './HealthStatusBadge';

interface AppPerformanceTableProps {
    apps: AppMetrics[];
}

export const AppPerformanceTable: React.FC<AppPerformanceTableProps> = ({ apps }) => {
    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">App-by-App Performance</h3>
            </div>
            {apps.length === 0 ? (
                <div className="p-10 text-center">
                    <p className="text-sm font-bold text-foreground">No app performance yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        App-level promotion metrics will appear here after live analytics are available.
                    </p>
                </div>
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">App</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Campaign Spend</th>
                            <th className="px-6 py-4">Revenue</th>
                            <th className="px-6 py-4">Reach</th>
                            <th className="px-6 py-4">ROI</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {apps.map((app) => (
                            <tr key={app.appId} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white text-sm font-bold">
                                            {app.appName[0]}
                                        </div>
                                        <p className="font-bold text-foreground">{app.appName}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-muted-foreground">{app.category}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-foreground">
                                    ${app.totalSpend.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-bold text-emerald-600">
                                    ${app.totalRevenue.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-foreground">
                                    {app.totalReach.toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`font-bold ${app.roi >= 3 ? 'text-emerald-600' : app.roi >= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {app.roi.toFixed(1)}x
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <HealthStatusBadge status={app.healthStatus} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
    );
};
