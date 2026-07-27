export type NodeType = 'root' | 'page' | 'feature' | 'component' | 'action' | 'requirements' | 'technical_spec' | 'section';
export type NodeStatus = 'pending' | 'approved' | 'needs_review';
export type PRDValidationStatus = 'ready' | 'missing_requirements' | 'needs_review';

export interface PRDNodeIssue {
    field: string;
    severity: 'warning' | 'error' | string;
    message: string;
}

export interface PRDValidationResult {
    summary?: {
        totalNodes: number;
        ready: number;
        missing: number;
        needsReview: number;
        blocked: number;
    };
    nodeIssues?: Array<{
        nodeId: string;
        label?: string;
        issues: PRDNodeIssue[];
    }>;
    readyNodeIds?: string[];
}

export interface PRDVersionMetadata {
    id?: string;
    version: number;
    createdAt?: string | Date;
    generatedBy?: string | null;
    isCurrent?: boolean;
}

export interface PRDNode {
    id: string;
    type: NodeType;
    label: string;
    description?: string;
    children: PRDNode[];
    status: NodeStatus;
    designGenerated: boolean;
    designUrl?: string;
    aiSuggestions?: string[];
    dependencies?: string[];
    acceptanceCriteria?: string[];
    apiContracts?: string[];
    dataEntities?: string[];
    reviewNotes?: string[];
    screenId?: string;
    screenStatus?: 'not_generated' | 'generating' | 'generated' | 'failed' | string;
    screenUrl?: string;
    screenArtifactId?: string;
    validationStatus?: PRDValidationStatus;
    version?: number;
}

export const defaultPRDStructure: PRDNode = {
    id: 'root',
    type: 'root',
    label: 'MVPLAB Marketplace',
    status: 'approved',
    designGenerated: true,
    children: [
        {
            id: 'home',
            type: 'page',
            label: 'Home Screen',
            status: 'approved',
            designGenerated: false,
            children: [
                { id: 'hero', type: 'feature', label: 'Hero Section', status: 'approved', designGenerated: false, children: [] },
                { id: 'featured', type: 'feature', label: 'Featured Items', status: 'pending', designGenerated: false, children: [] },
                { id: 'quick-actions', type: 'feature', label: 'Quick Actions', status: 'pending', designGenerated: false, children: [] },
                { id: 'bottom-nav', type: 'feature', label: 'Bottom Navigation', status: 'approved', designGenerated: false, children: [] }
            ]
        },
        {
            id: 'search',
            type: 'page',
            label: 'Search/Discovery',
            status: 'approved',
            designGenerated: false,
            children: [
                { id: 'search-bar', type: 'feature', label: 'Search Bar', status: 'approved', designGenerated: false, children: [] },
                { id: 'filters', type: 'feature', label: 'Filters', status: 'pending', designGenerated: false, children: [] },
                { id: 'results', type: 'feature', label: 'Results Grid', status: 'pending', designGenerated: false, children: [] }
            ]
        },
        {
            id: 'profile',
            type: 'page',
            label: 'Profile',
            status: 'approved',
            designGenerated: false,
            children: [
                { id: 'user-info', type: 'feature', label: 'User Info', status: 'approved', designGenerated: false, children: [] },
                { id: 'settings', type: 'feature', label: 'Settings', status: 'pending', designGenerated: false, children: [] },
                { id: 'activity', type: 'feature', label: 'Activity History', status: 'pending', designGenerated: false, children: [] }
            ]
        },
        {
            id: 'details',
            type: 'page',
            label: 'Details Page',
            status: 'approved',
            designGenerated: false,
            children: [
                { id: 'media-gallery', type: 'feature', label: 'Media Gallery', status: 'pending', designGenerated: false, children: [] },
                { id: 'info', type: 'feature', label: 'Information', status: 'pending', designGenerated: false, children: [] },
                { id: 'actions', type: 'feature', label: 'Actions', status: 'pending', designGenerated: false, children: [] }
            ]
        },
        {
            id: 'app-settings',
            type: 'page',
            label: 'Settings',
            status: 'approved',
            designGenerated: false,
            children: [
                { id: 'preferences', type: 'feature', label: 'Preferences', status: 'pending', designGenerated: false, children: [] },
                { id: 'notifications', type: 'feature', label: 'Notifications', status: 'pending', designGenerated: false, children: [] },
                { id: 'account', type: 'feature', label: 'Account', status: 'pending', designGenerated: false, children: [] }
            ]
        }
    ]
};

export const nodeTypeIcons: Record<string, string> = {
    root: '🎯',
    page: '📱',
    feature: '⚡',
    component: '🧩',
    action: '🎯'
};

export const nodeTypeColors: Record<string, string> = {
    root: 'from-purple-600 to-blue-600',
    page: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    feature: 'border-gray-400 bg-gray-50 dark:bg-gray-800/50',
    component: 'border-gray-300 bg-white dark:bg-gray-700',
    action: 'border-dashed border-gray-400 bg-transparent'
};
