import React from 'react';
import { Plus, Rocket, Diamond, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTIONS = [
    { icon: Plus, label: 'New Listing', description: 'List your app for sale', color: 'bg-blue-500', path: '/listings/new' },
    { icon: Rocket, label: 'Launch Campaign', description: 'Start a funding campaign', color: 'bg-purple-500', path: '/campaigns/new' },
    { icon: Diamond, label: 'Sell Stake', description: 'Offer equity to investors', color: 'bg-emerald-500', path: '/listings/new' },
    { icon: Users, label: 'Invite Co-founder', description: 'Add team members', color: 'bg-orange-500', path: '/apps' },
];

export const QuickActions: React.FC = () => {
    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-foreground">Quick Actions</h3>
                <Link to="/dashboard" className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                    View All <ArrowRight size={14} />
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {ACTIONS.map((action, i) => {
                    const Icon = action.icon;
                    return (
                        <Link
                            key={i}
                            to={action.path}
                            className="p-4 rounded-xl bg-muted hover:bg-muted/70 transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}
                                >
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{action.label}</p>
                                    <p className="text-xs text-muted-foreground">{action.description}</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
