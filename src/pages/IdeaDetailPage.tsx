import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Lightbulb,
    FileText,
    Palette,
    DollarSign,
    Loader2,
    CheckCircle2,
    Smartphone,
    Tablet,
    Monitor,
    Sparkles,
    AlertCircle,
    ArrowRight,
    Share2,
    Maximize2,
    ClipboardList,
    Code2,
    ShieldCheck,
    RefreshCw,
    Archive,
    Trash2,
    Rocket,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useIdeas, Idea, DesignMockup, PRDDocument, CostEstimate } from '../hooks/useIdeas';
import { useGenerationArtifacts, GeneratedArtifact } from '../hooks/useGenerationArtifacts';
import { ShareIdeaModal } from '../components/modals/ShareIdeaModal';
import { DesignLightbox } from '../components/modals/DesignLightbox';
import { IDEA_STATUS } from '../utils/ideaLifecycle';
import { Button, EmptyState, LoadingState } from '../components/ui';
import { getStatusBadge, getCategoryLabel, getPlatformLabel, getIdeaCompletion } from '../utils/ideaPresentation';
import { formatCurrency } from '../utils/format';

export const IdeaDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isOnboardingSource = searchParams.get('source') === 'onboarding';
    const reviewSubmissionType = isOnboardingSource ? 'app_submission' : 'generated_code';
    const { getIdeaById, generatePRD, generateDesigns, estimateCost, archiveIdea, deleteIdea, convertToApp } = useIdeas();
    const {
        artifacts,
        latestBuildPlan,
        latestCodeArtifact,
        latestQualityReport,
        latestSubmission,
        isLoading: artifactsLoading,
        isMutating: generationMutating,
        error: generationError,
        loadArtifacts,
        createBuildPlan,
        generateCode,
        submitForReview,
    } = useGenerationArtifacts(id);

    const [idea, setIdea] = useState<Idea | null>(null);
    const [converting, setConverting] = useState(false);
    const [prd, setPrd] = useState<PRDDocument | null>(null);
    const [mockups, setMockups] = useState<DesignMockup[]>([]);
    const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'prd' | 'designs' | 'estimate' | 'build'>(
        searchParams.get('tab') === 'build' ? 'build' : 'overview',
    );
    const [selectedDevice, setSelectedDevice] = useState<'phone' | 'tablet' | 'web'>('phone');
    const [generating, setGenerating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        loadIdea();
    }, [id]);

    const loadIdea = async () => {
        if (!id) return;
        setLoading(true);
        const result = await getIdeaById(id);
        if (result.success && result.data) {
            const ideaData = (result.data as any).data || result.data;
            setIdea(ideaData);
            
            if (ideaData.prdDocument) {
                setPrd(ideaData.prdDocument);
            }
            if (ideaData.designMockups) {
                setMockups(ideaData.designMockups);
            }
            if (ideaData.costBreakdown) {
                setCostEstimate({
                    totalEstimate: ideaData.costEstimate || 0,
                    currency: 'USD',
                    timelineWeeks: ideaData.timelineWeeks || 12,
                    breakdown: ideaData.costBreakdown,
                    assumptions: [],
                    risks: [],
                });
            }
        }
        setLoading(false);
    };

    const handleGeneratePRD = async () => {
        if (!id) return;
        setGenerating('prd');
        setError(null);
        try {
            const result = await generatePRD(id);
            if (result.success && result.data) {
                setPrd((result.data as any).prd || result.data);
                await loadIdea();
            } else {
                setError('Failed to generate PRD. Please try again.');
            }
        } catch (e) {
            setError('Failed to generate PRD. Please try again.');
        }
        setGenerating(null);
    };

    const handleCreateBuildPlan = async () => {
        setError(null);
        const result = await createBuildPlan('Create an implementation-ready plan from the current PRD, designs, and cost constraints.');
        if (!result?.artifact) {
            setError('Failed to create build plan. Confirm the PRD is generated and try again.');
            return;
        }
        await loadArtifacts();
    };

    const handleGenerateCode = async () => {
        setError(null);
        const result = await generateCode('Generate a frontend-first scaffold with file map, verification commands, and review notes.');
        if (!result?.artifact) {
            setError('Failed to generate code scaffold. Create a build plan first, then try again.');
            return;
        }
        await loadArtifacts();
    };

    const handleSubmitCodeReview = async () => {
        setError(null);
        const result = await submitForReview({
            artifactId: latestCodeArtifact?.id,
            qualityReportId: latestQualityReport?.id,
            itemType: reviewSubmissionType,
        });
        if (!result) {
            setError(
                isOnboardingSource
                    ? 'Failed to submit the app request for review. Generate a code scaffold first.'
                    : 'Failed to submit code for review. Generate a code scaffold first.',
            );
        }
    };

    const handleGenerateDesigns = async () => {
        if (!id) return;
        setGenerating('designs');
        setError(null);
        try {
            const result = await generateDesigns(id, {
                style: 'modern',
                deviceTypes: ['phone', 'web'],
            });
            if (result.success && result.data) {
                setMockups((result.data as any).mockups || []);
                await loadIdea();
            } else {
                setError('Failed to generate designs. Please try again.');
            }
        } catch (e) {
            setError('Failed to generate designs. Please try again.');
        }
        setGenerating(null);
    };

    const handleEstimateCost = async () => {
        if (!id) return;
        setGenerating('estimate');
        setError(null);
        try {
            const result = await estimateCost(id, { teamLocation: 'mixed' });
            if (result.success && result.data) {
                const estimate = (result.data as any).data || result.data;
                setCostEstimate(estimate);
                await loadIdea();
            } else {
                setError('Failed to estimate cost. Please try again.');
            }
        } catch (e) {
            setError('Failed to estimate cost. Please try again.');
        }
        setGenerating(null);
    };

    const handleConvertToApp = async () => {
        if (!id || !idea) return;
        const isReconvert = idea.status === IDEA_STATUS.CONVERTED_TO_APP;
        if (!isReconvert) {
            const confirmed = window.confirm(
                'Convert this idea into an app workspace? This creates your app and moves the idea to “Converted”.',
            );
            if (!confirmed) return;
        }

        setConverting(true);
        setError(null);
        const result = await convertToApp(id);
        setConverting(false);

        const payload = result.success ? (result.data as any)?.data : null;
        const appId = payload?.app?.app_id;
        if (appId) {
            navigate(`/apps/${appId}/dashboard`);
        } else {
            setError(result.error || 'Could not convert this idea into an app. Please try again.');
        }
    };

    const handleArchiveIdea = async () => {
        if (!id || !idea) return;
        const confirmed = window.confirm('Archive this idea? It will be hidden from active idea workflows.');
        if (!confirmed) return;

        const result = await archiveIdea(id);
        if (result.success) {
            await loadIdea();
        } else {
            setError(result.error || 'Failed to archive idea.');
        }
    };

    const handleDeleteIdea = async () => {
        if (!id || !idea) return;
        const confirmed = window.confirm('Delete this idea permanently? This cannot be undone.');
        if (!confirmed) return;

        const result = await deleteIdea(id);
        if (result.success) {
            navigate('/my-ideas');
        } else {
            setError(result.error || 'Failed to delete idea.');
        }
    };

    const getStatusProgress = () => {
        if (!idea) return 0;
        const statusOrder = [
            IDEA_STATUS.DRAFT,
            IDEA_STATUS.PRD_GENERATED,
            IDEA_STATUS.DESIGN_COMPLETE,
            IDEA_STATUS.READY_FOR_FUNDING,
            IDEA_STATUS.SUBMITTED_FOR_FUNDING,
            IDEA_STATUS.CONVERTED_TO_APP,
        ];
        if (idea.status === IDEA_STATUS.ARCHIVED) return 0;
        const index = statusOrder.indexOf(idea.status as any);
        return index >= 0 ? (index / (statusOrder.length - 1)) * 100 : 0;
    };
    const workflowSteps = idea ? getIdeaCompletion(idea).steps : [];

    const filteredMockups = mockups.filter(m => m.screenType === selectedDevice);
    const previewArtifactContent = (artifact: GeneratedArtifact) => {
        if (!artifact.content) return 'No content captured yet.';
        const text = typeof artifact.content === 'string'
            ? artifact.content
            : JSON.stringify(artifact.content, null, 2);
        return text.length > 520 ? `${text.slice(0, 520)}...` : text;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto py-8">
                    <LoadingState title="Loading your idea..." className="min-h-[50vh]" />
                </div>
            </DashboardLayout>
        );
    }

    if (!idea) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto py-8">
                    <EmptyState
                        icon={AlertCircle}
                        size="lg"
                        title="Idea not found"
                        description="This idea may have been deleted or doesn't exist."
                        action={{ label: 'Back to My Ideas', href: '/my-ideas', icon: ArrowLeft }}
                    />
                </div>
            </DashboardLayout>
        );
    }

    const statusBadge = getStatusBadge(idea.status);

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Ideas
                </button>

                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.className}`}>
                                        {statusBadge.label}
                                    </span>
                                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                                        {getCategoryLabel(idea.category)}
                                    </span>
                                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                                        {getPlatformLabel(idea.platform)}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-bold text-foreground">{idea.title}</h1>
                                <p className="text-muted-foreground mt-2 max-w-2xl">{idea.description}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {idea.status === 'ready_for_funding' && (
                                    <Link
                                        to={`/campaigns/new?ideaId=${idea.id}`}
                                        className="px-6 py-2.5 bg-success text-white rounded-lg hover:bg-success/90 inline-flex items-center gap-2 font-medium text-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-success/30"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Start Crowdfunding
                                    </Link>
                                )}
                                {(idea.status === IDEA_STATUS.READY_FOR_FUNDING ||
                                    idea.status === IDEA_STATUS.SUBMITTED_FOR_FUNDING) && (
                                    <Button onClick={handleConvertToApp} disabled={converting}>
                                        {converting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Rocket className="w-4 h-4" />
                                        )}
                                        {converting ? 'Converting…' : 'Convert to App'}
                                    </Button>
                                )}
                                {idea.status === IDEA_STATUS.CONVERTED_TO_APP && (
                                    <Button onClick={handleConvertToApp} disabled={converting}>
                                        {converting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4" />
                                        )}
                                        Open App Workspace
                                    </Button>
                                )}
                                <Button variant="secondary" onClick={() => setShowShareModal(true)}>
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </Button>
                                {idea.status !== IDEA_STATUS.ARCHIVED && (
                                    <Button variant="secondary" onClick={handleArchiveIdea}>
                                        <Archive className="w-4 h-4" />
                                        Archive
                                    </Button>
                                )}
                                <Button variant="destructive" onClick={handleDeleteIdea}>
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/30 border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-accent rounded-full transition-all duration-500"
                                    style={{ width: `${getStatusProgress()}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">
                                {Math.round(getStatusProgress())}% Complete
                            </span>
                        </div>
                        <div className="flex items-center gap-6 mt-3 text-xs">
                            {workflowSteps.map((step, i) => (
                                <div key={step.key} className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                        step.done ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {step.done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                                    </div>
                                    <span className={step.done ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div role="tablist" aria-label="Idea sections" className="flex border-b border-border overflow-x-auto">
                        {[
                            { id: 'overview', label: 'Overview', icon: Lightbulb },
                            { id: 'prd', label: 'PRD', icon: FileText, badge: prd ? '✓' : undefined },
                            { id: 'designs', label: 'Designs', icon: Palette, badge: mockups.length > 0 ? mockups.length.toString() : undefined },
                            { id: 'estimate', label: 'Estimate', icon: DollarSign },
                            { id: 'build', label: 'Build', icon: Code2, badge: latestCodeArtifact ? '✓' : latestBuildPlan ? '1' : undefined },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                id={`tab-${tab.id}`}
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="font-medium">{tab.label}</span>
                                {tab.badge && (
                                    <span className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs font-bold">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {error && (
                            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {generationError && (
                            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {generationError}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    role="tabpanel"
                                    id="panel-overview"
                                    aria-labelledby="tab-overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category</p>
                                            <p className="text-foreground font-bold mt-1">
                                                {getCategoryLabel(idea.category)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Platform</p>
                                            <p className="text-foreground font-bold mt-1">
                                                {getPlatformLabel(idea.platform)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Features</p>
                                            <p className="text-foreground font-bold mt-1">
                                                {idea.features?.length || 0} defined
                                            </p>
                                        </div>
                                    </div>

                                    {idea.targetAudience && (
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground mb-2">Target Audience</h3>
                                            <p className="text-muted-foreground bg-muted/30 p-4 rounded-xl">{idea.targetAudience}</p>
                                        </div>
                                    )}

                                    {idea.features && idea.features.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground mb-3">Key Features</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {idea.features.map((feature, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-semibold text-foreground text-sm">{feature.name}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {idea.status === 'draft' && (
                                        <div className="pt-4 border-t border-border">
                                            <Button onClick={handleGeneratePRD} disabled={generating === 'prd'} size="lg">
                                                {generating === 'prd' ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Generating PRD...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Generate PRD with AI
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'prd' && (
                                <motion.div
                                    key="prd"
                                    role="tabpanel"
                                    id="panel-prd"
                                    aria-labelledby="tab-prd"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {!prd ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <FileText className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground mb-2">No PRD Generated Yet</h3>
                                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                                Generate a comprehensive Product Requirements Document using AI
                                            </p>
                                            <Button onClick={handleGeneratePRD} disabled={generating === 'prd'} size="lg" className="mx-auto">
                                                {generating === 'prd' ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Generate PRD
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-foreground">Product Requirements Document</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleGeneratePRD}
                                                    disabled={generating === 'prd'}
                                                    className="text-primary hover:text-primary"
                                                >
                                                    {generating === 'prd' ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3 h-3" />
                                                    )}
                                                    Regenerate
                                                </Button>
                                            </div>

                                            <div className="p-4 bg-muted/30 rounded-xl">
                                                <h4 className="text-sm font-bold text-foreground mb-2">Executive Summary</h4>
                                                <p className="text-muted-foreground text-sm leading-relaxed">{prd.executiveSummary}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-muted/30 rounded-xl">
                                                    <h4 className="text-sm font-bold text-foreground mb-2">Problem Statement</h4>
                                                    <p className="text-muted-foreground text-sm">{prd.problemStatement}</p>
                                                </div>
                                                <div className="p-4 bg-muted/30 rounded-xl">
                                                    <h4 className="text-sm font-bold text-foreground mb-2">Proposed Solution</h4>
                                                    <p className="text-muted-foreground text-sm">{prd.proposedSolution}</p>
                                                </div>
                                            </div>

                                            {prd.features && prd.features.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-bold text-foreground mb-3">Features ({prd.features.length})</h4>
                                                    <div className="space-y-2">
                                                        {prd.features.slice(0, 6).map((feature: any, index: number) => (
                                                            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                                                    feature.priority === 'P0' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                                    feature.priority === 'P1' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                                }`}>
                                                                    {feature.priority}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-foreground text-sm">{feature.name}</p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{feature.description}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {idea.status === 'prd_generated' && (
                                                <div className="pt-4 border-t border-border">
                                                    <Button onClick={handleGenerateDesigns} disabled={generating === 'designs'} size="lg">
                                                        {generating === 'designs' ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Generating Designs...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Palette className="w-4 h-4" />
                                                                Generate Designs
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'designs' && (
                                <motion.div
                                    key="designs"
                                    role="tabpanel"
                                    id="panel-designs"
                                    aria-labelledby="tab-designs"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {mockups.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Palette className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground mb-2">No Designs Generated Yet</h3>
                                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                                {!prd ? 'Generate a PRD first, then create design mockups' : 'Generate UI mockups using AI'}
                                            </p>
                                            <Button onClick={handleGenerateDesigns} disabled={generating === 'designs' || !prd} size="lg" className="mx-auto">
                                                {generating === 'designs' ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : !prd ? (
                                                    'Generate PRD First'
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Generate Designs
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center gap-2 mb-6">
                                                {(['phone', 'tablet', 'web'] as const).map((device) => {
                                                    const icons = { phone: Smartphone, tablet: Tablet, web: Monitor };
                                                    const Icon = icons[device];
                                                    const count = mockups.filter(m => m.screenType === device).length;
                                                    return (
                                                        <button
                                                            key={device}
                                                            type="button"
                                                            aria-pressed={selectedDevice === device}
                                                            onClick={() => setSelectedDevice(device)}
                                                            disabled={count === 0}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                                                selectedDevice === device
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : count === 0
                                                                    ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                                                                    : 'bg-muted/30 text-foreground hover:bg-muted/50'
                                                            }`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                            {device.charAt(0).toUpperCase() + device.slice(1)}
                                                            {count > 0 && (
                                                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                                    selectedDevice === device ? 'bg-white/20' : 'bg-muted'
                                                                }`}>
                                                                    {count}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {filteredMockups.map((mockup, index) => (
                                                    <button
                                                        key={mockup.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setLightboxIndex(index);
                                                            setLightboxOpen(true);
                                                        }}
                                                        aria-label={`View mockup: ${mockup.screenName}`}
                                                        className="text-left bg-muted/30 rounded-xl overflow-hidden border border-border group cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                    >
                                                        <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                                                            <img
                                                                src={mockup.imageUrl}
                                                                alt={mockup.screenName}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                        <div className="p-4">
                                                            <p className="font-semibold text-foreground">{mockup.screenName}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">{mockup.screenType}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {idea.status === 'design_complete' && (
                                                <div className="pt-6 mt-6 border-t border-border">
                                                    <Button onClick={handleEstimateCost} disabled={generating === 'estimate'} size="lg">
                                                        {generating === 'estimate' ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Estimating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <DollarSign className="w-4 h-4" />
                                                                Estimate Cost
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'estimate' && (
                                <motion.div
                                    key="estimate"
                                    role="tabpanel"
                                    id="panel-estimate"
                                    aria-labelledby="tab-estimate"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {!costEstimate && !idea.costEstimate ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <DollarSign className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground mb-2">No Cost Estimate Yet</h3>
                                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                                {mockups.length === 0 ? 'Generate designs first, then calculate the estimated cost' : 'Get an AI-powered cost estimate for your project'}
                                            </p>
                                            <Button onClick={handleEstimateCost} disabled={generating === 'estimate' || mockups.length === 0} size="lg" className="mx-auto">
                                                {generating === 'estimate' ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Estimating...
                                                    </>
                                                ) : mockups.length === 0 ? (
                                                    'Generate Designs First'
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Estimate Cost
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-center mb-8 p-8 bg-gradient-to-br from-success/10 to-primary/5 rounded-2xl border border-success/20">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Estimated Investment</p>
                                                <p className="text-5xl font-bold text-foreground">
                                                    {formatCurrency((costEstimate?.totalEstimate || idea.costEstimate) || 0, { maximumFractionDigits: 0 })}
                                                </p>
                                                <p className="text-muted-foreground mt-2 text-sm">
                                                    Estimated timeline: {costEstimate?.timelineWeeks || idea.timelineWeeks || 12} weeks
                                                </p>
                                            </div>

                                            {costEstimate?.breakdown && (
                                                <div className="space-y-3 mb-8">
                                                    <h4 className="text-sm font-bold text-foreground">Cost Breakdown</h4>
                                                    <div className="space-y-2">
                                                        {costEstimate.breakdown.map((item, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                                                            >
                                                                <div>
                                                                    <p className="font-semibold text-foreground">{item.category}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {item.hours} hours @ {formatCurrency(item.rate)}/hr
                                                                    </p>
                                                                </div>
                                                                <p className="font-bold text-foreground">
                                                                    {formatCurrency(item.subtotal, { maximumFractionDigits: 0 })}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {idea.status === 'ready_for_funding' && (
                                                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
                                                    <Link
                                                        to={`/campaigns/new?ideaId=${idea.id}`}
                                                        className="flex-1 px-6 py-4 bg-success text-white rounded-xl hover:bg-success/90 flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-success/30"
                                                    >
                                                        <DollarSign className="w-5 h-5" />
                                                        Start Crowdfunding Campaign
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'build' && (
                                <motion.div
                                    key="build"
                                    role="tabpanel"
                                    id="panel-build"
                                    aria-labelledby="tab-build"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-bold text-foreground">
                                                {isOnboardingSource ? 'PRD-to-app-submission pipeline' : 'PRD-to-code pipeline'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                                                {isOnboardingSource
                                                    ? 'Turn the generated PRD into a durable build plan, create a code scaffold artifact, then submit it as an app submission for admin review.'
                                                    : 'Turn the generated PRD into a durable build plan, create a code scaffold artifact, then submit it for admin review.'}
                                            </p>
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={() => loadArtifacts()} disabled={artifactsLoading}>
                                            <RefreshCw className={`w-4 h-4 ${artifactsLoading ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </Button>
                                    </div>

                                    {isOnboardingSource && (
                                        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-foreground">
                                            <p className="font-semibold">App submission request</p>
                                            <p className="mt-1 text-muted-foreground">
                                                This request came from first-run onboarding. Keep it in draft, generate the build plan, then submit it as an app submission for admin review.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                                <ClipboardList className="w-4 h-4 text-accent" />
                                                Build plan
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 min-h-[2.5rem]">
                                                {latestBuildPlan ? `Created ${new Date(latestBuildPlan.createdAt).toLocaleString()}` : 'Requires a generated PRD.'}
                                            </p>
                                            <Button onClick={handleCreateBuildPlan} disabled={generationMutating || !prd} className="mt-4 w-full">
                                                {generationMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                                                {latestBuildPlan ? 'Regenerate Plan' : 'Create Plan'}
                                            </Button>
                                        </div>

                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                                <Code2 className="w-4 h-4 text-accent" />
                                                Code scaffold
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 min-h-[2.5rem]">
                                                {latestCodeArtifact ? `Generated ${new Date(latestCodeArtifact.createdAt).toLocaleString()}` : 'Requires a build plan artifact.'}
                                            </p>
                                            <Button onClick={handleGenerateCode} disabled={generationMutating || !latestBuildPlan} className="mt-4 w-full">
                                                {generationMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
                                                {latestCodeArtifact ? 'Regenerate Code' : 'Generate Code'}
                                            </Button>
                                        </div>

                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                                <ShieldCheck className="w-4 h-4 text-accent" />
                                                {isOnboardingSource ? 'App submission' : 'Review'}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 min-h-[2.5rem]">
                                                {latestSubmission
                                                    ? `${latestSubmission.itemType.replace(/_/g, ' ')} · ${latestSubmission.status.replace(/_/g, ' ')}`
                                                    : 'Requires a code scaffold artifact.'}
                                            </p>
                                            <Button
                                                onClick={handleSubmitCodeReview}
                                                disabled={generationMutating || !latestCodeArtifact}
                                                className="mt-4 w-full bg-success text-white hover:bg-success/90"
                                            >
                                                {generationMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                {isOnboardingSource ? 'Submit App Submission' : 'Submit Review'}
                                            </Button>
                                        </div>
                                    </div>

                                    {latestQualityReport && (
                                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <h4 className="text-sm font-bold text-foreground mb-3">Quality report</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                {[
                                                    ['Lint', latestQualityReport.lintStatus],
                                                    ['Types', latestQualityReport.typecheckStatus],
                                                    ['Tests', latestQualityReport.testStatus],
                                                    ['Security', latestQualityReport.securityStatus],
                                                    ['A11y', latestQualityReport.accessibilityStatus],
                                                ].map(([label, value]) => (
                                                    <div key={label} className="px-3 py-2 bg-card rounded-lg border border-border">
                                                        <p className="text-[11px] text-muted-foreground font-semibold uppercase">{label}</p>
                                                        <p className="text-sm font-bold text-foreground capitalize">{String(value).replace(/_/g, ' ')}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {latestQualityReport.summary && (
                                                <p className="text-sm text-muted-foreground mt-3">{latestQualityReport.summary}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-foreground">Artifacts ({artifacts.length})</h4>
                                        {artifacts.length === 0 ? (
                                            <div className="p-6 text-center bg-muted/30 rounded-xl border border-border">
                                                <p className="text-sm text-muted-foreground">No generation artifacts yet.</p>
                                            </div>
                                        ) : (
                                            artifacts.slice(0, 4).map((artifact) => (
                                                <div key={artifact.id} className="p-4 bg-muted/30 rounded-xl border border-border">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                                                        <div>
                                                            <p className="font-semibold text-foreground">{artifact.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {artifact.artifactType.replace(/_/g, ' ')} · v{artifact.version} · {new Date(artifact.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <span className="px-2 py-1 bg-accent/10 text-accent rounded-lg text-xs font-bold self-start">
                                                            {artifact.artifactType.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-card p-3 text-xs text-muted-foreground border border-border">
                                                        {previewArtifactContent(artifact)}
                                                    </pre>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <ShareIdeaModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    ideaId={idea.id}
                    ideaTitle={idea.title}
                />

                {lightboxOpen && filteredMockups.length > 0 && (
                    <DesignLightbox
                        designs={filteredMockups.map(m => ({
                            id: m.id,
                            imageUrl: m.imageUrl,
                            screenName: m.screenName,
                            screenType: m.screenType,
                            figmaUrl: m.figmaUrl,
                        }))}
                        initialIndex={lightboxIndex}
                        onClose={() => setLightboxOpen(false)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};
