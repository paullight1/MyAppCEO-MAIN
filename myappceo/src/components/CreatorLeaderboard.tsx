import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, ChevronRight, Trophy } from 'lucide-react';
import { CreatorPerformance } from '../hooks/usePromotionAnalytics';

const RANK_STYLES: Record<number, string> = {
    0: 'bg-amber-400/20 text-amber-600 dark:text-amber-400',
    1: 'bg-slate-400/20 text-slate-600 dark:text-slate-300',
    2: 'bg-orange-400/20 text-orange-600 dark:text-orange-400',
};

interface CreatorLeaderboardProps {
    creators: CreatorPerformance[];
    onViewAll?: () => void;
}

export const CreatorLeaderboard: React.FC<CreatorLeaderboardProps> = ({ creators, onViewAll }) => {
    const sortedCreators = [...creators].sort((a, b) => b.conversions - a.conversions).slice(0, 5);

    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-foreground">Top Performing Creators</h3>
                {onViewAll && (
                    <button onClick={onViewAll} className="text-sm font-medium text-accent hover:underline flex items-center gap-1">
                        View All <ChevronRight size={14} />
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {sortedCreators.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                        <p className="text-sm font-bold text-foreground">No creator performance yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Creator results will appear after live promotion analytics are connected.
                        </p>
                    </div>
                ) : sortedCreators.map((creator, index) => (
                    <motion.div
                        key={creator.creatorId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors"
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${RANK_STYLES[index] || 'bg-muted text-muted-foreground'}`}>
                            {index === 0 ? <Trophy size={16} aria-label="Rank 1" /> : index + 1}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center text-white font-bold">
                            {creator.creatorName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground truncate">@{creator.username}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Users size={12} /> {creator.contentPieces} pieces
                                </span>
                                <span className="flex items-center gap-1">
                                    <TrendingUp size={12} /> {creator.reach.toLocaleString()} reach
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-foreground">{creator.conversions} conv</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">${creator.revenue.toLocaleString()} rev</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
