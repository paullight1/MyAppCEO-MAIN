import React, { useState } from 'react';
import { 
    X, 
    Plus, 
    Zap,
    MessageSquare,
    Clock,
    GitBranch,
    Send,
    Tag,
    Globe,
    Play,
    Pause,
    Trash2,
    Settings,
    AlertCircle,
    UserPlus,
    Hash
} from 'lucide-react';
import { useAutomation, AutomationNode, AutomationEdge, validateAutomationPayload } from '../hooks/useAutomation';
import { SocialAccount } from '../hooks/useSocialAutomation';

// Helper icon components
const AtSign = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
);

interface AutomationBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    appId: string;
    connectedAccounts: SocialAccount[];
    onSuccess?: () => void;
}

const TRIGGER_TYPES = [
    { id: 'keyword', name: 'Keyword', icon: MessageSquare, description: 'Trigger when user types a keyword' },
    { id: 'new_follower', name: 'New Follower', icon: UserPlus, description: 'Trigger on new follower' },
    { id: 'mention', name: 'Mention', icon: AtSign, description: 'Trigger when mentioned' },
    { id: 'hashtag', name: 'Hashtag', icon: Hash, description: 'Trigger on specific hashtag' },
];

const ACTION_TYPES = [
    { id: 'reply', name: 'Send Reply', icon: Send, description: 'Send a message reply' },
    { id: 'add_tag', name: 'Add Tag', icon: Tag, description: 'Tag the user' },
    { id: 'http_request', name: 'HTTP Request', icon: Globe, description: 'Call external API' },
];

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'twitter', name: 'Twitter/X' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export const AutomationBuilderModal: React.FC<AutomationBuilderModalProps> = ({
    isOpen,
    onClose,
    appId,
    connectedAccounts,
    onSuccess,
}) => {
    const { createAutomation, isLoading } = useAutomation();
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [nodes, setNodes] = useState<AutomationNode[]>([]);
    const [edges, setEdges] = useState<AutomationEdge[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const connectedPlatformIds = connectedAccounts.map(a => a.platform);

    if (!isOpen) return null;

    const addNode = (type: 'trigger' | 'action' | 'condition' | 'delay', data: Record<string, any> = {}) => {
        const newNode: AutomationNode = {
            id: generateId(),
            type,
            data,
            position: { x: 100 + nodes.length * 200, y: 100 },
        };
        setNodes([...nodes, newNode]);
    };

    const updateNodeData = (nodeId: string, data: Record<string, any>) => {
        setNodes(nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
    };

    const deleteNode = (nodeId: string) => {
        setNodes(nodes.filter(n => n.id !== nodeId));
        setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSelectedNode(null);
    };

    const addEdge = (source: string, target: string) => {
        if (!edges.find(e => e.source === source && e.target === target)) {
            setEdges([...edges, { id: generateId(), source, target }]);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Please enter an automation name');
            return;
        }

        try {
            const triggers = nodes
                .filter(n => n.type === 'trigger')
                .map(n => ({
                    type: n.data.triggerType || 'keyword',
                    value: n.data.triggerValue,
                    platform: n.data.platform,
                }));

            const payload = {
                appId,
                name,
                description,
                flowData: { nodes, edges },
                triggers,
            };

            const validationErrors = validateAutomationPayload(payload);
            if (validationErrors.length) {
                setError(validationErrors[0]);
                return;
            }

            setError(null);

            const result = await createAutomation(payload);

            if (result?.data) {
                setSuccess(true);
                setTimeout(() => {
                    handleClose();
                    onSuccess?.();
                }, 1500);
            } else {
                setError('Failed to create automation');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create automation');
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setNodes([]);
        setEdges([]);
        setSelectedNode(null);
        setError(null);
        setSuccess(false);
        onClose();
    };

    const getSelectedNode = () => nodes.find(n => n.id === selectedNode);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-card border border-border rounded-[40px] p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <button 
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                    <X size={20} className="text-muted-foreground" />
                </button>

                <h2 className="text-2xl font-black text-foreground mb-2">Create Automation</h2>
                <p className="text-muted-foreground font-medium mb-6">Build automation flows with triggers and actions.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-500" />
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Automation Name */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Automation Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Welcome New Followers"
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                    />
                </div>

                {/* Node Palette */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Add Nodes</label>
                    <div className="flex gap-3 flex-wrap">
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Triggers</p>
                            <div className="flex gap-2">
                                {TRIGGER_TYPES.map(trigger => (
                                    <button
                                        key={trigger.id}
                                        onClick={() => addNode('trigger', { triggerType: trigger.id })}
                                        className="px-4 py-2 bg-accent/10 border border-accent/30 rounded-xl text-sm font-bold text-accent hover:bg-accent/20 transition-all flex items-center gap-2"
                                    >
                                        <Zap size={14} /> {trigger.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Actions</p>
                            <div className="flex gap-2">
                                {ACTION_TYPES.map(action => (
                                    <button
                                        key={action.id}
                                        onClick={() => addNode('action', { actionType: action.id })}
                                        className="px-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold text-foreground hover:border-accent/50 transition-all flex items-center gap-2"
                                    >
                                        <Send size={14} /> {action.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flow Canvas */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Automation Flow</label>
                    <div className="min-h-[300px] bg-muted/30 border-2 border-dashed border-border rounded-[32px] p-6">
                        {nodes.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Zap size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="font-bold">Add nodes to build your automation</p>
                                    <p className="text-sm">Click the buttons above to add triggers and actions</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-6 flex-wrap items-start">
                                {nodes.map(node => {
                                    const isTrigger = node.type === 'trigger';
                                    const isAction = node.type === 'action';
                                    
                                    return (
                                        <div
                                            key={node.id}
                                            onClick={() => setSelectedNode(node.id)}
                                            className={`p-4 rounded-2xl min-w-[200px] cursor-pointer transition-all ${
                                                selectedNode === node.id 
                                                    ? 'bg-accent/20 border-2 border-accent' 
                                                    : 'bg-card border-2 border-border hover:border-accent/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                {isTrigger && <Zap size={16} className="text-accent" />}
                                                {isAction && <Send size={16} className="text-blue-500" />}
                                                <span className="font-bold text-foreground capitalize">{node.type}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                                                    className="ml-auto p-1 text-muted-foreground hover:text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            
                                            {node.type === 'trigger' && (
                                                <div className="space-y-2">
                                                    <select
                                                        value={node.data.triggerType || ''}
                                                        onChange={(e) => updateNodeData(node.id, { triggerType: e.target.value })}
                                                        className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">Select trigger</option>
                                                        {TRIGGER_TYPES.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                    {['keyword', 'mention', 'hashtag'].includes(node.data.triggerType) && (
                                                        <input
                                                            type="text"
                                                            placeholder={`${node.data.triggerType} to match`}
                                                            value={node.data.triggerValue || ''}
                                                            onChange={(e) => updateNodeData(node.id, { triggerValue: e.target.value })}
                                                            className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    <select
                                                        value={node.data.platform || ''}
                                                        onChange={(e) => updateNodeData(node.id, { platform: e.target.value })}
                                                        className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">All platforms</option>
                                                        {PLATFORMS.filter(p => connectedPlatformIds.includes(p.id as any)).map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            
                                            {node.type === 'action' && (
                                                <div className="space-y-2">
                                                    <select
                                                        value={node.data.actionType || ''}
                                                        onChange={(e) => updateNodeData(node.id, { actionType: e.target.value })}
                                                        className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">Select action</option>
                                                        {ACTION_TYPES.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name}</option>
                                                        ))}
                                                    </select>
                                                    {node.data.actionType === 'reply' && (
                                                        <textarea
                                                            placeholder="Message to send"
                                                            value={node.data.message || ''}
                                                            onChange={(e) => updateNodeData(node.id, { message: e.target.value })}
                                                            className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground resize-none"
                                                            rows={2}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    {node.data.actionType === 'add_tag' && (
                                                        <input
                                                            type="text"
                                                            placeholder="Tag to add (comma separated)"
                                                            value={node.data.tags || ''}
                                                            onChange={(e) => updateNodeData(node.id, { tags: e.target.value })}
                                                            className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    {node.data.actionType === 'http_request' && (
                                                        <>
                                                            <input
                                                                type="url"
                                                                placeholder="https://api.example.com/webhook"
                                                                value={node.data.httpUrl || ''}
                                                                onChange={(e) => updateNodeData(node.id, { httpUrl: e.target.value })}
                                                                className="w-full px-2 py-1 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <p className="text-[10px] text-muted-foreground">Credentials must be stored on the backend, not in this form.</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Description (optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this automation does..."
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent resize-none"
                        rows={2}
                    />
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isLoading || !name || nodes.length === 0}
                    className="w-full py-4 bg-accent text-accent-foreground rounded-2xl font-black text-sm hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>Creating...</>
                    ) : success ? (
                        <>Automation created!</>
                    ) : (
                        <>
                            <Zap size={18} />
                            Create Automation
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
