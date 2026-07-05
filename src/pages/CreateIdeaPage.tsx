import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    Lightbulb,
    Users,
    Smartphone,
    Globe,
    Monitor,
    Layers,
    Sparkles,
    CheckCircle2,
    Loader2,
    Plus,
    Trash2,
    Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeas, Feature } from '../hooks/useIdeas';
import {
    isPotentialDuplicateIdea,
    normalizeIdeaPayload,
    validateIdeaInput,
} from '../utils/ideaLifecycle';
import { Button, FormField } from '../components/ui';

const CATEGORIES = [
    { id: 'mobile_app', name: 'Mobile App', icon: Smartphone, description: 'iOS, Android, or cross-platform' },
    { id: 'web_app', name: 'Web App', icon: Globe, description: 'Browser-based application' },
    { id: 'saas', name: 'SaaS', icon: Layers, description: 'Software as a Service' },
    { id: 'marketplace', name: 'Marketplace', icon: Users, description: 'Two-sided marketplace' },
    { id: 'social', name: 'Social App', icon: Users, description: 'Social networking app' },
    { id: 'ai_product', name: 'AI Product', icon: Sparkles, description: 'AI-powered application' },
    { id: 'game', name: 'Game', icon: Monitor, description: 'Mobile or web game' },
    { id: 'productivity', name: 'Productivity', icon: CheckCircle2, description: 'Utility or productivity' },
    { id: 'other', name: 'Other', icon: Lightbulb, description: 'Something unique' },
];

const PLATFORMS = [
    { id: 'mobile', name: 'Mobile', description: 'iOS & Android' },
    { id: 'web', name: 'Web', description: 'Browser-based' },
    { id: 'desktop', name: 'Desktop', description: 'Windows, Mac' },
    { id: 'cross_platform', name: 'Cross-Platform', description: 'Works everywhere' },
];

