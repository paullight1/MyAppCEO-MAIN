import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Pause, Play, Archive, ExternalLink } from 'lucide-react';
import { CampaignMetrics } from '../hooks/usePromotionAnalytics';
import { getStatusStyle, roiColor } from '../utils/statusStyles';
import { AnimatedIcon } from './ui/AnimatedIcon';

interface CampaignPerformanceTableProps {
    campaigns: CampaignMetrics[];
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onArchive?: (id: string) => void;
    onInspect?: (id: string) => void;
}

type SortKey = 'campaignName' | 'status' | 'spent' | 'reach' | 'conversions' | 'roi';
type SortOrder = 'asc' | 'desc';

export const CampaignPerformanceTable: React.FC<CampaignPerformanceTableProps> = ({ campaigns, onPause, onResume, onArchive, onInspect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('spent');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const filteredAndSortedCampaigns = useMemo(() => {
        let result = [...campaigns];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => 
                c.campaignName.toLowerCase().includes(query) || 
                c.appName.toLowerCase().includes(query)
            );
        }

        result.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return result;
    }, [campaigns, searchQuery, sortKey, sortOrder]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return null;
        return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
                <div className="relative max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-muted border-0 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                </div>
            </div>
            {campaigns.length === 0 ? (
                <div className="p-10 text-center">
                    <p className="text-sm font-bold text-foreground">No campaign analytics yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Promotion campaign metrics will appear here after analytics endpoints return live data.
                    </p>
                </div>
            ) : filteredAndSortedCampaigns.length === 0 ? (
                <div className="p-10 text-center">
                    <p className="text-sm font-bold text-foreground">No matching campaigns</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try a different campaign or app search.</p>
                </div>
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('campaignName')}>
                                <div className="flex items-center gap-1">Campaign <SortIcon column="campaignName" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('spent')}>
                                <div className="flex items-center gap-1">Spent <SortIcon column="spent" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('reach')}>
                                <div className="flex items-center gap-1">Reach <SortIcon column="reach" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('conversions')}>
                                <div className="flex items-center gap-1">Conv. <SortIcon column="conversions" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('roi')}>
                                <div className="flex items-center gap-1">ROI <SortIcon column="roi" /></div>
                            </th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredAndSortedCampaigns.map((campaign) => (
                            <tr key={campaign.campaignId} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-4">
                                    <div>
                                        <p className="font-bold text-foreground">{campaign.campaignName}</p>
                                        <p className="text-xs text-muted-foreground">{campaign.appName}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusStyle(campaign.status).badge}`}>
                                        {getStatusStyle(campaign.status).label}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div>
                                        <p className="font-bold text-foreground">${campaign.spent.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">of ${campaign.budget.toLocaleString()}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-medium text-foreground">
                                    {campaign.reach.toLocaleString()}
                                </td>
                                <td className="px-4 py-4 font-medium text-foreground">
                                    {campaign.conversions}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`font-bold ${roiColor(campaign.roi)}`}>
                                        {campaign.roi.toFixed(1)}x
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        {campaign.status === 'active' && onPause && (
                                            <button onClick={() => onPause(campaign.campaignId)} aria-label="Pause campaign" title="Pause campaign" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                                                <AnimatedIcon icon={Pause} size={16} animation="pop" />
                                            </button>
                                        )}
                                        {campaign.status === 'paused' && onResume && (
                                            <button onClick={() => onResume(campaign.campaignId)} aria-label="Resume campaign" title="Resume campaign" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                                                <AnimatedIcon icon={Play} size={16} animation="pop" />
                                            </button>
                                        )}
                                        {onInspect && (
                                            <button onClick={() => onInspect(campaign.campaignId)} aria-label="Inspect campaign" title="Inspect campaign" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                                                <AnimatedIcon icon={ExternalLink} size={16} animation="pop" />
                                            </button>
                                        )}
                                        {onArchive && (
                                            <button onClick={() => onArchive(campaign.campaignId)} aria-label="Archive campaign" title="Archive campaign" className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                                                <AnimatedIcon icon={Archive} size={16} animation="pop" />
                                            </button>
                                        )}
                                    </div>
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
