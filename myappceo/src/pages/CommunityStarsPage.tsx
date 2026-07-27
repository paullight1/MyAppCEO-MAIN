import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { ArrowLeft, Crown, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCommunity, CommunityUserStats } from '../hooks/useCommunity';
import { LoadingState, EmptyState } from '../components/ui';
import { getRankMeta, getReputationLevel, REPUTATION_RULES, VerifiedBadge } from '../utils/community';

export const CommunityStarsPage: React.FC = () => {
    const { getCommunityStars, isLoading } = useCommunity();
    const [stars, setStars] = useState<CommunityUserStats[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setError(null);
        try {
            const data = await getCommunityStars();
            setStars(data);
        } catch (err) {
            console.error('Failed to load stars:', err);
            setError('We could not load the leaderboard. Please try again.');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Community
                </Link>

                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mb-4">
                        <Crown size={40} className="text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Community Stars</h1>
                    <p className="text-muted-foreground">Top contributors in our community</p>
                </div>

                {isLoading && stars.length === 0 ? (
                    <LoadingState title="Loading leaderboard" />
                ) : stars.length === 0 ? (
                    <EmptyState
                        icon={Star}
                        title="No stars yet"
                        description="Be the first to earn reputation points!"
                        action={{ label: 'Start Participating', href: '/community' }}
                    />
                ) : (
                    <div className="space-y-4">
                        {stars.map((stat, index) => {
                            const rank = index + 1;
                            const { Icon: RankIcon, color: rankColor, bg: rankBg } = getRankMeta(rank);
                            const level = getReputationLevel(stat.reputation);

                            return (
                                <motion.div
                                    key={stat.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link
                                        to={`/community/profile/${stat.userId}`}
                                        className="block bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-12 h-12 rounded-xl ${rankBg} flex items-center justify-center flex-shrink-0`}>
                                                {rank <= 3 ? (
                                                    <RankIcon size={24} className={rankColor} aria-hidden="true" />
                                                ) : (
                                                    <span className={`text-lg font-bold ${rankColor}`}>{rank}</span>
                                                )}
                                            </div>

                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                                {stat.user?.fullName?.[0] || '?'}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h2 className="font-bold text-foreground truncate">{stat.user?.fullName || 'Unknown'}</h2>
                                                    {stat.isVerified && <VerifiedBadge />}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs font-bold ${level.color}`}>{level.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {stat.topicsCount} topics · {stat.postsCount} replies
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <div className="text-2xl font-bold text-foreground">{stat.reputation}</div>
                                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rep</div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                <div className="bg-gradient-to-r from-primary/10 to-violet-600/10 border border-primary/20 rounded-2xl p-6">
                    <h2 className="font-bold text-foreground mb-2">How to become a Community Star?</h2>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {REPUTATION_RULES.map((rule) => (
                            <li key={rule.label} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" aria-hidden="true" />
                                {rule.label}: <strong className="text-foreground">+{rule.points} points</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </DashboardLayout>
    );
};
