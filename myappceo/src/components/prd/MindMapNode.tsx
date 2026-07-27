import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit2, Trash2, Sparkles, Palette, 
    ChevronDown, ChevronRight
} from 'lucide-react';
import { PRDNode, nodeTypeIcons, nodeTypeColors } from './types';

interface MindMapNodeProps {
    node: PRDNode;
    level: number;
    isSelected: boolean;
    expandedNodes: Set<string>;
    onSelect: (node: PRDNode) => void;
    onToggleExpand: (nodeId: string) => void;
    onAddChild: (parentId: string) => void;
    onEdit: (nodeId: string, label: string, description?: string) => void;
    onDelete: (nodeId: string) => void;
    onAIExpand: (nodeId: string) => void;
    onGenerateDesign: (nodeId: string) => void;
    x: number;
    y: number;
    onPositionChange?: (nodeId: string, x: number, y: number) => void;
}

export function MindMapNode({
    node,
    level,
    isSelected,
    expandedNodes,
    onSelect,
    onToggleExpand,
    onAddChild,
    onEdit,
    onDelete,
    onAIExpand,
    onGenerateDesign,
    x,
    y
}: MindMapNodeProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(node.label);
    const [showActions, setShowActions] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isRoot = node.type === 'root';
    const nodeIcon = nodeTypeIcons[node.type] || 'DOC';
    const nodeColor = nodeTypeColors[node.type] || nodeTypeColors.section;

    useEffect(() => {
        if (isSelected) {
            setShowActions(true);
        }
    }, [isSelected]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditLabel(node.label);
    };

    const handleSaveEdit = () => {
        if (editLabel.trim()) {
            onEdit(node.id, editLabel.trim(), node.description);
        }
        setIsEditing(false);
    };

    const getStatusColor = () => {
        switch (node.status) {
            case 'approved': return 'bg-green-500';
            case 'needs_review': return 'bg-yellow-500';
            default: return 'bg-gray-400';
        }
    };

    const nodeSizes = {
        root: 'px-6 py-4 text-lg',
        page: 'px-4 py-3 text-base',
        feature: 'px-3 py-2 text-sm',
        component: 'px-2 py-1.5 text-xs',
        action: 'px-2 py-1 text-xs'
    };

    return (
        <motion.div
            ref={nodeRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute"
            style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 100 : level }}
        >
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                }}
                onDoubleClick={handleDoubleClick}
                className={`
                    relative cursor-pointer transition-all duration-200
                    ${isRoot 
                        ? `bg-gradient-to-r ${nodeTypeColors.root} text-white rounded-full font-bold shadow-lg` 
                        : `border-2 ${nodeColor} dark:text-white rounded-lg`
                    }
                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : ''}
                    ${nodeSizes[node.type]}
                `}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => !isSelected && setShowActions(false)}
            >
                <div className="flex items-center gap-2">
                    {!isRoot && <span className="text-sm">{nodeIcon}</span>}
                    
                    {isEditing ? (
                        <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className="bg-transparent border-b border-current outline-none min-w-[100px]"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="font-medium">{node.label}</span>
                    )}
                    
                    {!isRoot && (
                        <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                    )}
                    
                    {hasChildren && !isRoot && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(node.id);
                            }}
                            className="ml-1 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {isSelected && showActions && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-1/2 -bottom-12 transform -translate-x-1/2 
                                       flex items-center gap-1 bg-white dark:bg-gray-800 
                                       rounded-lg shadow-lg border p-1 z-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => onAddChild(node.id)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Add Child"
                            >
                                <Plus size={14} className="text-green-600" />
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Edit"
                            >
                                <Edit2 size={14} className="text-blue-600" />
                            </button>
                            <button
                                onClick={() => onAIExpand(node.id)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="AI Expand"
                            >
                                <Sparkles size={14} className="text-purple-600" />
                            </button>
                            <button
                                onClick={() => onGenerateDesign(node.id)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Generate Design"
                            >
                                <Palette size={14} className="text-pink-600" />
                            </button>
                            {node.type !== 'root' && (
                                <button
                                    onClick={() => onDelete(node.id)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    title="Delete"
                                >
                                    <Trash2 size={14} className="text-red-600" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {hasChildren && isExpanded && (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4"
                    >
                        {node.children.map((child, index) => (
                            <ChildNodeWrapper
                                key={child.id}
                                node={child}
                                parentX={x}
                                parentY={y}
                                level={level + 1}
                                index={index}
                                total={node.children.length}
                                isSelected={isSelected}
                                expandedNodes={expandedNodes}
                                onSelect={onSelect}
                                onToggleExpand={onToggleExpand}
                                onAddChild={onAddChild}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onAIExpand={onAIExpand}
                                onGenerateDesign={onGenerateDesign}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </motion.div>
    );
}

interface ChildNodeWrapperProps {
    node: PRDNode;
    parentX: number;
    parentY: number;
    level: number;
    index: number;
    total: number;
    isSelected: boolean;
    expandedNodes: Set<string>;
    onSelect: (node: PRDNode) => void;
    onToggleExpand: (nodeId: string) => void;
    onAddChild: (parentId: string) => void;
    onEdit: (nodeId: string, label: string, description?: string) => void;
    onDelete: (nodeId: string) => void;
    onAIExpand: (nodeId: string) => void;
    onGenerateDesign: (nodeId: string) => void;
}

function ChildNodeWrapper({
    node,
    parentX,
    parentY,
    level,
    index,
    total,
    isSelected,
    expandedNodes,
    onSelect,
    onToggleExpand,
    onAddChild,
    onEdit,
    onDelete,
    onAIExpand,
    onGenerateDesign
}: ChildNodeWrapperProps) {
    const horizontalSpacing = 200;
    const verticalSpacing = 80;
    
    const x = parentX + horizontalSpacing;
    const y = parentY + (index - (total - 1) / 2) * verticalSpacing;

    const connectionPoints = {
        startX: parentX + 100,
        startY: parentY + 20,
        endX: x - 60,
        endY: y
    };

    return (
        <>
            <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    </linearGradient>
                </defs>
                <path
                    d={`M ${connectionPoints.startX} ${connectionPoints.startY}
                        C ${connectionPoints.startX + 50} ${connectionPoints.startY},
                          ${connectionPoints.endX - 50} ${connectionPoints.endY},
                          ${connectionPoints.endX} ${connectionPoints.endY}`}
                    fill="none"
                    stroke={`url(#gradient-${node.id})`}
                    strokeWidth={2}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                />
            </svg>
            <MindMapNode
                node={node}
                level={level}
                isSelected={isSelected}
                expandedNodes={expandedNodes}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                onAIExpand={onAIExpand}
                onGenerateDesign={onGenerateDesign}
                x={x}
                y={y}
            />
        </>
    );
}
