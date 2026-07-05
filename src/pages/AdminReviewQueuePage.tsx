import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import {
    CheckCircle2, XCircle, Eye,
    DollarSign, TrendingUp, Calendar, Loader2,
    ShieldCheck, FileText, Search,
    Check, X, Code2, ExternalLink, GitPullRequest, ClipboardList,
    PlayCircle, AlertTriangle, PauseCircle, MessageSquareWarning
} from 'lucide-react';
import { apiPost } from '../lib/apiClient';
import { Listing } from '../../../../packages/types/src';
import { useAdminReviewQueue } from '../hooks/useAdminOperations';
import { validateUrl } from '../utils/security';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
    ConfirmDialog, StatTile, ProgressBar, EmptyState, LoadingState, StatusBadge,
} from '../components/ui';
import { formatCurrency, formatNumber, formatRelativeTime } from '../utils/format';

type QueueType = 'listing' | 'generated_code' | 'app_submission' | 'talent_portfolio' | 'ugc_submission' | 'legal_application';
type ReviewStatus = 'all' | 'pending_review' | 'under_review' | 'changes_requested' | 'rejected';
type AssignmentFilter = 'all' | 'assigned' | 'unassigned';
type ReviewModalTab = 'overview' | 'prd' | 'artifact' | 'quality' | 'repo' | 'decision';

interface PendingListing extends Partial<Listing> {
    id: string;
    name: string;
    category: string;
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    askingPrice: number | null;
    monthlyRevenue: number | null;
    revenueVerified: boolean;
    listingType: import('../../../../packages/types/src').ListingType;
    submittedAt: string;
    status: 'pending_review' | 'under_review';
    reviewStage: 'initial' | 'technical' | 'financial' | 'final';
    reviewerId?: string | null;
    assignedTo?: string | null;
}

interface EvidenceBundle {
    artifact?: {
        name?: string;
        artifactType?: string;
        version?: number;
        createdAt?: string;
    } | null;
    qualityReport?: {
        status?: string;
        lintStatus?: string;
        typecheckStatus?: string;
        testStatus?: string;
        securityStatus?: string;
        accessibilityStatus?: string;
        summary?: string;
        logs?: unknown;
    } | null;
    sandboxReport?: {
        status?: string;
        reportUrl?: string;
        summary?: string;
        logs?: unknown;
    } | null;
    idea?: {
        title?: string;
        slug?: string;
        description?: string;
    } | null;
    repoLinks?: Array<{
        repoUrl?: string;
        pullRequestUrl?: string;
        branch?: string;
        commitSha?: string;
    }>;
    deployments?: Array<{
        platform?: string;
        status?: string;
        storeUrl?: string;
        downloadUrl?: string;
        version?: string;
        buildNumber?: number;
        notes?: string;
        metadata?: Record<string, unknown>;
    }>;
    links?: {
        repositoryUrls?: string[];
        pullRequestUrls?: string[];
        deploymentUrls?: string[];
    };
}

interface ReviewSubmission {
    id: string;
    itemType: Exclude<QueueType, 'listing'>;
    status: 'submitted' | 'pending_review' | 'under_review' | 'changes_requested' | 'approved' | 'rejected';
    submittedAt: string;
    updatedAt?: string;
    decisionReason?: string | null;
    reviewerId?: string | null;
    assignedTo?: string | null;
    evidenceBundle?: EvidenceBundle | null;
    talentId?: string;
    submitterId?: string;
    skills?: string[];
    bio?: string;
    portfolioLinks?: string[];
    hourlyRate?: string | number | null;
    platform?: string;
    mediaUrl?: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    followers?: number;
    userId?: string;
    licenseTypeId?: string;
    licenseName?: string;
    licenseCategory?: string;
    issuingAuthority?: string;
    country?: string;
    applicationData?: {
        personalInfo?: Record<string, string>;
        businessInfo?: Record<string, string>;
        licenseSpecific?: Record<string, string>;
        requiredDocuments?: string[];
        reviewChecklist?: string[];
    };
    documents?: Array<{
        id?: string;
        documentType?: string;
        document_type?: string;
        fileUrl?: string;
        file_url?: string;
        uploadedAt?: string;
        uploaded_at?: string;
    }>;
}

type ReviewQueueItem = PendingListing | ReviewSubmission;
type CreatorReviewSubmission = ReviewSubmission & { itemType: 'talent_portfolio' | 'ugc_submission' };
type LegalReviewSubmission = ReviewSubmission & { itemType: 'legal_application' };



const REVIEW_STAGES = [
    { id: 'initial', label: 'Initial Review', description: 'Basic completeness check' },
    { id: 'technical', label: 'Technical Audit', description: 'App functionality & code' },
    { id: 'financial', label: 'Financial Verification', description: 'Revenue claims validation' },
    { id: 'final', label: 'Final Approval', description: 'Policy & terms review' },
];

const REJECTION_REASONS = [
    'Incomplete information',
    'Revenue claims cannot be verified',
    'App does not meet quality standards',
    'Prohibited content or category',
    'Suspicious or fraudulent activity',
    'Missing required documentation',
    'Price unrealistic for market',
    'Seller verification failed',
];

const QUEUE_TABS: Array<{ id: QueueType; label: string; description: string }> = [
    { id: 'listing', label: 'Listings', description: 'Marketplace listing submissions' },
    { id: 'generated_code', label: 'Generated Code', description: 'AI-generated code reviews' },
    { id: 'app_submission', label: 'App Submissions', description: 'Deployment-ready app reviews' },
    { id: 'talent_portfolio', label: 'Talent', description: 'Creator portfolio reviews' },
    { id: 'ugc_submission', label: 'UGC', description: 'Creator content submissions' },
    { id: 'legal_application', label: 'Legal', description: 'License and registration applications' },
];

