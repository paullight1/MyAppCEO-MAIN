import React, { useState } from 'react';
import { 
    X, 
    ChevronRight, 
    ChevronLeft, 
    Zap, 
    Clock, 
    TrendingDown, 
    Play,
    Target,
    DollarSign,
    Users,
    Rocket,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TriggerType, 
    ActionType, 
    Frequency, 
    TriggerConfig, 
    ActionConfig,
    CreateRulePayload 
} from '../hooks/usePromotionBudget';

interface CreateRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateRulePayload) => void;
    isLoading?: boolean;
}

const TRIGGER_OPTIONS: { type: TriggerType; label: string; description: string; icon: React.ReactNode }[] = [
    { type: 'traffic_threshold', label: 'Low Traffic', description: 'When app traffic drops below threshold', icon: <TrendingDown size={20} /> },
    { type: 'scheduled', label: 'Scheduled', description: 'At a specific time or day', icon: <Clock size={20} /> },
    { type: 'performance', label: 'Performance', description: 'When ROI or conversion is low', icon: <Target size={20} /> },
    { type: 'manual', label: 'Manual', description: 'Trigger manually when needed', icon: <Play size={20} /> },
];

const ACTION_OPTIONS: { type: ActionType; label: string; description: string; icon: React.ReactNode }[] = [
    { type: 'hire_creator', label: 'Hire Creator', description: 'Automatically hire a UGC creator', icon: <Users size={20} /> },
    { type: 'boost_campaign', label: 'Boost Campaign', description: 'Add budget to top campaigns', icon: <Zap size={20} /> },
    { type: 'purchase_ads', label: 'Buy Ad Space', description: 'Purchase featured listings', icon: <Rocket size={20} /> },
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const FREQUENCIES: { value: Frequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'once', label: 'Once' },
];

