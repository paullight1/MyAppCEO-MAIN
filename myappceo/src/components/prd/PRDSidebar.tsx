import { X, Clock, CheckCircle, AlertCircle, Sparkles, Palette, FileText, GitBranch, CheckSquare, Monitor } from 'lucide-react';
import { PRDNode, NodeStatus, nodeTypeIcons, PRDValidationResult } from './types';
import { validateUrl } from '../../utils/security';

interface PRDSidebarProps {
    node: PRDNode | null;
    onClose: () => void;
    onEdit: () => void;
    onAIExpand: () => void;
    onRefine: () => void;
    onValidate: () => void;
    onGenerateDesign: () => void;
    onGenerateScreen?: () => void;
    validation?: PRDValidationResult | null;
    isBusy?: boolean;
}

const statusConfig: Record<NodeStatus, { icon: typeof Clock; label: string; color: string }> = {
    pending: { icon: Clock, label: 'Pending', color: 'text-gray-500' },
    needs_review: { icon: AlertCircle, label: 'Needs Review', color: 'text-yellow-500' },
    approved: { icon: CheckCircle, label: 'Approved', color: 'text-green-500' }
};

export function PRDSidebar({ node, onClose, onEdit, onAIExpand, onRefine, onValidate, onGenerateDesign, onGenerateScreen, validation, isBusy }: PRDSidebarProps) {
    if (!node) return null;

    const status = statusConfig[node.status];
    const StatusIcon = status.icon;
    const childrenCount = countAllChildren(node);
    const selectedValidation = validation?.nodeIssues?.find((item) => item.nodeId === node.id);
    const selectedIssues = selectedValidation?.issues || [];
    const selectedReadyCount = selectedIssues.length === 0 ? 1 : 0;
    const selectedMissingCount = selectedIssues.length;

    function countAllChildren(n: PRDNode): number {
        return n.children.reduce((count, child) => count + 1 + countAllChildren(child), 0);
    }

    return (
        <div className="w-80 bg-white dark:bg-gray-800 border-l flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-lg">Node Details</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{nodeTypeIcons[node.type]}</span>
                        <span className="text-sm text-gray-500 capitalize">{node.type}</span>
                    </div>
                    <h3 className="text-xl font-bold">{node.label}</h3>
                </div>

                <div className="flex items-center gap-2">
                    <StatusIcon size={16} className={status.color} />
                    <span className={`text-sm font-medium ${status.color}`}>
                        {status.label}
                    </span>
                </div>

                {node.description && (
                    <div>
                        <h4 className="text-sm font-medium mb-2 text-gray-500">Description</h4>
                        <p className="text-sm">{node.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold">{node.children.length}</div>
                        <div className="text-xs text-gray-500">Direct Children</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold">{childrenCount}</div>
                        <div className="text-xs text-gray-500">Total Nodes</div>
                    </div>
                </div>

                {node.designGenerated && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Palette size={16} />
                            <span className="text-sm font-medium">Design Generated</span>
                        </div>
                        {node.designUrl && validateUrl(node.designUrl) && (
                            <a
                                href={node.designUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline mt-1 block"
                            >
                                View Design →
                            </a>
                        )}
                    </div>
                )}

                {node.aiSuggestions && node.aiSuggestions.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-2 text-gray-500 flex items-center gap-1">
                            <Sparkles size={14} className="text-purple-500" />
                            AI Suggestions ({node.aiSuggestions.length})
                        </h4>
                        <ul className="space-y-1">
                            {node.aiSuggestions.slice(0, 3).map((suggestion, i) => (
                                <li key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                    • {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <CheckSquare size={14} />
                        Build Readiness
                    </h4>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 p-2">
                                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{selectedReadyCount}</div>
                                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Ready</div>
                            </div>
                            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-2">
                                <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{selectedMissingCount}</div>
                                <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80">Missing</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Validation</span>
                            <span className="font-semibold capitalize">{(node.validationStatus || 'needs_review').replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                            <div className="text-gray-500 mb-1">Node Issues</div>
                            {selectedIssues.length > 0 ? (
                                <ul className="space-y-1">
                                    {selectedIssues.map((issue, i) => (
                                        <li key={`${issue.field}-${i}`} className={issue.severity === 'error' ? 'text-red-600 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}>
                                            <span className="font-medium">{issue.field}:</span> {issue.message}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-emerald-700 dark:text-emerald-300">No validation issues for this node</p>
                            )}
                        </div>
                        <div>
                            <div className="text-gray-500 mb-1">Acceptance Criteria</div>
                            {node.acceptanceCriteria?.length ? (
                                <ul className="space-y-1">
                                    {node.acceptanceCriteria.slice(0, 4).map((item, i) => (
                                        <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-yellow-600 dark:text-yellow-400">Missing criteria</p>
                            )}
                        </div>
                        {!!node.dependencies?.length && (
                            <div>
                                <div className="text-gray-500 mb-1 flex items-center gap-1">
                                    <GitBranch size={12} />
                                    Dependencies
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">{node.dependencies.join(', ')}</p>
                            </div>
                        )}
                        {!!node.apiContracts?.length && (
                            <div>
                                <div className="text-gray-500 mb-1">API Contracts</div>
                                <p className="text-gray-700 dark:text-gray-300">{node.apiContracts.slice(0, 3).join(', ')}</p>
                            </div>
                        )}
                        {!!node.dataEntities?.length && (
                            <div>
                                <div className="text-gray-500 mb-1">Data Entities</div>
                                <p className="text-gray-700 dark:text-gray-300">{node.dataEntities.slice(0, 3).join(', ')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {(node.screenArtifactId || node.screenStatus) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <Monitor size={16} />
                            <span className="text-sm font-medium">Screen {node.screenStatus || 'linked'}</span>
                        </div>
                        {node.screenArtifactId && (
                            <p className="text-xs text-blue-700/80 dark:text-blue-200/80 mt-1">
                                Artifact: {node.screenArtifactId}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 border-t space-y-2">
                <button
                    onClick={onEdit}
                    className="w-full flex items-center justify-center gap-2 py-2 
                               bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                    <FileText size={16} />
                    Edit Details
                </button>
                <button
                    disabled={isBusy}
                    onClick={onRefine}
                    className="w-full flex items-center justify-center gap-2 py-2 
                               border border-emerald-500 text-emerald-600 hover:bg-emerald-50
                               dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Sparkles size={16} />
                    Refine Node
                </button>
                <button
                    disabled={isBusy}
                    onClick={onAIExpand}
                    className="w-full flex items-center justify-center gap-2 py-2 
                               border border-purple-500 text-purple-500 hover:bg-purple-50 
                               dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Sparkles size={16} />
                    AI Expand
                </button>
                <button
                    disabled={isBusy}
                    onClick={onValidate}
                    className="w-full flex items-center justify-center gap-2 py-2 
                               border border-amber-500 text-amber-600 hover:bg-amber-50
                               dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <CheckSquare size={16} />
                    Validate
                </button>
                {onGenerateScreen && (
                    <button
                        disabled={isBusy}
                        onClick={onGenerateScreen}
                        className="w-full flex items-center justify-center gap-2 py-2 
                                   border border-blue-500 text-blue-600 hover:bg-blue-50
                                   dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Monitor size={16} />
                        Generate Screen
                    </button>
                )}
                <button
                    disabled={isBusy}
                    onClick={onGenerateDesign}
                    className="w-full flex items-center justify-center gap-2 py-2 
                               border border-pink-500 text-pink-500 hover:bg-pink-50 
                               dark:hover:bg-pink-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Palette size={16} />
                    Generate Design
                </button>
            </div>
        </div>
    );
}
