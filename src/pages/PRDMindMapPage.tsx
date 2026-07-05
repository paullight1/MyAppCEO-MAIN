import { ArrowLeft, Brain, FileText, HelpCircle, Sparkles, Loader2, Cloud, CloudOff, AlertCircle, ClipboardList, CheckCircle, AlertTriangle, History } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MindMapCanvas } from '../components/prd';
import { defaultPRDStructure, PRDNode } from '../components/prd/types';
import { useState, useCallback, useEffect } from 'react';
import { usePRD } from '../hooks/usePRD';
import { useGenerationArtifacts } from '../hooks/useGenerationArtifacts';

export function PRDMindMapPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isGenerating, setIsGenerating] = useState(false);
    const [initialData, setInitialData] = useState<PRDNode | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'editor' | 'ai'>('editor');
    const [showHelp, setShowHelp] = useState(false);
    const [pipelineNotice, setPipelineNotice] = useState<string | null>(null);

    const { 
        prdNodes, 
        isLoading: isLoadingPRD, 
        isSaving, 
        lastSaved, 
        error: prdError,
        hasUnsavedChanges,
        validation,
        currentVersion,
        versionHistory,
        updatePRD,
        forceSave,
        patchNode,
        refineNode,
        expandNode,
        validatePRD,
    } = usePRD({ ideaId: id, autoSaveDelay: 3000, enabled: !!id });
    const {
        latestBuildPlan,
        createBuildPlan,
        generateScreen,
        isMutating: isPipelineMutating,
        error: pipelineError,
    } = useGenerationArtifacts(id);

    useEffect(() => {
        if (prdNodes.length > 0) {
            setInitialData(prdNodes[0]);
        } else if (!id) {
            setInitialData(defaultPRDStructure);
        }
    }, [prdNodes, id]);

    const handleGenerateDesigns = async () => {
        if (hasUnsavedChanges) {
            const saved = await forceSave();
            if (!saved) {
                return;
            }
        }
        setIsGenerating(true);
        if (id) {
            navigate(`/design-studio/${id}`);
        } else {
            navigate('/design-studio/demo');
        }
        setIsGenerating(false);
    };

    const handleCreateBuildPlan = async () => {
        if (!id) return;
        setPipelineNotice(null);

        if (hasUnsavedChanges) {
            const saved = await forceSave();
            if (!saved) return;
        }

        const result = await createBuildPlan('Create an implementation-ready build plan from the current PRD mind map.');
        if (result?.artifact) {
            setPipelineNotice('Build plan artifact created. Continue from the Build tab on the idea detail page.');
        }
    };

    const handleExport = useCallback(() => {
        const dataToExport = prdNodes.length > 0 ? prdNodes : [defaultPRDStructure];
        const json = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prd-mindmap-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [prdNodes]);

    const formatLastSaved = (date: Date | null) => {
        if (!date) return '';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        return date.toLocaleTimeString();
    };

    const validationSummary = validation?.summary;
    const currentVersionMeta = versionHistory.find((version) => version.isCurrent) || versionHistory[0];
    const versionDate = currentVersionMeta?.createdAt ? new Date(currentVersionMeta.createdAt) : null;

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b">
                <div className="flex items-center gap-4">
                    <Link
                        to="/dashboard"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">PRD Mind Map</h1>
                        <p className="text-sm text-gray-500">MVPLAB Marketplace</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {id && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg mr-2">
                            {isSaving ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : hasUnsavedChanges ? (
                                <>
                                    <CloudOff size={12} className="text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
                                </>
                            ) : lastSaved ? (
                                <>
                                    <Cloud size={12} className="text-emerald-500" />
                                    <span>Saved {formatLastSaved(lastSaved)}</span>
                                </>
                            ) : null}
                        </div>
                    )}
                    
                    <button 
                        onClick={handleGenerateDesigns}
                        disabled={isGenerating || isLoadingPRD}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 
                                   text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        Generate Designs
                    </button>
                    {id && (
                        <button
                            onClick={handleCreateBuildPlan}
                            disabled={isPipelineMutating || isLoadingPRD}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPipelineMutating ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <ClipboardList size={16} />
                            )}
                            {latestBuildPlan ? 'Regenerate Plan' : 'Build Plan'}
                        </button>
                    )}
                    <button onClick={() => setActiveTab('ai')} className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 
                                       dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 
                                       rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                        <Brain size={16} />
                        AI Assistant
                    </button>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 
                                   dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 
                                   transition-colors"
                    >
                        <FileText size={16} />
                        Export
                    </button>
                    <button onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 
                                       dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 
                                       transition-colors">
                        <HelpCircle size={16} />
                        Help
                    </button>
                </div>
            </header>

            <section className="border-b bg-white dark:bg-gray-800 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <History size={16} className="text-gray-500" />
                        <span className="text-gray-500">Version</span>
                        <span className="font-semibold text-gray-900 dark:text-white">v{currentVersion || currentVersionMeta?.version || 1}</span>
                        {currentVersionMeta?.generatedBy && (
                            <span className="text-xs text-gray-500">by {currentVersionMeta.generatedBy}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                        {hasUnsavedChanges ? (
                            <CloudOff size={16} className="text-amber-500" />
                        ) : (
                            <Cloud size={16} className="text-emerald-500" />
                        )}
                        <span className="text-gray-500">Last saved</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {lastSaved ? formatLastSaved(lastSaved) : versionDate ? versionDate.toLocaleString() : 'Not saved'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-gray-500">Ready</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{validationSummary?.ready ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        <span className="text-gray-500">Missing</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{validationSummary?.missing ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-gray-500">Blocked</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{validationSummary?.blocked ?? 0}</span>
                    </div>
                    <button
                        onClick={() => void validatePRD()}
                        disabled={!id || isLoadingPRD}
                        className="ml-auto flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        {isLoadingPRD ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
                        Validate PRD
                    </button>
                </div>
            </section>

            {prdError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">{prdError}</span>
                    <button 
                        onClick={() => window.location.reload()}
                        className="ml-auto text-xs text-red-500 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {(pipelineError || pipelineNotice) && (
                <div className={`border-b px-4 py-2 flex items-center gap-2 ${
                    pipelineError
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                }`}>
                    <ClipboardList size={16} className={pipelineError ? 'text-red-500' : 'text-emerald-500'} />
                    <span className={`text-sm ${pipelineError ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {pipelineError || pipelineNotice}
                    </span>
                    {id && !pipelineError && (
                        <button
                            onClick={() => navigate(`/ideas/${id}?tab=build`)}
                            className="ml-auto text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                        >
                            Open Build tab
                        </button>
                    )}
                </div>
            )}

            <div className="flex-1 relative">
                {isLoadingPRD ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Loader2 size={32} className="animate-spin text-purple-500 mx-auto mb-4" />
                            <p className="text-gray-500">Loading PRD...</p>
                        </div>
                    </div>
                ) : (
                    <MindMapCanvas 
                        initialData={initialData} 
                        ideaId={id}
                        onChange={id ? updatePRD : undefined}
                        onPatchNode={id ? patchNode : undefined}
                        onRefineNode={id ? refineNode : undefined}
                        onExpandNode={id ? expandNode : undefined}
                        onValidatePRD={id ? validatePRD : undefined}
                        validation={validation}
                        onGenerateScreen={id ? (nodeId) => generateScreen(nodeId, {
                            provider: 'deterministic',
                            instructions: 'Generate an implementation-ready screen specification from this PRD node.',
                        }) : undefined}
                        isServerBusy={isSaving || isPipelineMutating}
                    />
                )}
            </div>
        </div>
    );
}
