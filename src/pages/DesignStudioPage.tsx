import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Palette,
    RefreshCw,
    CheckCircle2,
    Download,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Maximize2,
    Loader2,
    Brain,
    FileText,
    LayoutGrid,
    Grid3X3,
    Split,
    AlertCircle,
    ExternalLink,
    Monitor,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { BrandColorPicker } from './DesignStudioPage/BrandColorPicker';
import { DesignCard } from './DesignStudioPage/DesignCard';
import { GenerationProgress } from './DesignStudioPage/GenerationProgress';
import { useGoogleStitch, BrandColors } from '../hooks/useGoogleStitch';
import { useIdeas } from '../hooks/useIdeas';
import { PRDNode } from '../components/prd/types';
import { DesignLightbox } from '../components/modals/DesignLightbox';

interface DesignStudioProps {
    ideaId?: string;
    initialPRDData?: PRDNode[];
}

const DEFAULT_COLORS: BrandColors = {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#10B981',
    background: '#FFFFFF',
};

const THEME_PRESETS: { name: string; colors: BrandColors }[] = [
    { name: 'Ocean', colors: { primary: '#0EA5E9', secondary: '#06B6D4', accent: '#14B8A6', background: '#F0FDFA' } },
    { name: 'Forest', colors: { primary: '#22C55E', secondary: '#84CC16', accent: '#A3E635', background: '#F7FEE7' } },
    { name: 'Sunset', colors: { primary: '#F97316', secondary: '#EF4444', accent: '#FCD34D', background: '#FFFBEB' } },
    { name: 'Minimal', colors: { primary: '#1F2937', secondary: '#6B7280', accent: '#9CA3AF', background: '#F9FAFB' } },
    { name: 'Dark', colors: { primary: '#60A5FA', secondary: '#A78BFA', accent: '#34D399', background: '#111827' } },
    { name: 'Vibrant', colors: { primary: '#EC4899', secondary: '#8B5CF6', accent: '#F59E0B', background: '#FDF2F8' } },
];

type ViewMode = 'prd' | 'design' | 'split';
type DesignDevice = 'mobile' | 'tablet' | 'web';


