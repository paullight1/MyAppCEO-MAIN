import React from 'react';
import { 
    Play, 
    Pause, 
    Trash2, 
    Clock, 
    TrendingDown, 
    Target, 
    Zap,
    Users,
    Rocket,
    MoreHorizontal
} from 'lucide-react';
import { AutoPromotionRule, RuleStatus, TriggerType, ActionType } from '../hooks/usePromotionBudget';

interface RuleCardProps {
    rule: AutoPromotionRule;
    onToggle: (id: string, status: RuleStatus) => void;
    onDelete: (id: string) => void;
}

const TRIGGER_ICONS: Record<TriggerType, React.ReactNode> = {
    traffic_threshold: <TrendingDown size={16} />,
    scheduled: <Clock size={16} />,
    performance: <Target size={16} />,
    manual: <Play size={16} />,
};

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
    hire_creator: <Users size={16} />,
    boost_campaign: <Zap size={16} />,
    purchase_ads: <Rocket size={16} />,
    featured_slot: <Rocket size={16} />,
};

const formatTriggerDescription = (rule: AutoPromotionRule): string => {
    const { trigger } = rule;
    switch (trigger.type) {
        case 'traffic_threshold':
            return `When ${trigger.metric?.replace('_', ' ')} is ${trigger.operator === 'lt' ? 'less than' : trigger.operator === 'gt' ? 'greater than' : 'equals'} ${trigger.value}`;
        case 'scheduled':
            return `Every ${trigger.dayOfWeek} at ${trigger.time}`;
        case 'performance':
            return `When ${trigger.metric} is ${trigger.operator === 'lt' ? 'below' : 'above'} ${trigger.value} over ${trigger.period}`;
        case 'manual':
            return 'Triggered manually';
        default:
            return 'Custom trigger';
    }
};

const formatActionDescription = (rule: AutoPromotionRule): string => {
    const { action } = rule;
    switch (action.type) {
        case 'hire_creator':
            return `Hire creator ($${action.minBudget}-$${action.maxBudget})`;
        case 'boost_campaign':
            return `Boost by $${action.amount}`;
        case 'purchase_ads':
            return `${action.category} - ${action.duration}`;
        case 'featured_slot':
            return `Featured slot - ${action.duration}`;
        default:
            return 'Custom action';
    }
};

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onToggle, onDelete }) => {
    return (
        <div className="bg-card border border-border rounded-2xl p-5 hover:border-accent/30 transition-all group">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            rule.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                            {rule.status === 'active' ? <Zap size={20} /> : <Pause size={20} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground">{rule.name}</h4>
                            <span className={`text-xs font-medium ${
                                rule.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                                {rule.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                {TRIGGER_ICONS[rule.trigger.type]}
                            </div>
                            <span className="text-muted-foreground">
                                {formatTriggerDescription(rule)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                {ACTION_ICONS[rule.action.type]}
                            </div>
                            <span className="text-muted-foreground">
                                {formatActionDescription(rule)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <span className="capitalize">{rule.frequency}</span>
                        {rule.lastTriggered && (
                            <span>Last triggered: {new Date(rule.lastTriggered).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onToggle(rule.id, rule.status === 'active' ? 'paused' : 'active')}
                        className={`p-2.5 rounded-xl transition-colors ${
                            rule.status === 'active'
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title={rule.status === 'active' ? 'Pause' : 'Activate'}
                    >
                        {rule.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                        onClick={() => onDelete(rule.id)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};