const REVIEW_MODAL_TABS: Array<{ id: ReviewModalTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'prd', label: 'PRD/Idea' },
    { id: 'artifact', label: 'Artifact' },
    { id: 'quality', label: 'Quality' },
    { id: 'repo', label: 'Repo/Preview' },
    { id: 'decision', label: 'Decision' },
];

const isListing = (item: ReviewQueueItem): item is PendingListing => !('itemType' in item);
const isReviewSubmission = (item: ReviewQueueItem): item is ReviewSubmission => 'itemType' in item;
const isCreatorQueueType = (type: QueueType) => type === 'talent_portfolio' || type === 'ugc_submission';
const isLegalQueueType = (type: QueueType) => type === 'legal_application';
const isCreatorReview = (item: ReviewQueueItem): item is CreatorReviewSubmission => (
    isReviewSubmission(item) && isCreatorQueueType(item.itemType)
);
const isLegalReview = (item: ReviewQueueItem): item is LegalReviewSubmission => (
    isReviewSubmission(item) && item.itemType === 'legal_application'
);

const getQueueItemType = (item: ReviewQueueItem, fallback: QueueType): QueueType => (
    isReviewSubmission(item) ? item.itemType : fallback
);

const formatLabel = (value?: string | null) => {
    if (!value) return 'Not provided';
    return value
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getEvidenceTitle = (item: ReviewQueueItem) => {
    if (isListing(item)) return item.name;
    if (item.itemType === 'legal_application') return item.licenseName || 'Legal application';
    if (item.itemType === 'talent_portfolio') return item.bio || 'Talent portfolio';
    if (item.itemType === 'ugc_submission') return item.caption || `${formatLabel(item.platform)} content`;
    return item.evidenceBundle?.idea?.title || item.evidenceBundle?.artifact?.name || 'Untitled submission';
};

const getEvidenceSubtitle = (item: ReviewQueueItem) => {
    if (isListing(item)) return `${item.category} review`;
    if (item.itemType === 'legal_application') return `${formatLabel(item.licenseCategory)} license review${item.country ? ` - ${item.country}` : ''}`;
    if (item.itemType === 'talent_portfolio') return `${item.skills?.slice(0, 3).join(', ') || 'Creator profile'} review`;
    if (item.itemType === 'ugc_submission') return `${formatLabel(item.platform)} UGC review`;
    const artifactType = item.evidenceBundle?.artifact?.artifactType;
    return `${formatLabel(item.itemType)}${artifactType ? ` - ${formatLabel(artifactType)}` : ''}`;
};

const safeExternalUrl = (url?: string | null) => (url && validateUrl(url) ? url : '');
const getFirstUrl = (...values: Array<string | undefined | null>) =>
    values.map(safeExternalUrl).find(Boolean) || '';

const isPassed = (value?: string | null) => ['passed', 'pass', 'success', 'succeeded', 'approved'].includes((value || '').toLowerCase());
const isFailed = (value?: string | null) => ['failed', 'fail', 'error', 'rejected'].includes((value || '').toLowerCase());

const getEvidenceLinks = (evidence?: EvidenceBundle | null) => ({
    repoUrl: getFirstUrl(evidence?.links?.repositoryUrls?.[0], evidence?.repoLinks?.[0]?.repoUrl),
    prUrl: getFirstUrl(evidence?.links?.pullRequestUrls?.[0], evidence?.repoLinks?.[0]?.pullRequestUrl),
    previewUrl: getFirstUrl(
        evidence?.links?.deploymentUrls?.[0],
        evidence?.deployments?.[0]?.storeUrl,
        evidence?.deployments?.[0]?.downloadUrl,
    ),
    sandboxUrl: safeExternalUrl(evidence?.sandboxReport?.reportUrl),
});

const getChecklistItems = (item: ReviewQueueItem) => {
    if (isListing(item)) {
        return [
            { label: 'App name and description are complete and accurate', complete: Boolean(item.name && (item.longDescription || item.shortDescription)) },
            { label: 'Revenue claims are plausible or verified', complete: !item.monthlyRevenue || item.revenueVerified },
            { label: 'No prohibited content or policy violations', complete: true },
            { label: 'Pricing is realistic for the market', complete: Boolean(item.askingPrice) },
            { label: 'App age and metrics are consistent', complete: true },
            { label: 'Seller account is verified and in good standing', complete: Boolean(item.sellerName && item.sellerEmail) },
        ];
    }

    if (item.itemType === 'talent_portfolio') {
        return [
            { label: 'Creator bio or skills attached', complete: Boolean(item.bio || item.skills?.length) },
            { label: 'Portfolio evidence attached', complete: Boolean(item.portfolioLinks?.length) },
            { label: 'Review can identify the creator profile', complete: Boolean(item.talentId || item.submitterId) },
        ];
    }

    if (item.itemType === 'ugc_submission') {
        return [
            { label: 'Media URL attached', complete: Boolean(item.mediaUrl) },
            { label: 'Platform selected', complete: Boolean(item.platform) },
            { label: 'Caption or context attached', complete: Boolean(item.caption) },
        ];
    }

    if (item.itemType === 'legal_application') {
        const applicationData = item.applicationData || {};
        const personalInfo = applicationData.personalInfo || {};
        const businessInfo = applicationData.businessInfo || {};
        const licenseSpecific = applicationData.licenseSpecific || {};
        const requiredDocuments = applicationData.requiredDocuments || [];
        const uploadedDocuments = item.documents || [];

        return [
            { label: 'Applicant name, email, and phone attached', complete: Boolean(personalInfo.fullName && personalInfo.email && personalInfo.phone) },
            { label: 'Business name, type, and address attached', complete: Boolean(businessInfo.businessName && businessInfo.businessType && businessInfo.businessAddress) },
            { label: 'License-specific answers captured', complete: Object.values(licenseSpecific).every(Boolean) },
            { label: 'Required document checklist attached', complete: requiredDocuments.length > 0 },
            { label: 'All required documents uploaded', complete: requiredDocuments.length > 0 && uploadedDocuments.length >= requiredDocuments.length },
        ];
    }

    const evidence = item.evidenceBundle;
    const report = evidence?.qualityReport;
    const links = getEvidenceLinks(evidence);
    const qualityChecks = [
        report?.status,
        report?.lintStatus,
        report?.typecheckStatus,
        report?.testStatus,
        report?.securityStatus,
        report?.accessibilityStatus,
    ].filter(Boolean);
    const qualityPassed = Boolean(report) && isPassed(report?.status) && !qualityChecks.some(isFailed);

    if (item.itemType === 'generated_code') {
        return [
            { label: 'Artifact bundle attached', complete: Boolean(evidence?.artifact?.name) },
            { label: 'Quality report passed', complete: qualityPassed },
            { label: 'Sandbox/report evidence attached', complete: Boolean(evidence?.sandboxReport || report?.logs || report?.summary) },
            { label: 'Repository link attached', complete: Boolean(links.repoUrl) },
            { label: 'Pull request link attached', complete: Boolean(links.prUrl) },
            { label: 'Preview or deployment link attached', complete: Boolean(links.previewUrl) },
        ];
    }

    return [
        { label: 'Submission idea or PRD attached', complete: Boolean(evidence?.idea?.title || evidence?.idea?.description) },
        { label: 'Artifact attached', complete: Boolean(evidence?.artifact?.name) },
        { label: 'Quality report passed', complete: qualityPassed },
        { label: 'Repository or source link attached', complete: Boolean(links.repoUrl) },
        { label: 'Preview, store, or download link attached', complete: Boolean(links.previewUrl) },
    ];
};

const getApprovalGate = (item: ReviewQueueItem) => {
    const missing = getChecklistItems(item).filter(check => !check.complete).map(check => check.label);
    return {
        canApprove: missing.length === 0,
        reasons: missing,
    };
};

const summarizeLogs = (logs: unknown) => {
    if (!logs) return 'No logs were attached to this quality report.';
    if (typeof logs === 'string') return logs.slice(0, 260);
    if (Array.isArray(logs)) {
        if (logs.length === 0) return 'No log entries were attached to this quality report.';
        return logs
            .slice(0, 4)
            .map((entry) => {
                if (typeof entry === 'string') return entry;
                if (entry && typeof entry === 'object') {
                    const record = entry as Record<string, unknown>;
                    return String(record.message || record.summary || record.status || JSON.stringify(record));
                }
                return String(entry);
            })
            .join('\n');
    }
    if (typeof logs === 'object') {
        const record = logs as Record<string, unknown>;
        const summary = record.summary || record.message || record.output;
        return summary ? String(summary).slice(0, 260) : JSON.stringify(record).slice(0, 260);
    }
    return String(logs).slice(0, 260);
};

export const AdminReviewQueuePage: React.FC = () => {
    const [items, setItems] = useState<ReviewQueueItem[]>([]);
    const [activeQueueType, setActiveQueueType] = useState<QueueType>('listing');
    const [filter, setFilter] = useState<ReviewStatus>('all');
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
    const [activeReviewTab, setActiveReviewTab] = useState<ReviewModalTab>('overview');
    const [reviewModal, setReviewModal] = useState(false);
    const [rejectionModal, setRejectionModal] = useState(false);
    const [holdItem, setHoldItem] = useState<ReviewQueueItem | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isCreatorQueue = isCreatorQueueType(activeQueueType);
    const isLegalQueue = isLegalQueueType(activeQueueType);
    const queueStatusQuery = activeQueueType === 'listing'
        ? 'pending_review,under_review'
        : isCreatorQueue
            ? 'pending_review,rejected'
            : isLegalQueue
                ? 'pending_review,under_review,rejected'
                : 'pending_review,changes_requested,under_review';
    const {
        items: queueItems,
        meta: queueMeta,
        isLoading,
        error: queueError,
        refetch: fetchQueueItems,
    } = useAdminReviewQueue<any>({
        type: activeQueueType,
        status: queueStatusQuery,
    });

    useEffect(() => {
        setFilter('all');
        setAssignmentFilter('all');
        setSearchQuery('');
    }, [activeQueueType]);

    useEffect(() => {
        setItems(queueItems.map((item: any) => {
            if (activeQueueType === 'listing') {
                return {
                    ...item,
                    name: item.name || 'Unnamed Listing',
                    category: item.category || 'Uncategorized',
                    sellerId: item.sellerId || item.seller_id || '',
                    sellerName: item.sellerName || item.seller_name || 'Unknown',
                    sellerEmail: item.sellerEmail || item.seller_email || 'N/A',
                    askingPrice: item.askingPrice ?? item.asking_price ?? null,
                    monthlyRevenue: item.monthlyRevenue ?? item.monthly_revenue ?? null,
                    revenueVerified: Boolean(item.revenueVerified ?? item.revenue_verified),
                    submittedAt: item.submittedAt || item.submitted_at || item.createdAt || item.created_at || new Date().toISOString(),
                    status: item.status === 'under_review' ? 'under_review' : 'pending_review',
                    reviewStage: item.reviewStage || item.review_stage || 'initial',
                    reviewerId: item.reviewerId || item.reviewer_id || item.approved_by || null,
                    assignedTo: item.assignedTo || item.assigned_to || null,
                    ageMonths: item.ageMonths || item.age || 0,
                    longDescription: item.longDescription || item.long_description || item.description || item.shortDescription || 'No description available.',
                };
            }

            return {
                ...item,
                itemType: item.itemType || item.item_type || activeQueueType,
                status: item.status === 'submitted' ? 'pending_review' : item.status || 'pending_review',
                submittedAt: item.submittedAt || item.submitted_at || item.createdAt || item.created_at || new Date().toISOString(),
                reviewerId: item.reviewerId || item.reviewer_id || null,
                assignedTo: item.assignedTo || item.assigned_to || null,
                evidenceBundle: item.evidenceBundle || item.evidence_bundle || null,
                userId: item.userId || item.user_id,
                licenseTypeId: item.licenseTypeId || item.license_type_id,
                licenseName: item.licenseName || item.license_name || item.license_type?.name,
                licenseCategory: item.licenseCategory || item.license_category || item.license_type?.category,
                issuingAuthority: item.issuingAuthority || item.issuing_authority || item.license_type?.issuing_authority,
                country: item.country,
                applicationData: item.applicationData || item.application_data || null,
                documents: item.documents || [],
            };
        }));
    }, [activeQueueType, queueItems]);

    const filteredItems = items.filter(item => {
        const title = getEvidenceTitle(item);
        const owner = isListing(item) ? item.sellerName : getEvidenceSubtitle(item);
        const legalSearch = isLegalReview(item)
            ? [
                item.applicationData?.personalInfo?.fullName,
                item.applicationData?.personalInfo?.email,
                item.applicationData?.businessInfo?.businessName,
                item.issuingAuthority,
            ].filter(Boolean).join(' ')
            : '';
        const matchesFilter = filter === 'all' || item.status === filter;
        const isAssigned = Boolean(item.reviewerId || item.assignedTo);
        const matchesAssignment = assignmentFilter === 'all' || (assignmentFilter === 'assigned' ? isAssigned : !isAssigned);
        const matchesSearch = searchQuery === '' ||
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
            legalSearch.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesAssignment && matchesSearch;
    });

    const handleApprove = async (item: ReviewQueueItem) => {
        const gate = getApprovalGate(item);
        if (!gate.canApprove) {
            setError(`Approval is disabled until evidence is complete: ${gate.reasons.join(', ')}`);
            return;
        }
        setProcessing(item.id);
        try {
            await apiPost('/admin/moderation/decide', {
                itemId: item.id,
                itemType: getQueueItemType(item, activeQueueType),
                action: 'approve',
            });
            setItems(prev => prev.filter(l => l.id !== item.id));
            setReviewModal(false);
            setSelectedItem(null);
            fetchQueueItems();
        } catch (err: any) {
            setError(err.message || 'Failed to approve item');
        } finally {
            setProcessing(null);
        }
    };

    const handleClaim = async (item: ReviewQueueItem) => {
        setProcessing(item.id);
        setError(null);
        try {
            const itemType = getQueueItemType(item, activeQueueType);
            await apiPost(`/admin/moderation/${itemType}/${item.id}/claim`, {});
            const nextItem = isListing(item) || isLegalReview(item) ? { ...item, status: 'under_review' as const } : item;
            setItems(prev => prev.map(queueItem => queueItem.id === item.id ? nextItem : queueItem));
            setSelectedItem(nextItem);
            setActiveReviewTab('overview');
            setReviewModal(true);
        } catch (err: any) {
            setError(err.message || 'Failed to claim item');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!selectedItem) return;
        setProcessing(selectedItem.id);
        try {
            await apiPost('/admin/moderation/decide', {
                itemId: selectedItem.id,
                itemType: getQueueItemType(selectedItem, activeQueueType),
                action: 'reject',
                reason: rejectionReason || customReason,
            });
            setItems(prev => prev.filter(l => l.id !== selectedItem.id));
            setRejectionModal(false);
            setReviewModal(false);
            setSelectedItem(null);
            setRejectionReason('');
            setCustomReason('');
            fetchQueueItems();
        } catch (err: any) {
            setError(err.message || 'Failed to reject item');
        } finally {
            setProcessing(null);
        }
    };

    const handleSecondaryDecision = async (item: ReviewQueueItem, action: 'changes_requested' | 'pause') => {
        if (isListing(item) || isLegalReview(item)) {
            setError('Hold and request changes are only available for generated code, app, talent, and UGC review submissions. Legal applications currently use approve or reject.');
            return;
        }

        const actionLabel = action === 'pause' ? 'hold' : 'request changes';
        setProcessing(item.id);
        setError(null);
        try {
            await apiPost('/admin/moderation/decide', {
                itemId: item.id,
                itemType: getQueueItemType(item, activeQueueType),
                action,
                notes: action === 'pause'
                    ? 'Placed on hold from admin review queue pending additional internal validation.'
                    : 'Changes requested from admin review queue.',
            });
            // `changes_requested` items remain in the queue (the query includes that
            // status), so keep them locally with an updated status rather than removing
            // them — matching what a refetch would return. A `pause` moves the item to
            // `paused`, which is not part of the query, so it is removed.
            setItems(prev => action === 'changes_requested'
                ? prev.map(queueItem => queueItem.id === item.id
                    ? ({ ...queueItem, status: 'changes_requested' } as ReviewQueueItem)
                    : queueItem)
                : prev.filter(queueItem => queueItem.id !== item.id));
            setReviewModal(false);
            setSelectedItem(null);
            fetchQueueItems();
        } catch (err: any) {
            setError(err.message || `Failed to ${actionLabel} item`);
        } finally {
            setProcessing(null);
            setHoldItem(null);
        }
    };

    const getReviewStageProgress = (stage: string) => {
        const idx = REVIEW_STAGES.findIndex(s => s.id === stage);
        return idx + 1;
    };

    const displayError = error || queueError;

    // The right-hand stat tile summarises the queue's secondary status, which
    // differs per queue type. Prefer the server summary; fall back to the list.
    const secondaryStatus: ReviewStatus = activeQueueType === 'listing'
        ? 'under_review'
        : isCreatorQueue || isLegalQueue
            ? 'rejected'
            : 'changes_requested';
    const secondaryLabel = activeQueueType === 'listing'
        ? 'In Review'
        : isCreatorQueue || isLegalQueue
            ? 'Rejected'
            : 'Changes';
    const pendingCount = queueMeta?.summary?.pending_review ?? items.filter(l => l.status === 'pending_review').length;
    const secondaryCount = queueMeta?.summary?.[secondaryStatus] ?? items.filter(l => l.status === secondaryStatus).length;

    const renderEvidenceSummary = (item: ReviewSubmission) => {
        if (item.itemType === 'legal_application') {
            const applicationData = item.applicationData || {};
            const personalInfo = applicationData.personalInfo || {};
            const businessInfo = applicationData.businessInfo || {};
            const licenseSpecific = applicationData.licenseSpecific || {};
            const requiredDocuments = applicationData.requiredDocuments || [];
            const uploadedDocuments = item.documents || [];

            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">License</label>
                            <p className="text-sm font-black text-foreground mt-1">{item.licenseName || 'License not provided'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.issuingAuthority || 'Issuing authority missing'}</p>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Applicant</label>
                            <p className="text-sm font-black text-foreground mt-1">{personalInfo.fullName || 'Name missing'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{personalInfo.email || 'Email missing'}{personalInfo.phone ? ` - ${personalInfo.phone}` : ''}</p>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Business</label>
                            <p className="text-sm font-black text-foreground mt-1">{businessInfo.businessName || 'Business missing'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatLabel(businessInfo.businessType)}{businessInfo.registrationNumber ? ` - ${businessInfo.registrationNumber}` : ''}</p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-muted p-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Business Address</label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{businessInfo.businessAddress || 'No business address attached.'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">License-specific answers</label>
                            <div className="mt-3 space-y-2">
                                {Object.entries(licenseSpecific).length ? Object.entries(licenseSpecific).map(([key, value]) => (
                                    <div key={key} className="flex items-start justify-between gap-3 text-xs">
                                        <span className="font-bold text-muted-foreground">{formatLabel(key)}</span>
                                        <span className="text-right text-foreground">{value || 'Missing'}</span>
                                    </div>
                                )) : (
                                    <p className="text-xs text-muted-foreground">No license-specific questions were captured.</p>
                                )}
                            </div>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Admin checklist</label>
                            <div className="mt-3 space-y-2">
                                {(applicationData.reviewChecklist || []).length ? applicationData.reviewChecklist?.map((check, index) => (
                                    <div key={`${check}-${index}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <span>{check}</span>
                                    </div>
                                )) : (
                                    <p className="text-xs text-muted-foreground">No review checklist attached.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border p-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Required documents</label>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(requiredDocuments.length ? requiredDocuments : ['No required documents listed']).map((documentType) => {
                                const uploaded = uploadedDocuments.find(document => (document.documentType || document.document_type) === documentType);
                                const safeUrl = safeExternalUrl(uploaded?.fileUrl || uploaded?.file_url);
                                return (
                                    <a
                                        key={documentType}
                                        href={safeUrl || undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`rounded-xl border p-3 text-sm font-bold flex items-center gap-2 ${safeUrl
                                            ? 'border-border text-foreground hover:border-border hover:bg-muted'
                                            : 'border-border text-muted-foreground pointer-events-none'
                                            }`}
                                    >
                                        {safeUrl ? <ExternalLink size={15} /> : <AlertTriangle size={15} />}
                                        <span className="truncate">{safeUrl ? documentType : `${documentType} missing`}</span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        if (item.itemType === 'talent_portfolio') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Creator</label>
                            <p className="text-sm font-black text-foreground mt-1">{item.talentId || item.submitterId || 'Unknown creator'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.hourlyRate != null && item.hourlyRate !== '' ? `${formatCurrency(item.hourlyRate, { maximumFractionDigits: 0 })}/hr` : 'Rate not provided'}</p>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Skills</label>
                            <p className="text-sm font-black text-foreground mt-1">{item.skills?.length ? item.skills.join(', ') : 'No skills attached'}</p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-muted p-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bio</label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.bio || 'No creator bio attached.'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(item.portfolioLinks?.length ? item.portfolioLinks : ['']).slice(0, 3).map((url, index) => {
                            const safeUrl = safeExternalUrl(url);
                            return (
                                <a
                                    key={`${url || 'missing'}-${index}`}
                                    href={safeUrl || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`rounded-xl border p-4 text-sm font-bold flex items-center gap-2 ${safeUrl
                                        ? 'border-border text-foreground hover:border-border hover:bg-muted'
                                        : 'border-border text-muted-foreground pointer-events-none'
                                        }`}
                                >
                                    <ExternalLink size={15} />
                                    <span className="truncate">{safeUrl ? `Portfolio ${index + 1}` : 'Portfolio missing'}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (item.itemType === 'ugc_submission') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Platform</label>
                            <p className="text-sm font-black text-foreground mt-1">{formatLabel(item.platform)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.followers ? `${formatNumber(item.followers)} followers` : 'Follower count not provided'}</p>
                        </div>
                        <a
                            href={safeExternalUrl(item.mediaUrl) || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-xl border p-4 text-sm font-bold flex items-center gap-2 ${safeExternalUrl(item.mediaUrl)
                                ? 'border-border text-foreground hover:border-border hover:bg-muted'
                                : 'border-border text-muted-foreground pointer-events-none'
                                }`}
                        >
                            <ExternalLink size={15} />
                            <span className="truncate">{safeExternalUrl(item.mediaUrl) ? 'Open media' : 'Media missing'}</span>
                        </a>
                    </div>

                    {item.thumbnailUrl && (
                        <img src={item.thumbnailUrl} alt="UGC submission thumbnail" className="w-full max-h-72 rounded-xl object-cover border border-border" />
                    )}

                    <div className="rounded-xl bg-muted p-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Caption</label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.caption || 'No caption attached.'}</p>
                    </div>
                </div>
            );
        }

        const evidence = item.evidenceBundle;
        const report = evidence?.qualityReport;
        const artifact = evidence?.artifact;
        const { repoUrl, prUrl, previewUrl } = getEvidenceLinks(evidence);

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Artifact</label>
                        <p className="text-sm font-black text-foreground mt-1">{artifact?.name || 'Missing artifact'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatLabel(artifact?.artifactType)}{artifact?.version ? ` - v${artifact.version}` : ''}</p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quality Report</label>
                        <p className={`text-sm font-black mt-1 ${report?.status === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : report?.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {formatLabel(report?.status)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Lint {formatLabel(report?.lintStatus)} / Tests {formatLabel(report?.testStatus)}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl bg-muted p-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Idea</label>
                    <p className="text-sm font-black text-foreground mt-1">{evidence?.idea?.title || 'No idea title attached'}</p>
                    {evidence?.idea?.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evidence.idea.description}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { label: 'Repository', url: repoUrl, icon: <Code2 size={15} /> },
                        { label: 'Pull Request', url: prUrl, icon: <GitPullRequest size={15} /> },
                        { label: 'Preview', url: previewUrl, icon: <ExternalLink size={15} /> },
                    ].map((link) => (
                        <a
                            key={link.label}
                            href={link.url || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-xl border p-4 text-sm font-bold flex items-center gap-2 transition-colors ${link.url
                                ? 'border-border text-foreground hover:border-border hover:bg-muted'
                                : 'border-border text-muted-foreground pointer-events-none'
                                }`}
                        >
                            {link.icon}
                            <span className="truncate">{link.url ? link.label : `${link.label} missing`}</span>
                        </a>
                    ))}
                </div>

                <div className="rounded-xl border border-border p-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Logs Summary</label>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground font-mono bg-muted rounded-lg p-3 max-h-36 overflow-y-auto">
                        {report?.summary || summarizeLogs(report?.logs)}
                    </pre>
                </div>
            </div>
        );
    };

    const renderReviewTab = (item: ReviewQueueItem) => {
        if (isListing(item)) {
            return (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">App Name</label>
                        <p className="text-lg font-bold text-foreground">{item.name}</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</label>
                        <p className="text-muted-foreground">{item.longDescription || item.shortDescription}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Asking Price</label>
                            <p className="text-muted-foreground">{formatCurrency(item.askingPrice, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly Revenue</label>
                            <p className="text-muted-foreground">{formatCurrency(item.monthlyRevenue, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Revenue Verified</label>
                            <p className={item.revenueVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{item.revenueVerified ? 'Yes' : 'No'}</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Seller</label>
                        <p className="text-muted-foreground">{item.sellerName} ({item.sellerEmail})</p>
                    </div>
                </div>
            );
        }

        const evidence = item.evidenceBundle;
        const report = evidence?.qualityReport;
        const artifact = evidence?.artifact;
        const links = getEvidenceLinks(evidence);
        const checklist = getChecklistItems(item);

        if ((isCreatorReview(item) || isLegalReview(item)) && activeReviewTab !== 'decision') {
            return renderEvidenceSummary(item);
        }

        if (activeReviewTab === 'prd') {
            return (
                <div className="rounded-2xl bg-muted p-5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">PRD / Idea</label>
                    <h3 className="text-lg font-black text-foreground mt-2">{evidence?.idea?.title || 'No idea title attached'}</h3>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{evidence?.idea?.description || 'No PRD or idea description was attached to this submission.'}</p>
                    {evidence?.idea?.slug && <p className="text-xs font-mono text-muted-foreground mt-3">Slug: {evidence.idea.slug}</p>}
                </div>
            );
        }

        if (activeReviewTab === 'artifact') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Name', value: artifact?.name },
                        { label: 'Type', value: formatLabel(artifact?.artifactType) },
                        { label: 'Version', value: artifact?.version ? `v${artifact.version}` : undefined },
                    ].map((field) => (
                        <div key={field.label} className="rounded-2xl border border-border p-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{field.label}</label>
                            <p className="text-sm font-black text-foreground mt-1">{field.value || 'Not provided'}</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (activeReviewTab === 'quality') {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Overall', value: report?.status },
                            { label: 'Lint', value: report?.lintStatus },
                            { label: 'Typecheck', value: report?.typecheckStatus },
                            { label: 'Tests', value: report?.testStatus },
                            { label: 'Security', value: report?.securityStatus },
                            { label: 'Accessibility', value: report?.accessibilityStatus },
                        ].map((field) => (
                            <div key={field.label} className="rounded-xl border border-border p-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{field.label}</p>
                                <p className={`text-sm font-black mt-1 ${isPassed(field.value) ? 'text-emerald-600 dark:text-emerald-400' : isFailed(field.value) ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatLabel(field.value)}</p>
                            </div>
                        ))}
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground font-mono bg-muted rounded-xl p-4 max-h-56 overflow-y-auto">
                        {report?.summary || summarizeLogs(report?.logs)}
                    </pre>
                </div>
            );
        }

        if (activeReviewTab === 'repo') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { label: 'Repository', url: links.repoUrl, icon: <Code2 size={16} /> },
                        { label: 'Pull Request', url: links.prUrl, icon: <GitPullRequest size={16} /> },
                        { label: 'Preview', url: links.previewUrl, icon: <ExternalLink size={16} /> },
                        { label: 'Sandbox Report', url: links.sandboxUrl, icon: <ClipboardList size={16} /> },
                    ].map((link) => (
                        <a
                            key={link.label}
                            href={link.url || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-2xl border p-4 flex items-center gap-3 text-sm font-bold ${link.url ? 'border-border text-foreground hover:bg-muted' : 'border-border text-muted-foreground pointer-events-none'}`}
                        >
                            {link.icon}
                            {link.url ? link.label : `${link.label} missing`}
                        </a>
                    ))}
                </div>
            );
        }

        if (activeReviewTab === 'decision') {
            const gate = getApprovalGate(item);
            return (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-border p-5">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Decision Checklist</p>
                        <div className="space-y-2">
                            {checklist.map((check) => (
                                <div key={check.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {check.complete ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
                                    <span>{check.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {!gate.canApprove && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                            Approval is disabled until required evidence is attached and passing: {gate.reasons.join(', ')}.
                        </div>
                    )}
                </div>
            );
        }

        return renderEvidenceSummary(item);
    };

    return (
        <Layout>
            <div className="space-y-8 pb-20">
                {displayError && (
                    <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-center gap-3">
                        <XCircle size={20} className="text-error" />
                        <p className="text-error font-medium">{displayError}</p>
                        {queueError && (
                            <button onClick={fetchQueueItems} className="ml-auto text-xs font-bold text-error hover:text-error/80">
                                Retry
                            </button>
                        )}
                        <button onClick={() => setError(null)} className="ml-auto text-error/70 hover:text-error" aria-label="Dismiss review queue error">
                            <X size={16} />
                        </button>
                    </div>
                )}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.2em] bg-primary/10 w-fit px-4 py-1.5 rounded-full border border-primary/20">
                            <ShieldCheck size={14} /> Admin Control Panel
                        </div>
                        <h1 className="text-4xl font-black text-foreground">Review Queue</h1>
                        <p className="text-muted-foreground">Review listings, generated code, app submissions, creator submissions, and legal applications before they go live.</p>
                    </div>
                    <div className="flex gap-4">
                        <StatTile label="Pending" value={pendingCount} />
                        <StatTile label={secondaryLabel} value={secondaryCount} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {QUEUE_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveQueueType(tab.id)}
                            aria-pressed={activeQueueType === tab.id}
                            className={`text-left rounded-2xl border p-4 transition-all active:scale-[0.99] ${activeQueueType === tab.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                                }`}
                        >
                            <p className="text-sm font-black">{tab.label}</p>
                            <p className={`text-xs mt-1 ${activeQueueType === tab.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{tab.description}</p>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted p-4 rounded-[2rem] border border-border">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search by app, license, applicant, idea, or seller..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search review queue"
                            className="w-full pl-14 pr-6 py-3.5 bg-card border border-border rounded-[1.5rem] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'pending_review', activeQueueType === 'listing' ? 'under_review' : isCreatorQueueType(activeQueueType) || isLegalQueueType(activeQueueType) ? 'rejected' : 'changes_requested'] as ReviewStatus[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                aria-pressed={filter === f}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${filter === f
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f === 'rejected' ? 'Rejected' : activeQueueType === 'listing' ? 'In Review' : 'Changes'}
                            </button>
                        ))}
                        <select
                            value={assignmentFilter}
                            onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
                            aria-label="Filter by review assignment"
                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All assignees</option>
                            <option value="unassigned">Unassigned</option>
                            <option value="assigned">Assigned</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <LoadingState title="Loading review queue…" description="Fetching items that need your review." />
                ) : filteredItems.length === 0 ? (
                    <EmptyState
                        icon={CheckCircle2}
                        title="All caught up!"
                        description="No items waiting for review."
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-border">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden shrink-0">
                                            {isListing(item) && item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    {isListing(item) || isLegalReview(item) ? <FileText size={24} /> : <Code2 size={24} />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-lg font-black text-foreground truncate">{getEvidenceTitle(item)}</h3>
                                                <StatusBadge kind="listing" status={item.status} size="sm" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{getEvidenceSubtitle(item)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    {isListing(item) ? (
                                        <>
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
                                                    <p className="text-lg font-black text-foreground">{formatCurrency(item.askingPrice, { maximumFractionDigits: 0 })}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">MRR</p>
                                                    <p className="text-lg font-black text-foreground">{formatCurrency(item.monthlyRevenue, { maximumFractionDigits: 0 })}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                                                    <p className={`text-lg font-black ${item.revenueVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                        {item.revenueVerified ? 'Verified' : 'Unverified'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-muted rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Review Progress</p>
                                                    <p className="text-xs font-bold text-muted-foreground">{getReviewStageProgress(item.reviewStage)}/4</p>
                                                </div>
                                                <ProgressBar
                                                    value={(getReviewStageProgress(item.reviewStage) / REVIEW_STAGES.length) * 100}
                                                    tone={item.reviewStage === 'final' ? 'emerald' : 'primary'}
                                                    label={`Review stage ${getReviewStageProgress(item.reviewStage)} of ${REVIEW_STAGES.length}`}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {renderEvidenceSummary(item)}
                                            <div className="rounded-xl border border-border p-4">
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Evidence Checklist</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {getChecklistItems(item).map((check) => (
                                                        <div key={check.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            {check.complete ? <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />}
                                                            <span>{check.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar size={14} />
                                            Submitted {formatRelativeTime(item.submittedAt)}
                                        </div>
                                        <p className="text-muted-foreground">
                                            {item.reviewerId || item.assignedTo
                                                ? `Assigned ${item.assignedTo || item.reviewerId}`
                                                : isListing(item) ? `by ${item.sellerName}` : formatLabel(getQueueItemType(item, activeQueueType))}
                                        </p>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setRejectionModal(true);
                                        }}
                                        disabled={processing === item.id}
                                        aria-label={`Reject ${getEvidenceTitle(item)}`}
                                        className="py-3 border border-border rounded-xl text-muted-foreground font-bold hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleSecondaryDecision(item, 'changes_requested')}
                                        disabled={processing === item.id || isListing(item) || isLegalReview(item)}
                                        title={isListing(item) || isLegalReview(item) ? 'This queue currently supports approve or reject only.' : undefined}
                                        aria-label={`Request changes for ${getEvidenceTitle(item)}`}
                                        className="py-3 border border-border rounded-xl text-muted-foreground font-bold hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <MessageSquareWarning size={16} /> Changes
                                    </button>
                                    <button
                                        onClick={() => setHoldItem(item)}
                                        disabled={processing === item.id || isListing(item) || isLegalReview(item)}
                                        title={isListing(item) || isLegalReview(item) ? 'This queue currently supports approve or reject only.' : undefined}
                                        aria-label={`Put ${getEvidenceTitle(item)} on hold`}
                                        className="py-3 border border-border rounded-xl text-muted-foreground font-bold hover:bg-muted hover:border-border transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <PauseCircle size={16} /> Hold
                                    </button>
                                    <button
                                        onClick={() => handleClaim(item)}
                                        disabled={processing === item.id}
                                        aria-label={`Start review for ${getEvidenceTitle(item)}`}
                                        className="py-3 border border-border rounded-xl text-foreground font-bold hover:bg-muted hover:border-border transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {processing === item.id ? <Loader2 size={16} className="animate-spin" /> : <><PlayCircle size={16} /> Start</>}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setActiveReviewTab('overview');
                                            setReviewModal(true);
                                        }}
                                        disabled={processing === item.id}
                                        aria-label={`Open review details for ${getEvidenceTitle(item)}`}
                                        className="py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Eye size={16} /> Review
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white">
                    <h3 className="text-xl font-black mb-4">Review Checklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { icon: <FileText size={16} />, text: 'App name and description are complete and accurate' },
                            { icon: <DollarSign size={16} />, text: 'Revenue claims are plausible or verified' },
                            { icon: <ShieldCheck size={16} />, text: 'No prohibited content or policy violations' },
                            { icon: <TrendingUp size={16} />, text: 'Pricing is realistic for the market' },
                            { icon: <Calendar size={16} />, text: 'App age and metrics are consistent' },
                            { icon: <CheckCircle2 size={16} />, text: 'Seller account is verified and in good standing' },
                            { icon: <ClipboardList size={16} />, text: 'Legal applications include applicant, business, and required document evidence' },
                            { icon: <ShieldCheck size={16} />, text: 'Approvals are recorded through the admin review trail' },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    {item.icon}
                                </div>
                                <span className="text-slate-300">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog
                open={reviewModal && !!selectedItem}
                onOpenChange={(open) => { if (!open) { setReviewModal(false); setSelectedItem(null); } }}
            >
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {selectedItem && (
                        <div className="space-y-6">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">Review {getEvidenceTitle(selectedItem)}</DialogTitle>
                                <DialogDescription>{getEvidenceSubtitle(selectedItem)}</DialogDescription>
                            </DialogHeader>

                            {!isListing(selectedItem) && !isCreatorReview(selectedItem) && !isLegalReview(selectedItem) && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {REVIEW_MODAL_TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveReviewTab(tab.id)}
                                            aria-pressed={activeReviewTab === tab.id}
                                            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${activeReviewTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {renderReviewTab(selectedItem)}

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4">
                                <button
                                    onClick={() => { setReviewModal(false); setRejectionModal(true); }}
                                    className="py-3 border border-border rounded-xl text-muted-foreground font-bold hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleSecondaryDecision(selectedItem, 'changes_requested')}
                                    disabled={processing === selectedItem.id || isListing(selectedItem) || isLegalReview(selectedItem)}
                                    title={isListing(selectedItem) || isLegalReview(selectedItem) ? 'This queue currently supports approve or reject only.' : undefined}
                                    className="py-3 border border-border rounded-xl text-muted-foreground font-bold hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 transition-colors disabled:opacity-50"
                                >
                                    Request Changes
                                </button>
                                <button
                                    onClick={() => setHoldItem(selectedItem)}
                                    disabled={processing === selectedItem.id || isListing(selectedItem) || isLegalReview(selectedItem)}
                                    title={isListing(selectedItem) || isLegalReview(selectedItem) ? 'This queue currently supports approve or reject only.' : undefined}
                                    className="py-3 border border-border rounded-xl text-muted-foreground font-bold hover:bg-muted hover:border-border transition-colors disabled:opacity-50"
                                >
                                    Hold
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedItem)}
                                    disabled={processing === selectedItem.id || !getApprovalGate(selectedItem).canApprove}
                                    title={!getApprovalGate(selectedItem).canApprove ? `Missing evidence: ${getApprovalGate(selectedItem).reasons.join(', ')}` : undefined}
                                    className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processing === selectedItem.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <><Check size={18} /> Approve</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={rejectionModal && !!selectedItem}
                onOpenChange={(open) => { if (!open) { setRejectionModal(false); setRejectionReason(''); setCustomReason(''); } }}
                title="Reject item"
                description={selectedItem ? `Rejecting "${getEvidenceTitle(selectedItem)}". This decision is recorded and cannot be undone.` : undefined}
                tone="danger"
                confirmLabel="Reject item"
                loading={!!selectedItem && processing === selectedItem.id}
                confirmDisabled={!rejectionReason && !customReason.trim()}
                onConfirm={handleReject}
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Select Reason</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {REJECTION_REASONS.map(reason => (
                                <button
                                    key={reason}
                                    type="button"
                                    onClick={() => { setRejectionReason(reason); setCustomReason(''); }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${rejectionReason === reason
                                        ? 'bg-error/10 text-error border border-error/30'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/70 border border-transparent'
                                        }`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Or provide custom reason</label>
                        <textarea
                            value={customReason}
                            onChange={(e) => { setCustomReason(e.target.value); setRejectionReason(''); }}
                            placeholder="Enter custom rejection reason..."
                            rows={3}
                            className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none resize-none"
                        />
                    </div>
                </div>
            </ConfirmDialog>

            <ConfirmDialog
                open={!!holdItem}
                onOpenChange={(open) => { if (!open) setHoldItem(null); }}
                title="Place on hold"
                description={holdItem ? `"${getEvidenceTitle(holdItem)}" will be placed on hold and removed from the active queue pending additional internal validation.` : undefined}
                confirmLabel="Place on hold"
                loading={!!holdItem && processing === holdItem.id}
                onConfirm={() => { if (holdItem) handleSecondaryDecision(holdItem, 'pause'); }}
            />
        </Layout>
    );
};