export const DesignStudioPage: React.FC<DesignStudioProps> = ({
    ideaId: propIdeaId,
    initialPRDData
}) => {
    const params = useParams<{ id: string }>();
    const navigate = useNavigate();
    const ideaId = propIdeaId || params.id;

    const { getIdeaById } = useIdeas();
    const { generateDesign, generateAllDesigns, getAllDesigns, progress: generationProgress, isGenerating, isConnected } = useGoogleStitch(ideaId);

    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [selectedDevice, setSelectedDevice] = useState<DesignDevice>('mobile');
    // Provider is chosen server-side (image generation runs on the backend);
    // this is sent as metadata only, so it stays constant rather than a fake toggle.
    const aiEngine = 'gemini' as const;
    const [brandColors, setBrandColors] = useState<BrandColors>(DEFAULT_COLORS);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [prdNodes, setPrdNodes] = useState<PRDNode[]>(initialPRDData || []);
    const [designs, setDesigns] = useState<Record<string, string>>({});
    // Real generation activity log (populated by generate handlers below).
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [loadingIdea, setLoadingIdea] = useState(!initialPRDData && !!ideaId);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Load idea data if we have an ideaId
    useEffect(() => {
        if (ideaId && !initialPRDData) {
            loadIdeaData();
        }
    }, [ideaId]);

    const loadIdeaData = async () => {
        if (!ideaId) return;

        setLoadingIdea(true);
        try {
            const result = await getIdeaById(ideaId);
            if (result.success && result.data) {
                const idea = (result.data as any).data || result.data;

                // Extract PRD data or create from design mockups
                if (idea.prdDocument) {
                    // Use PRD from idea
                    setPrdNodes([{
                        id: 'root',
                        type: 'root',
                        label: idea.title,
                        status: 'approved',
                        designGenerated: false,
                        children: idea.prdDocument.pages || []
                    }]);
                } else if (idea.designMockups && idea.designMockups.length > 0) {
                    // Create PRD structure from mockups
                    const pages = idea.designMockups.map((mock: any, index: number) => ({
                        id: `page-${index}`,
                        type: 'page' as const,
                        label: mock.screenName || `Page ${index + 1}`,
                        status: 'approved' as const,
                        designGenerated: true,
                        designUrl: mock.imageUrl,
                        children: []
                    }));

                    setPrdNodes([{
                        id: 'root',
                        type: 'root',
                        label: idea.title,
                        status: 'approved',
                        designGenerated: false,
                        children: pages
                    }]);
                }

                const persistedDesigns = await getAllDesigns(ideaId);
                if (persistedDesigns.length > 0) {
                    setDesigns(Object.fromEntries(persistedDesigns.map((design) => [design.nodeId, design.imageUrl])));
                }
            }
        } catch (error) {
            console.error('Failed to load idea:', error);
        }
        setLoadingIdea(false);
    };

    // Flatten PRD nodes to get page nodes
    const flattenNodes = useCallback((nodes: PRDNode[]): PRDNode[] => {
        const result: PRDNode[] = [];
        const traverse = (nodeList: PRDNode[]) => {
            nodeList.forEach(node => {
                if (node.type === 'page') result.push(node);
                if (node.children && node.children.length > 0) traverse(node.children);
            });
        };
        traverse(nodes);
        return result;
    }, []);

    const pageNodes = flattenNodes(prdNodes);
    const generatedCount = pageNodes.filter((node) => designs[node.id] || node.designUrl).length;
    const totalCount = pageNodes.length;

    const handleGenerateSingle = async (node: PRDNode) => {
        if (!ideaId) return;

        try {
            const result = await generateDesign({
                ideaId,
                nodeId: node.id,
                label: node.label,
                description: node.description,
                children: node.children?.map(c => c.label) || [],
                brandColors,
                platform: selectedDevice,
                engine: aiEngine,
            });

            if (result) {
                setDesigns(prev => ({ ...prev, [node.id]: result.imageUrl }));
                setPrdNodes(prev => updateNodeInTree(prev, node.id, {
                    designGenerated: true,
                    designUrl: result.imageUrl
                }));

                setChatMessages(prev => [...prev,
                { role: 'ai', content: `Successfully generated design for ${node.label}!` }
                ]);
            }
        } catch (error) {
            setChatMessages(prev => [...prev,
            { role: 'ai', content: `Failed to generate design for ${node.label}.` }
            ]);
        }
    };

    const handleGenerateAll = async () => {
        if (!ideaId || pageNodes.length === 0) return;

        const results = await generateAllDesigns({
            ideaId: ideaId,
            nodes: pageNodes.map(node => ({
                ideaId,
                nodeId: node.id,
                label: node.label,
                description: node.description,
                children: node.children?.map(c => c.label) || [],
                brandColors,
                platform: selectedDevice,
                engine: aiEngine,
            })),
            brandColors,
            platform: selectedDevice,
            engine: aiEngine,
        });

        // Update designs state
        const newDesigns: Record<string, string> = {};
        results.forEach(design => {
            newDesigns[design.nodeId] = design.imageUrl;
        });
        setDesigns(prev => ({ ...prev, ...newDesigns }));

        // Update PRD nodes
        Object.keys(newDesigns).forEach(nodeId => {
            setPrdNodes(prev => updateNodeInTree(prev, nodeId, {
                designGenerated: true,
                designUrl: newDesigns[nodeId]
            }));
        });

        setChatMessages(prev => [...prev,
        { role: 'ai', content: `All ${results.length} designs have been generated! You can view them in the design view.` }
        ]);
    };

    const updateNodeInTree = (nodes: PRDNode[], nodeId: string, updates: Partial<PRDNode>): PRDNode[] => {
        return nodes.map(node => {
            if (node.id === nodeId) {
                return { ...node, ...updates };
            }
            if (node.children && node.children.length > 0) {
                return { ...node, children: updateNodeInTree(node.children, nodeId, updates) };
            }
            return node;
        });
    };

    const handleNavigateToPRD = () => {
        if (ideaId) {
            navigate(`/ideas/${ideaId}`);
        } else {
            navigate('/prd-mindmap');
        }
    };

    const lightboxDesigns = pageNodes
        .map((node) => ({
            id: node.id,
            imageUrl: designs[node.id] || node.designUrl || '',
            screenName: node.label,
            screenType: selectedDevice,
        }))
        .filter((design) => design.imageUrl);

    const handleExport = () => {
        const blob = new Blob([
            JSON.stringify({
                ideaId,
                device: selectedDevice,
                generatedAt: new Date().toISOString(),
                designs: lightboxDesigns,
            }, null, 2),
        ], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `design-studio-${ideaId || 'export'}-${selectedDevice}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loadingIdea) {
        return (
            <DashboardLayout>
                <div className="h-[calc(100vh-64px)] flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground mt-4">Loading PRD data...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (pageNodes.length === 0) {
        return (
            <DashboardLayout>
                <div className="h-[calc(100vh-64px)] flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-foreground mb-2">No PRD Data Found</h2>
                        <p className="text-muted-foreground mb-6">
                            Create a PRD Mind Map first to generate designs.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={handleNavigateToPRD} className="btn-primary">
                                <Brain className="w-4 h-4" />
                                Create PRD
                            </button>
                            <button onClick={() => navigate(-1)} className="btn-secondary">
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-64px)] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Design Studio</h1>
                            <p className="text-sm text-muted-foreground">{prdNodes[0]?.label || 'App Design'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-muted rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('prd')}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                                    viewMode === 'prd' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                                )}
                            >
                                <LayoutGrid className="w-4 h-4 inline mr-1" />
                                PRD
                            </button>
                            <button
                                onClick={() => setViewMode('split')}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                                    viewMode === 'split' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                                )}
                            >
                                <Split className="w-4 h-4 inline mr-1" />
                                Split
                            </button>
                            <button
                                onClick={() => setViewMode('design')}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                                    viewMode === 'design' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                                )}
                            >
                                <Grid3X3 className="w-4 h-4 inline mr-1" />
                                Design
                            </button>
                        </div>

                        <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                            {([
                                ['mobile', Palette],
                                ['tablet', LayoutGrid],
                                ['web', Monitor],
                            ] as const).map(([device, Icon]) => (
                                <button
                                    key={device}
                                    onClick={() => setSelectedDevice(device)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 capitalize',
                                        selectedDevice === device ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <Icon className="w-3 h-3" />
                                    {device}
                                </button>
                            ))}
                        </div>

                        {/* PRD Link */}
                        <button
                            onClick={handleNavigateToPRD}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-all"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">View PRD</span>
                            <ExternalLink className="w-3 h-3" />
                        </button>

                        {/* Brand Colors */}
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
                                showColorPicker ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                            )}
                        >
                            <div className="flex -space-x-2">
                                <div className="w-5 h-5 rounded-full border border-background" style={{ background: brandColors.primary }} />
                                <div className="w-5 h-5 rounded-full border border-background" style={{ background: brandColors.secondary }} />
                            </div>
                            <span className="text-sm font-medium">Colors</span>
                        </button>

                        {/* Generate All */}
                        <button
                            onClick={handleGenerateAll}
                            disabled={isGenerating || generatedCount === totalCount}
                            className="btn-primary"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            {isGenerating ? 'Generating...' : 'Generate All'}
                        </button>

                        {/* Export */}
                        <button onClick={handleExport} className="btn-secondary">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Color Picker Dropdown */}
                <AnimatePresence>
                    {showColorPicker && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-20 top-20 z-50"
                        >
                            <BrandColorPicker
                                colors={brandColors}
                                onChange={setBrandColors}
                                presets={THEME_PRESETS}
                                onClose={() => setShowColorPicker(false)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Chat Panel */}
                    <AnimatePresence>
                        {!chatCollapsed && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="border-r border-border bg-card flex flex-col"
                            >
                                <div className="p-4 border-b border-border">
                                    <h2 className="font-semibold text-foreground">Activity</h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">Live generation events for this idea.</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center text-center">
                                            <Sparkles className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                                            <p className="mt-3 text-sm font-medium text-foreground">No activity yet</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Generate a screen to see progress and results appear here.
                                            </p>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg, i) => (
                                            <div key={i} className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2">
                                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                                                <p className="text-sm text-foreground">{msg.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Chat Toggle */}
                    <button
                        onClick={() => setChatCollapsed(!chatCollapsed)}
                        className="absolute top-1/2 -translate-y-1/2 z-10 p-1 bg-card border border-r-0 border-border rounded-l-lg hover:bg-muted transition-colors"
                        style={{ left: chatCollapsed ? 0 : 320 }}
                    >
                        {chatCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>

                    {/* Canvas */}
                    <div className="flex-1 overflow-auto bg-background p-6">
                        {isGenerating ? (
                            <GenerationProgress
                                progress={generationProgress}
                                total={totalCount}
                                completed={generatedCount}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {pageNodes.map((node) => {
                                    const nodeDesignUrl = designs[node.id] || node.designUrl;
                                    const nodeStatus = generationProgress[node.id];

                                    return (
                                        <DesignCard
                                            key={node.id}
                                            node={{
                                                ...node,
                                                designGenerated: !!nodeDesignUrl,
                                                designUrl: nodeDesignUrl,
                                                designLoading: nodeStatus?.status === 'processing' || nodeStatus?.status === 'running' || nodeStatus?.status === 'queued'
                                            } as any}
                                            viewMode={viewMode}
                                            brandColors={brandColors}
                                            onGenerate={() => handleGenerateSingle(node)}
                                            onPreview={() => {
                                                const index = lightboxDesigns.findIndex((design) => design.id === node.id);
                                                if (index >= 0) setLightboxIndex(index);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                            {generatedCount} of {totalCount} screens generated
                        </span>
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${totalCount > 0 ? (generatedCount / totalCount) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="flex items-center gap-1.5 mr-4 text-xs font-medium" title={isConnected ? "WebSocket Connected" : "WebSocket Disconnected"}>
                            <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500" : "bg-red-500")} />
                            {isConnected ? "Live Tracking" : "Offline Mode"}
                        </span>
                        <Brain className="w-4 h-4" />
                        <span className="text-xs">AI-generated designs</span>
                    </div>
                </div>
                {lightboxIndex !== null && lightboxDesigns.length > 0 && (
                    <DesignLightbox
                        designs={lightboxDesigns}
                        initialIndex={lightboxIndex}
                        onClose={() => setLightboxIndex(null)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

export default DesignStudioPage;