const PRIORITY_OPTIONS = [
    { id: 'must_have', label: 'Must Have', color: 'bg-destructive/10 text-destructive border-destructive/20' },
    { id: 'should_have', label: 'Should Have', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    { id: 'nice_to_have', label: 'Nice to Have', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
];

const STEP_LABELS = ['Basic Info', 'Category', 'Features', 'Review'];

const inputClasses =
    'w-full px-4 py-3 bg-muted border border-border text-foreground rounded-xl placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none transition-all';

export const CreateIdeaPage: React.FC = () => {
    const [step, setStep] = useState(1);
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'mobile_app',
        platform: 'mobile',
        targetAudience: '',
        features: [] as Feature[],
    });
    const [newFeature, setNewFeature] = useState({ name: '', description: '', priority: 'must_have' as const });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

    const navigate = useNavigate();
    const { createIdea, getMyIdeas, isLoading } = useIdeas();
    const isOnboardingRequest = searchParams.get('source') === 'onboarding';

    const handleNext = () => {
        const validation = validateIdeaInput(formData);
        setValidationErrors(validation.errors);
        if (step === 1 && (validation.errors.title || validation.errors.description)) return;
        if (step === 2 && (validation.errors.category || validation.errors.platform)) return;
        if (step === 3 && Object.keys(validation.errors).some((key) => key.startsWith('targetAudience') || key.startsWith('features'))) return;
        if (step < 4) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        const validation = validateIdeaInput(formData);
        setValidationErrors(validation.errors);
        if (!validation.valid) {
            setSubmitError(Object.values(validation.errors)[0] || 'Please check the idea details.');
            return;
        }

        if (!duplicateConfirmed) {
            const existingResult = await getMyIdeas();
            const existingIdeas = existingResult.success && existingResult.data
                ? ((existingResult.data as any).data || existingResult.data)
                : [];
            if (isPotentialDuplicateIdea(formData, existingIdeas)) {
                setDuplicateConfirmed(true);
                setSubmitError(
                    isOnboardingRequest
                        ? 'A similar request already exists in your workspace. Click Create Request again to confirm this is intentional.'
                        : 'A similar idea already exists in your workspace. Click Create Idea again to confirm this is intentional.',
                );
                return;
            }
        }

        const result = await createIdea(normalizeIdeaPayload(formData));
        if (result.success && result.data) {
            const idea = (result.data as any).data || result.data;
            navigate(
                isOnboardingRequest
                    ? `/ideas/${idea.id}?tab=build&source=onboarding`
                    : `/ideas/${idea.id}`,
            );
        } else {
            setSubmitError(result.error || 'Failed to create idea. Please try again.');
        }
    };

    const addFeature = () => {
        if (newFeature.name && newFeature.description) {
            setFormData(prev => ({
                ...prev,
                features: [...prev.features, { ...newFeature }],
            }));
            setNewFeature({ name: '', description: '', priority: 'must_have' });
        }
    };

    const removeFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index),
        }));
    };

    const updateForm = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setDuplicateConfirmed(false);
        setValidationErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    // Only step 1 has fields that gate progress; later steps validate on Continue/Submit.
    const canProceed =
        step === 1
            ? formData.title.trim().length >= 3 && formData.description.trim().length >= 20
            : true;

    const renderStepIndicator = () => (
        <ol className="flex items-center justify-center mb-8">
            {STEP_LABELS.map((label, index) => {
                const stepNum = index + 1;
                const isCompleted = stepNum < step;
                const isCurrent = stepNum === step;

                return (
                    <li key={stepNum} className="flex items-center">
                        <div className="flex flex-col items-center" aria-current={isCurrent ? 'step' : undefined}>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                    isCompleted
                                        ? 'bg-emerald-500 text-white'
                                        : isCurrent
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${
                                isCurrent ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                                {label}
                            </span>
                        </div>
                        {stepNum < 4 && (
                            <div
                                className={`w-16 h-0.5 mx-2 mt-[-20px] rounded ${
                                    stepNum < step ? 'bg-emerald-500' : 'bg-border'
                                }`}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );

    const renderStep1 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">What's your app idea?</h2>
                <p className="text-muted-foreground mt-2">Describe your vision and we'll help bring it to life</p>
            </div>

            <FormField
                label="App Name"
                required
                helperText="Give your app a memorable name"
                error={validationErrors.title}
            >
                {(field) => (
                    <input
                        {...field}
                        type="text"
                        value={formData.title}
                        onChange={(e) => updateForm('title', e.target.value)}
                        placeholder="e.g., TaskMaster Pro"
                        className={inputClasses}
                    />
                )}
            </FormField>

            <FormField
                label="Description"
                required
                error={validationErrors.description}
            >
                {(field) => (
                    <>
                        <textarea
                            {...field}
                            value={formData.description}
                            onChange={(e) => updateForm('description', e.target.value)}
                            placeholder="Describe what your app does, the problem it solves, and who it's for..."
                            rows={5}
                            className={`${inputClasses} resize-none`}
                        />
                        <div className="flex justify-between">
                            <p className="text-xs text-muted-foreground">Minimum 20 characters</p>
                            <p className={`text-xs ${formData.description.length >= 20 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                {formData.description.length} characters
                            </p>
                        </div>
                    </>
                )}
            </FormField>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
        >
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Category & Platform</h2>
                <p className="text-muted-foreground mt-2">Help us understand what you're building</p>
            </div>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-4">
                    What type of app is this?
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = formData.category === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => updateForm('category', cat.id)}
                                className={`p-4 rounded-xl text-left border transition-all ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                                        : 'bg-muted border-border hover:bg-muted/70'
                                }`}
                            >
                                <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className="font-semibold text-sm text-foreground">
                                    {cat.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-4">
                    Which platform?
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {PLATFORMS.map((plat) => {
                        const isSelected = formData.platform === plat.id;
                        return (
                            <button
                                key={plat.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => updateForm('platform', plat.id)}
                                className={`p-4 rounded-xl text-center border transition-all ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                                        : 'bg-muted border-border hover:bg-muted/70'
                                }`}
                            >
                                <p className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {plat.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{plat.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Features & Audience</h2>
                <p className="text-muted-foreground mt-2">Define key features and who will use your app</p>
            </div>

            <FormField label="Target Audience" error={validationErrors.targetAudience}>
                {(field) => (
                    <textarea
                        {...field}
                        value={formData.targetAudience}
                        onChange={(e) => updateForm('targetAudience', e.target.value)}
                        placeholder="e.g., Busy professionals aged 25-45 who need help managing daily tasks..."
                        rows={3}
                        className={`${inputClasses} resize-none`}
                    />
                )}
            </FormField>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    Key Features ({formData.features.length} added)
                </label>

                {formData.features.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {formData.features.map((feature, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-muted border border-border rounded-xl group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground">{feature.name}</p>
                                        <span className={`px-2 py-0.5 rounded text-xs border ${
                                            PRIORITY_OPTIONS.find(p => p.id === feature.priority)?.color
                                        }`}>
                                            {PRIORITY_OPTIONS.find(p => p.id === feature.priority)?.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 truncate">{feature.description}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFeature(index)}
                                    aria-label={`Remove feature ${feature.name}`}
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-4 bg-muted border border-border rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={newFeature.name}
                            onChange={(e) => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Feature name"
                            aria-label="Feature name"
                            className="px-3 py-2.5 bg-card border border-border text-foreground rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                        />
                        <div className="flex gap-2">
                            {PRIORITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    aria-pressed={newFeature.priority === opt.id}
                                    onClick={() => setNewFeature(prev => ({ ...prev, priority: opt.id as any }))}
                                    className={`flex-1 px-2 py-1 rounded text-xs font-medium border transition-all ${
                                        newFeature.priority === opt.id ? opt.color : 'bg-card border-border text-muted-foreground'
                                    }`}
                                >
                                    {opt.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <input
                        type="text"
                        value={newFeature.description}
                        onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this feature"
                        aria-label="Feature description"
                        className="w-full px-3 py-2.5 bg-card border border-border text-foreground rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                    />
                    <Button
                        onClick={addFeature}
                        disabled={!newFeature.name || !newFeature.description}
                        className="w-full"
                    >
                        <Plus className="w-4 h-4" />
                        Add Feature
                    </Button>
                </div>
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                    {isOnboardingRequest ? 'Ready to Submit!' : 'Ready to Create!'}
                </h2>
                <p className="text-muted-foreground mt-2">
                    {isOnboardingRequest ? 'Review your request before sending it into the build flow' : 'Review your idea before submitting'}
                </p>
            </div>

            <div className="bg-muted border border-border rounded-2xl p-6 space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">App Name</p>
                        <p className="text-lg font-bold text-foreground mt-1">{formData.title}</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {CATEGORIES.find(c => c.id === formData.category)?.name}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Platform</p>
                        <p className="text-foreground font-medium mt-1">
                            {PLATFORMS.find(p => p.id === formData.platform)?.name}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Features</p>
                        <p className="text-foreground font-medium mt-1">{formData.features.length} defined</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Description</p>
                    <p className="text-foreground text-sm leading-relaxed">{formData.description}</p>
                </div>

                {formData.targetAudience && (
                    <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Target Audience</p>
                        <p className="text-foreground text-sm">{formData.targetAudience}</p>
                    </div>
                )}

                {formData.features.length > 0 && (
                    <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Key Features</p>
                        <div className="flex flex-wrap gap-2">
                            {formData.features.slice(0, 5).map((f, i) => (
                                <span key={i} className="px-3 py-1 bg-card border border-border rounded-full text-xs font-medium text-foreground">
                                    {f.name}
                                </span>
                            ))}
                            {formData.features.length > 5 && (
                                <span className="px-3 py-1 bg-card border border-border rounded-full text-xs font-medium text-muted-foreground">
                                    +{formData.features.length - 5} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-foreground">
                    <p className="font-semibold">What happens next?</p>
                    <p className="text-muted-foreground mt-1">
                        We'll generate a detailed PRD, design mockups, and cost estimate for your idea using AI.
                        {isOnboardingRequest && ' Then the build tab opens so you can submit the app review into the admin queue.'}
                    </p>
                </div>
            </div>

            {submitError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm" role="alert">
                    {submitError}
                </div>
            )}
        </motion.div>
    );

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto py-8">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
                    {renderStepIndicator()}

                    <form onSubmit={(e) => e.preventDefault()}>
                        <AnimatePresence mode="wait">
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}
                            {step === 4 && renderStep4()}
                        </AnimatePresence>

                        <div className="flex items-center justify-between mt-8 pt-6">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-6 py-2.5 text-muted-foreground hover:text-foreground font-medium"
                                >
                                    Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 4 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={!canProceed}
                                    size="lg"
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    size="lg"
                                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {isOnboardingRequest ? 'Creating request...' : 'Creating...'}
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb className="w-4 h-4" />
                                            {isOnboardingRequest ? 'Create Request' : 'Create Idea'}
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
};
