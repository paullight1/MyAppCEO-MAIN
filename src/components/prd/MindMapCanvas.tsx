import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MindMapNode } from './MindMapNode';
import { MindMapControls } from './MindMapControls';
import { NodeEditor } from './NodeEditor';
import { AISuggestions } from './AISuggestions';
import { PRDSidebar } from './PRDSidebar';
import { PRDNode, defaultPRDStructure, NodeStatus, PRDValidationResult } from './types';
import { sanitizeInput, escapeHtml } from '../../utils/security';
import { useAISuggestions } from '../../hooks/useAISuggestions';

interface MindMapCanvasProps {
    initialData?: PRDNode;
    ideaId?: string;
    onChange?: (nodes: PRDNode[]) => void;
    onPatchNode?: (nodeId: string, patch: Partial<PRDNode>) => Promise<any>;
    onRefineNode?: (nodeId: string, instructions?: string) => Promise<any>;
    onExpandNode?: (nodeId: string, instructions?: string) => Promise<any>;
    onValidatePRD?: () => Promise<any>;
    onGenerateScreen?: (nodeId: string) => Promise<any>;
    validation?: PRDValidationResult | null;
    isServerBusy?: boolean;
}

export function MindMapCanvas({
    initialData,
    ideaId,
    onChange,
    onPatchNode,
    onRefineNode,
    onExpandNode,
    onValidatePRD,
    onGenerateScreen,
    validation,
    isServerBusy,
}: MindMapCanvasProps) {
    const [data, setData] = useState<PRDNode>(initialData || defaultPRDStructure);
    const [selectedNode, setSelectedNode] = useState<PRDNode | null>(null);
    const [sidebarNode, setSidebarNode] = useState<PRDNode | null>(null);
    const [editingNode, setEditingNode] = useState<PRDNode | null>(null);
    const [aiSuggestionsNode, setAiSuggestionsNode] = useState<PRDNode | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isAILoading, setIsAILoading] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'home', 'search', 'profile', 'details', 'app-settings']));
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 100, y: 100 });
    const [isPanning, setIsPanning] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const lastPanPoint = useRef({ x: 0, y: 0 });

    const { 
        suggestions: aiSuggestionsFromHook, 
        isLoading: isAILoadingFromHook, 
        error: aiError,
        generateSuggestions,
        clearSuggestions
    } = useAISuggestions({ ideaId: ideaId });

    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    const findNodeById = useCallback((node: PRDNode, id: string): PRDNode | null => {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }, []);

    const updateNode = useCallback((node: PRDNode, id: string, updater: (n: PRDNode) => PRDNode): PRDNode => {
        if (node.id === id) return updater(node);
        return {
            ...node,
            children: node.children.map(child => updateNode(child, id, updater))
        };
    }, []);

    const deleteNodeFromTree = useCallback((node: PRDNode, id: string): PRDNode => {
        return {
            ...node,
            children: node.children
                .filter(child => child.id !== id)
                .map(child => deleteNodeFromTree(child, id))
        };
    }, []);

    const addChildToNode = useCallback((node: PRDNode, parentId: string, newChild: PRDNode): PRDNode => {
        if (node.id === parentId) {
            return { ...node, children: [...node.children, newChild] };
        }
        return {
            ...node,
            children: node.children.map(child => addChildToNode(child, parentId, newChild))
        };
    }, []);

    const syncNodeState = useCallback((nodeId: string, patch: Partial<PRDNode>) => {
        setData(prev => updateNode(prev, nodeId, n => ({ ...n, ...patch })));
        setSelectedNode(prev => prev?.id === nodeId ? { ...prev, ...patch } : prev);
        setSidebarNode(prev => prev?.id === nodeId ? { ...prev, ...patch } : prev);
    }, [updateNode]);

    const applyServerNodes = useCallback((result: any, fallbackNodeId?: string, fallbackPatch?: Partial<PRDNode>) => {
        const nodes = result?.nodes || result?.graph?.nodes || result?.data?.nodes || result?.data?.graph?.nodes;
        const returnedNode = result?.node || result?.data?.node;
        if (Array.isArray(nodes) && nodes[0]) {
            setData(nodes[0]);
            if (sidebarNode) {
                const updated = findNodeById(nodes[0], sidebarNode.id);
                if (updated) setSidebarNode(updated);
            }
            if (selectedNode) {
                const updated = findNodeById(nodes[0], selectedNode.id);
                if (updated) setSelectedNode(updated);
            }
            return;
        }
        if (fallbackNodeId && returnedNode) {
            syncNodeState(fallbackNodeId, returnedNode);
            return;
        }
        if (fallbackNodeId && fallbackPatch) {
            syncNodeState(fallbackNodeId, fallbackPatch);
        }
    }, [findNodeById, selectedNode, sidebarNode, syncNodeState]);

    const handleSelect = useCallback((node: PRDNode) => {
        setSelectedNode(node);
        setSidebarNode(node);
    }, []);

    const handleToggleExpand = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const handleAddChild = useCallback((parentId: string) => {
        const parentNode = findNodeById(data, parentId);
        const childType = parentNode?.type === 'root' ? 'page' : 
                         parentNode?.type === 'page' ? 'feature' : 
                         parentNode?.type === 'feature' ? 'component' : 'action';
        
        const newNode: PRDNode = {
            id: `${parentId}-${Date.now()}`,
            type: childType,
            label: `New ${childType.charAt(0).toUpperCase() + childType.slice(1)}`,
            status: 'pending',
            designGenerated: false,
            children: []
        };
        
        setData(prev => {
            const next = addChildToNode(prev, parentId, newNode);
            onChange?.([next]);
            return next;
        });
        setExpandedNodes(prev => new Set([...prev, parentId]));
    }, [data, findNodeById, addChildToNode, onChange]);

    const handleEdit = useCallback(async (nodeId: string, label: string, description?: string) => {
        const sanitizedLabel = sanitizeInput(label);
        const sanitizedDescription = description ? sanitizeInput(description) : undefined;
        const previousData = data;
        const patch = { label: sanitizedLabel, description: sanitizedDescription };
        
        setData(prev => updateNode(prev, nodeId, n => ({ ...n, ...patch })));
        
        if (selectedNode?.id === nodeId) {
            setSelectedNode(prev => prev ? { ...prev, ...patch } : null);
        }
        if (sidebarNode?.id === nodeId) {
            setSidebarNode(prev => prev ? { ...prev, ...patch } : null);
        }
        setEditingNode(null);

        if (!onPatchNode) {
            setData(prev => {
                const next = updateNode(prev, nodeId, n => ({ ...n, ...patch }));
                onChange?.([next]);
                return next;
            });
            return;
        }

        const result = await onPatchNode(nodeId, patch);
        if (!result) {
            setData(previousData);
            const restoredSelected = selectedNode?.id === nodeId ? findNodeById(previousData, nodeId) : selectedNode;
            const restoredSidebar = sidebarNode?.id === nodeId ? findNodeById(previousData, nodeId) : sidebarNode;
            setSelectedNode(restoredSelected);
            setSidebarNode(restoredSidebar);
            return;
        }
        applyServerNodes(result, nodeId, patch);
    }, [data, selectedNode, sidebarNode, updateNode, onPatchNode, onChange, findNodeById, applyServerNodes]);

    const handleDelete = useCallback((nodeId: string) => {
        if (nodeId === 'root') return;
        setData(prev => {
            const next = deleteNodeFromTree(prev, nodeId);
            onChange?.([next]);
            return next;
        });
        if (selectedNode?.id === nodeId) setSelectedNode(null);
        if (sidebarNode?.id === nodeId) setSidebarNode(null);
    }, [selectedNode, sidebarNode, deleteNodeFromTree, onChange]);

    const handleAIExpand = useCallback(async (nodeId: string) => {
        const node = findNodeById(data, nodeId);
        if (!node) return;

        if (onExpandNode) {
            const result = await onExpandNode(nodeId, 'Expand this PRD node into implementation-ready child nodes.');
            applyServerNodes(result, nodeId);
            setExpandedNodes(prev => new Set([...prev, nodeId]));
            return;
        }
        
        setAiSuggestionsNode(node);
        setIsAILoading(true);
        
        try {
            const suggestions = await generateSuggestions(nodeId, node.type, node.label);
            setAiSuggestions(suggestions);
        } catch {
            // generateSuggestions surfaces its own error; show no suggestions
            // rather than fabricating a hardcoded list.
            setAiSuggestions([]);
        } finally {
            setIsAILoading(false);
        }
    }, [data, findNodeById, generateSuggestions, onExpandNode, applyServerNodes]);

    const handleRefineNode = useCallback(async (nodeId: string) => {
        const result = await onRefineNode?.(nodeId, 'Refine this node with acceptance criteria, implementation detail, dependencies, API/data hints, and validation status.');
        applyServerNodes(result, nodeId);
    }, [onRefineNode, applyServerNodes]);

    const handleValidateNode = useCallback(async (nodeId: string) => {
        const result = await onValidatePRD?.();
        const issues = result?.validation?.nodeIssues || result?.data?.validation?.nodeIssues || [];
        const hasIssue = issues.some((item: any) => item.nodeId === nodeId);
        syncNodeState(nodeId, { validationStatus: hasIssue ? 'missing_requirements' : 'ready' });
    }, [onValidatePRD, syncNodeState]);

    const handleGenerateScreenArtifact = useCallback(async (nodeId: string) => {
        const result = await onGenerateScreen?.(nodeId);
        const artifact = result?.artifact || result?.data?.artifact;
        applyServerNodes(null, nodeId, {
            screenStatus: artifact ? 'generated' : 'failed',
            screenArtifactId: artifact?.id,
            screenId: artifact?.id,
        });
    }, [onGenerateScreen, applyServerNodes]);

    const handleAcceptSuggestion = useCallback((suggestion: string) => {
        if (!aiSuggestionsNode) return;
        
        const sanitizedSuggestion = sanitizeInput(suggestion);
        
        const newNode: PRDNode = {
            id: `${aiSuggestionsNode.id}-${Date.now()}`,
            type: 'feature',
            label: sanitizedSuggestion,
            status: 'pending',
            designGenerated: false,
            children: []
        };
        
        setData(prev => {
            const next = addChildToNode(prev, aiSuggestionsNode.id, newNode);
            onChange?.([next]);
            return next;
        });
        setExpandedNodes(prev => new Set([...prev, aiSuggestionsNode.id]));
    }, [aiSuggestionsNode, addChildToNode, onChange]);

    const handleAddAllSuggestions = useCallback(() => {
        if (!aiSuggestionsNode) return;
        
        const newNodes = aiSuggestions.map((suggestion, i) => ({
            id: `${aiSuggestionsNode.id}-${Date.now()}-${i}`,
            type: 'feature' as const,
            label: suggestion,
            status: 'pending' as const,
            designGenerated: false,
            children: []
        }));
        
        setData(prev => {
            let result = prev;
            for (const node of newNodes) {
                result = addChildToNode(result, aiSuggestionsNode.id, node);
            }
            onChange?.([result]);
            return result;
        });
        setExpandedNodes(prev => new Set([...prev, aiSuggestionsNode.id]));
        setAiSuggestionsNode(null);
    }, [aiSuggestionsNode, aiSuggestions, addChildToNode, onChange]);

    const handleGenerateDesign = useCallback((nodeId: string) => {
        // Route through the real backend screen generation instead of
        // fabricating a placeholder design URL locally.
        void handleGenerateScreenArtifact(nodeId);
    }, [handleGenerateScreenArtifact]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.target === canvasRef.current) {
            setIsPanning(true);
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastPanPoint.current.x;
            const dy = e.clientY - lastPanPoint.current.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        }
    }, [isPanning]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
    const handleFitToScreen = () => {
        setZoom(1);
        setPan({ x: 100, y: 100 });
    };
    const handleReset = () => {
        setZoom(1);
        setPan({ x: 100, y: 100 });
        setExpandedNodes(new Set(['root', 'home', 'search', 'profile', 'details', 'app-settings']));
    };

    const handleExport = useCallback(() => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prd-mindmap.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [data]);

    const handleNodeStatusChange = useCallback((nodeId: string, status: NodeStatus) => {
        setData(prev => {
            const next = updateNode(prev, nodeId, n => ({ ...n, status }));
            onChange?.([next]);
            return next;
        });
    }, [updateNode, onChange]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 
                        dark:from-gray-900 dark:to-gray-800">
            <div
                ref={canvasRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => {
                    setSelectedNode(null);
                    setSidebarNode(null);
                }}
            >
                <motion.div
                    className="relative"
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        transformOrigin: '0 0'
                    }}
                >
                    <MindMapNode
                        node={data}
                        level={0}
                        isSelected={selectedNode?.id === data.id}
                        expandedNodes={expandedNodes}
                        onSelect={handleSelect}
                        onToggleExpand={handleToggleExpand}
                        onAddChild={handleAddChild}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAIExpand={handleAIExpand}
                        onGenerateDesign={handleGenerateDesign}
                        x={300}
                        y={400}
                    />
                </motion.div>
            </div>

            <MindMapControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitToScreen={handleFitToScreen}
                onReset={handleReset}
                onExport={handleExport}
            />

            <AnimatePresence>
                {sidebarNode && (
                    <motion.div
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        className="absolute right-0 top-0 h-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PRDSidebar
                            node={sidebarNode}
                            onClose={() => setSidebarNode(null)}
                            onEdit={() => setEditingNode(sidebarNode)}
                            onAIExpand={() => handleAIExpand(sidebarNode.id)}
                            onRefine={() => handleRefineNode(sidebarNode.id)}
                            onValidate={() => handleValidateNode(sidebarNode.id)}
                            onGenerateDesign={() => handleGenerateDesign(sidebarNode.id)}
                            onGenerateScreen={ideaId ? () => handleGenerateScreenArtifact(sidebarNode.id) : undefined}
                            validation={validation}
                            isBusy={isServerBusy || isAILoading}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingNode && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute top-4 left-4 z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <NodeEditor
                            node={editingNode}
                            onSave={(label, description, status) => {
                                handleEdit(editingNode.id, label, description);
                                handleNodeStatusChange(editingNode.id, status);
                            }}
                            onClose={() => setEditingNode(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {aiSuggestionsNode && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AISuggestions
                            node={aiSuggestionsNode}
                            suggestions={aiSuggestions}
                            isLoading={isAILoading}
                            onAcceptSuggestion={handleAcceptSuggestion}
                            onRejectSuggestion={() => {}}
                            onAddAll={handleAddAllSuggestions}
                            onGenerateMore={() => handleAIExpand(aiSuggestionsNode.id)}
                            onClose={() => setAiSuggestionsNode(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