export const CreateRuleModal: React.FC<CreateRuleModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        triggerType: 'traffic_threshold' as TriggerType,
        triggerParams: {} as Record<string, any>,
        actionType: 'hire_creator' as ActionType,
        actionParams: {} as Record<string, any>,
        frequency: 'weekly' as Frequency,
    });

    const totalSteps = 4;

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = () => {
        const trigger: TriggerConfig = { type: formData.triggerType, ...formData.triggerParams };
        const action: ActionConfig = { type: formData.actionType, ...formData.actionParams };
        
        onSubmit({
            name: formData.name,
            trigger,
            action,
            frequency: formData.frequency,
        });
        
        setStep(1);
        setFormData({
            name: '',
            triggerType: 'traffic_threshold',
            triggerParams: {},
            actionType: 'hire_creator',
            actionParams: {},
            frequency: 'weekly',
        });
    };

    const updateTriggerParams = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            triggerParams: { ...prev.triggerParams, [key]: value }
        }));
    };

    const updateActionParams = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            actionParams: { ...prev.actionParams, [key]: value }
        }));
    };

    if (!isOpen) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Create Auto-Promotion Rule</h3>
                        <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-accent rounded-full transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Name */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">Rule Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Low Traffic Auto-Hire"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">Frequency</label>
                                    <div className="flex flex-wrap gap-2">
                                        {FREQUENCIES.map(freq => (
                                            <button
                                                key={freq.value}
                                                onClick={() => setFormData(prev => ({ ...prev, frequency: freq.value }))}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    formData.frequency === freq.value
                                                    ? 'bg-accent text-white'
                                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {freq.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Trigger */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-3 block">When should this rule trigger?</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {TRIGGER_OPTIONS.map(option => (
                                            <button
                                                key={option.type}
                                                onClick={() => setFormData(prev => ({ ...prev, triggerType: option.type }))}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                    formData.triggerType === option.type
                                                    ? 'border-accent bg-accent/5'
                                                    : 'border-border hover:border-accent/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                        formData.triggerType === option.type ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                        {option.icon}
                                                    </div>
                                                    <span className="font-bold text-foreground">{option.label}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Trigger-specific params */}
                                {formData.triggerType === 'traffic_threshold' && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric</label>
                                            <select
                                                value={formData.triggerParams.metric || 'daily_visitors'}
                                                onChange={(e) => updateTriggerParams('metric', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            >
                                                <option value="daily_visitors">Daily Visitors</option>
                                                <option value="page_views">Page Views</option>
                                                <option value="conversion_rate">Conversion Rate</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Operator</label>
                                            <select
                                                value={formData.triggerParams.operator || 'lt'}
                                                onChange={(e) => updateTriggerParams('operator', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            >
                                                <option value="lt">Less than</option>
                                                <option value="gt">Greater than</option>
                                                <option value="eq">Equals</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Value</label>
                                            <input
                                                type="number"
                                                value={formData.triggerParams.value || 100}
                                                onChange={(e) => updateTriggerParams('value', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.triggerType === 'scheduled' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Day of Week</label>
                                            <select
                                                value={formData.triggerParams.dayOfWeek || 'monday'}
                                                onChange={(e) => updateTriggerParams('dayOfWeek', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground capitalize"
                                            >
                                                {DAYS_OF_WEEK.map(day => (
                                                    <option key={day} value={day}>{day}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Time</label>
                                            <input
                                                type="time"
                                                value={formData.triggerParams.time || '09:00'}
                                                onChange={(e) => updateTriggerParams('time', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.triggerType === 'performance' && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric</label>
                                            <select
                                                value={formData.triggerParams.metric || 'roi'}
                                                onChange={(e) => updateTriggerParams('metric', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            >
                                                <option value="roi">ROI</option>
                                                <option value="conversion_rate">Conversion Rate</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Operator</label>
                                            <select
                                                value={formData.triggerParams.operator || 'lt'}
                                                onChange={(e) => updateTriggerParams('operator', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            >
                                                <option value="lt">Less than</option>
                                                <option value="gt">Greater than</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Value</label>
                                            <input
                                                type="number"
                                                value={formData.triggerParams.value || 2}
                                                onChange={(e) => updateTriggerParams('value', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 3: Action */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-3 block">What action should be taken?</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {ACTION_OPTIONS.map(option => (
                                            <button
                                                key={option.type}
                                                onClick={() => setFormData(prev => ({ ...prev, actionType: option.type }))}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                    formData.actionType === option.type
                                                    ? 'border-accent bg-accent/5'
                                                    : 'border-border hover:border-accent/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                        formData.actionType === option.type ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                        {option.icon}
                                                    </div>
                                                    <span className="font-bold text-foreground">{option.label}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Action-specific params */}
                                {formData.actionType === 'hire_creator' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Budget ($)</label>
                                            <input
                                                type="number"
                                                value={formData.actionParams.minBudget || 50}
                                                onChange={(e) => updateActionParams('minBudget', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Budget ($)</label>
                                            <input
                                                type="number"
                                                value={formData.actionParams.maxBudget || 150}
                                                onChange={(e) => updateActionParams('maxBudget', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.actionType === 'boost_campaign' && (
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Boost Amount ($)</label>
                                        <input
                                            type="number"
                                            value={formData.actionParams.amount || 25}
                                            onChange={(e) => updateActionParams('amount', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                        />
                                    </div>
                                )}

                                {formData.actionType === 'purchase_ads' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                                            <select
                                                value={formData.actionParams.category || 'homepage'}
                                                onChange={(e) => updateActionParams('category', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            >
                                                <option value="homepage">Homepage</option>
                                                <option value="search">Search</option>
                                                <option value="newsletter">Newsletter</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration</label>
                                            <select
                                                value={formData.actionParams.duration || '7d'}
                                                onChange={(e) => updateActionParams('duration', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground"
                                            >
                                                <option value="3d">3 Days</option>
                                                <option value="7d">7 Days</option>
                                                <option value="14d">14 Days</option>
                                                <option value="30d">30 Days</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 4: Review */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-emerald-800">Rule Ready</p>
                                            <p className="text-sm text-emerald-700">This rule will automatically execute within your budget limits.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-border">
                                        <span className="text-muted-foreground">Rule Name</span>
                                        <span className="font-bold text-foreground">{formData.name || 'Unnamed Rule'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border">
                                        <span className="text-muted-foreground">Frequency</span>
                                        <span className="font-bold text-foreground capitalize">{formData.frequency}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border">
                                        <span className="text-muted-foreground">Trigger</span>
                                        <span className="font-bold text-foreground capitalize">{formData.triggerType.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border">
                                        <span className="text-muted-foreground">Action</span>
                                        <span className="font-bold text-foreground capitalize">{formData.actionType.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-between">
                    <button
                        onClick={step === 1 ? onClose : handleBack}
                        className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                    >
                        {step === 1 ? 'Cancel' : <><ChevronLeft size={18} /> Back</>}
                    </button>
                    {step < totalSteps ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 1 && !formData.name}
                            className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Creating...' : 'Create Rule'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};