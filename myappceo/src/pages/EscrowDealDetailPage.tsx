import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
    ArrowLeft,
    ShieldCheck,
    CheckCircle2,
    Clock,
    ExternalLink,
    Lock,
    Send,
    AlertTriangle,
    Wallet,
    Loader2,
    CheckCircle,
    Play,
} from 'lucide-react';
import {
    useEscrow,
    EscrowDeal,
    TransferItem,
    EscrowMilestone,
    EscrowDisputePayload,
} from '../hooks/useEscrow';
import { useAuth } from '../hooks/useAuth';
import { EscrowTimeline } from '../components/escrow/EscrowTimeline';
import { TransferChecklistItem } from '../components/escrow/TransferChecklistItem';
import { DisputeModal } from '../components/escrow/DisputeModal';
import { resolveStageIndex, ESCROW_STAGES, isTerminalStatus } from '../components/escrow/shared';
import {
    Card,
    StatusBadge,
    ProgressBar,
    LoadingState,
    ErrorState,
} from '../components/ui';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    formatCurrency,
    formatTimeRemaining,
    formatRelativeTime,
    formatDate,
    formatDateTime,
} from '../utils/format';

const asString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value : undefined;
const asNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const getDealTimestamp = (deal: EscrowDeal, keys: string[]) => {
    const record = deal as EscrowDeal & Record<string, unknown>;
    for (const key of keys) {
        const value = asString(record[key]);
        if (value) return value;
    }
    return undefined;
};

type Feedback = { type: 'success' | 'error'; message: string };

export const EscrowDealDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [deal, setDeal] = useState<EscrowDeal | null>(null);
    const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
    const [milestones, setMilestones] = useState<EscrowMilestone[]>([]);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    // Per-action in-flight state.
    const [confirmingItem, setConfirmingItem] = useState<string | null>(null);
    const [updatingMilestone, setUpdatingMilestone] = useState<string | null>(null);
    const [releaseOpen, setReleaseOpen] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const [disputeOpen, setDisputeOpen] = useState(false);
    const [disputing, setDisputing] = useState(false);
    const [funding, setFunding] = useState(false);

    const {
        getEscrowDeal,
        getTransferItems,
        getMilestones,
        confirmTransferItem,
        updateMilestone,
        releaseFunds,
        disputeDeal,
        createPaymentIntent,
        markFundingProcessing,
        isLoading,
        error,
    } = useEscrow();

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchData = async () => {
        if (!id) return;

        const [dealResult, transferResult, milestonesResult] = await Promise.all([
            getEscrowDeal(id),
            getTransferItems(id),
            getMilestones(id),
        ]);

        if (dealResult.success && dealResult.data) {
            setDeal(dealResult.data.data || null);
        }
        if (transferResult.success && transferResult.data) {
            setTransferItems(transferResult.data.data || []);
        }
        if (milestonesResult.success && milestonesResult.data) {
            setMilestones(milestonesResult.data.data || []);
        }
    };

    // Derive the viewer's role from auth + deal membership — NOT a UI toggle.
    const derivedRole: 'buyer' | 'seller' | null =
        deal && user
            ? user.id === deal.buyerId
                ? 'buyer'
                : user.id === deal.sellerId
                    ? 'seller'
                    : null
            : null;

    const allTransferItemsConfirmed =
        transferItems.length > 0 &&
        transferItems.every((item) => item.sellerConfirmed && item.buyerConfirmed);
    const confirmedCount = transferItems.filter((i) => i.sellerConfirmed && i.buyerConfirmed).length;

    const handleConfirmItem = async (itemId: string, role: 'buyer' | 'seller') => {
        if (!id) return;
        setConfirmingItem(itemId);
        setFeedback(null);
        const result = await confirmTransferItem(id, itemId, role);
        if (result.success) {
            setFeedback({ type: 'success', message: 'Transfer item confirmed.' });
            await fetchData();
        } else {
            setFeedback({ type: 'error', message: result.error || 'Could not confirm this item.' });
        }
        setConfirmingItem(null);
    };

    const handleMilestone = async (milestoneId: string, status: EscrowMilestone['status']) => {
        if (!id) return;
        setUpdatingMilestone(milestoneId);
        setFeedback(null);
        const result = await updateMilestone(id, milestoneId, status);
        if (result.success) {
            setFeedback({ type: 'success', message: `Milestone marked ${status.replace('_', ' ')}.` });
            await fetchData();
        } else {
            setFeedback({ type: 'error', message: result.error || 'Could not update milestone.' });
        }
        setUpdatingMilestone(null);
    };

    const handleRelease = async () => {
        if (!id) return;
        setReleasing(true);
        setFeedback(null);
        const result = await releaseFunds(id);
        if (result.success) {
            setReleaseOpen(false);
            setFeedback({ type: 'success', message: 'Funds released to the seller. Deal complete.' });
            await fetchData();
        } else {
            setFeedback({ type: 'error', message: result.error || 'Could not release funds.' });
        }
        setReleasing(false);
    };

    const handleDispute = async (payload: EscrowDisputePayload) => {
        if (!id) return;
        setDisputing(true);
        setFeedback(null);
        const result = await disputeDeal(id, payload);
        if (result.success) {
            setDisputeOpen(false);
            setFeedback({ type: 'success', message: 'Dispute opened. Our resolution team will be in touch.' });
            await fetchData();
        } else {
            setFeedback({ type: 'error', message: result.error || 'Could not open the dispute.' });
        }
        setDisputing(false);
    };

    const handleFund = async () => {
        if (!id) return;
        setFunding(true);
        setFeedback(null);
        const result = await createPaymentIntent(id, { returnUrl: window.location.href });
        if (result.success && result.data?.data) {
            const intent = result.data.data;
            if (intent.paymentIntentId) {
                await markFundingProcessing(id, intent.paymentIntentId);
            }
            // The provider handles the actual charge (redirect / client secret);
            // reflect an in-progress funding state here.
            setFeedback({
                type: 'success',
                message: 'Funding in progress. Complete the payment with the provider to secure the deal.',
            });
            await fetchData();
        } else {
            setFeedback({ type: 'error', message: result.error || 'Could not start funding.' });
        }
        setFunding(false);
    };

    // Deadlines.
    const fundingDeadline = deal
        ? getDealTimestamp(deal, ['fundingDeadline', 'fundingDueAt', 'fundingExpiresAt', 'paymentDueAt'])
        : undefined;
    const inspectionEndsAt = deal
        ? getDealTimestamp(deal, ['inspectionEndsAt', 'inspectionEndAt', 'inspectionDeadline', 'inspectionDueAt'])
        : undefined;
    const inspectionStartedAt = deal
        ? getDealTimestamp(deal, ['inspectionStartedAt', 'inspectionStartAt', 'fundedAt'])
        : undefined;
    const inspectionPeriodHours = deal
        ? asNumber((deal as EscrowDeal & Record<string, unknown>).inspectionPeriodHours)
        : undefined;
    const derivedInspectionEndsAt =
        !inspectionEndsAt && inspectionStartedAt && inspectionPeriodHours
            ? new Date(new Date(inspectionStartedAt).getTime() + inspectionPeriodHours * 60 * 60 * 1000).toISOString()
            : inspectionEndsAt;
    const activeDeadline =
        deal?.status === 'funding' ? fundingDeadline : deal?.status === 'inspection' ? derivedInspectionEndsAt : undefined;
    const activeTimeRemaining = activeDeadline ? formatTimeRemaining(activeDeadline) : deal?.timeLeft;

    if (isLoading && !deal) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <LoadingState variant="spinner" title="Loading deal…" />
                </div>
            </Layout>
        );
    }

    if (error || !deal) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <ErrorState
                        title={error ? 'Failed to load deal' : 'Deal not found'}
                        description="We couldn’t load this escrow deal. It may have been removed or you may not have access."
                        detail={error || undefined}
                        action={{ label: 'Try again', onClick: fetchData }}
                        secondaryAction={{ label: 'Back to escrow', href: '/escrow' }}
                    />
                </div>
            </Layout>
        );
    }

    const stageIndex = resolveStageIndex(deal);
    const terminal = isTerminalStatus(deal.status);
    const canRelease = deal.status === 'approval' && derivedRole === 'buyer';
    const canFund = deal.status === 'funding' && derivedRole === 'buyer';
    const fundingInProgress =
        deal.fundingStatus === 'processing' || deal.fundingStatus === 'payment_intent_created';
    const canDispute = !terminal && deal.status !== 'completed';

    return (
        <Layout>
            <div className="min-h-screen bg-background transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 pb-20">

                    <Link
                        to="/escrow"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to escrow dashboard
                    </Link>

                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge kind="escrow" status={deal.status} dot pulse={!terminal && deal.status !== 'completed'} />
                            {derivedRole && (
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full capitalize">
                                    You are the {derivedRole}
                                </span>
                            )}
                            <span className="text-muted-foreground text-xs font-mono">Deal ID: {deal.id}</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">{deal.listingName}</h1>
                        <p className="text-muted-foreground text-sm">
                            Started {formatDate(deal.createdAt)} · Last activity {formatRelativeTime(deal.lastActivity)}
                        </p>
                    </div>

                    {/* Feedback banner */}
                    {feedback && (
                        <div
                            role="status"
                            className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${feedback.type === 'success'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'border-error/30 bg-error/10 text-error'
                                }`}
                        >
                            {feedback.type === 'success' ? (
                                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            )}
                            <p className="font-medium">{feedback.message}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main column */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Timeline */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <ShieldCheck className="text-primary" size={18} />
                                    <h2 className="text-base font-bold text-foreground">Deal progress</h2>
                                </div>
                                {terminal && (
                                    <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                                        <AlertTriangle size={14} /> This deal is {deal.status}. The standard timeline is paused.
                                    </div>
                                )}
                                <EscrowTimeline currentStage={stageIndex} />
                            </Card>

                            {/* Deadlines */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card className="p-5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Funding deadline</p>
                                    <p className="font-bold text-foreground">{fundingDeadline ? formatDateTime(fundingDeadline) : 'Not set'}</p>
                                    {deal.status === 'funding' && fundingDeadline && (
                                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2">{formatTimeRemaining(fundingDeadline)}</p>
                                    )}
                                </Card>
                                <Card className="p-5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Inspection ends</p>
                                    <p className="font-bold text-foreground">{derivedInspectionEndsAt ? formatDateTime(derivedInspectionEndsAt) : 'Not set'}</p>
                                    {deal.status === 'inspection' && derivedInspectionEndsAt && (
                                        <p className="text-xs font-semibold text-primary mt-2">{formatTimeRemaining(derivedInspectionEndsAt)}</p>
                                    )}
                                </Card>
                            </div>

                            {/* Transfer checklist */}
                            <Card className="p-6 space-y-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <ShieldCheck className="text-primary" size={18} />
                                        Transfer checklist
                                    </h2>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {confirmedCount}/{transferItems.length} complete
                                    </span>
                                </div>

                                {transferItems.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                                        <ShieldCheck size={28} className="mx-auto mb-3 text-muted-foreground" />
                                        <p className="text-sm font-semibold text-foreground">No transfer items yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">The transfer checklist will appear here once the deal is configured.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {transferItems.map((item) => (
                                            <TransferChecklistItem
                                                key={item.id}
                                                item={item}
                                                role={derivedRole}
                                                confirming={confirmingItem === item.id}
                                                onConfirm={handleConfirmItem}
                                            />
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* Milestones */}
                            <Card className="p-6 space-y-5">
                                <h2 className="text-base font-bold text-foreground">Deal milestones</h2>
                                {milestones.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                                        <Clock size={28} className="mx-auto mb-3 text-muted-foreground" />
                                        <p className="text-sm font-semibold text-foreground">No milestones defined</p>
                                        <p className="text-xs text-muted-foreground mt-1">Milestones for this deal will show up here.</p>
                                    </div>
                                ) : (
                                    <ol className="space-y-3">
                                        {milestones.map((milestone, index) => {
                                            const busy = updatingMilestone === milestone.id;
                                            return (
                                                <li key={milestone.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                                        {milestone.status === 'completed' ? (
                                                            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                                                        ) : (
                                                            index + 1
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-semibold text-foreground">{milestone.title}</p>
                                                            <StatusBadge kind="milestone" status={milestone.status} size="sm" />
                                                        </div>
                                                        {milestone.description && (
                                                            <p className="mt-0.5 text-sm text-muted-foreground">{milestone.description}</p>
                                                        )}
                                                    </div>
                                                    {milestone.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMilestone(milestone.id, 'in_progress')}
                                                            disabled={busy}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                                        >
                                                            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Start
                                                        </button>
                                                    )}
                                                    {milestone.status === 'in_progress' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMilestone(milestone.id, 'completed')}
                                                            disabled={busy}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                                        >
                                                            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Complete
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Deal value */}
                            <Card className="p-6">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Deal value</p>
                                <p className="text-3xl font-bold text-foreground mb-5">{formatCurrency(deal.amount)}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Stage progress</span>
                                        <span className="font-semibold text-foreground">{stageIndex}/{ESCROW_STAGES.length}</span>
                                    </div>
                                    <ProgressBar
                                        value={(stageIndex / ESCROW_STAGES.length) * 100}
                                        tone={terminal ? 'amber' : 'primary'}
                                        label="Escrow stage progress"
                                    />
                                    {activeTimeRemaining && (
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm pt-1">
                                            <Clock size={14} />
                                            <span className="font-semibold">{activeTimeRemaining}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Parties */}
                            <Card className="p-6 space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parties</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                                            {deal.buyerName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                Buyer{derivedRole === 'buyer' && ' · You'}
                                            </p>
                                            <p className="font-semibold text-foreground truncate">{deal.buyerName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground font-semibold text-background">
                                            {deal.sellerName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                Seller{derivedRole === 'seller' && ' · You'}
                                            </p>
                                            <p className="font-semibold text-foreground truncate">{deal.sellerName}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Actions */}
                            <Card className="p-6 space-y-3">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</h3>

                                {canFund && (
                                    fundingInProgress ? (
                                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                                            <Clock size={16} /> Funding in progress
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleFund}
                                            disabled={funding}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                        >
                                            {funding ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                                            Fund escrow
                                        </button>
                                    )
                                )}

                                {canRelease && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setReleaseOpen(true)}
                                            disabled={!allTransferItemsConfirmed || releasing}
                                            title={allTransferItemsConfirmed ? 'Release funds to the seller.' : 'Both buyer and seller must confirm every transfer item before release.'}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={16} /> Release funds
                                        </button>
                                        {!allTransferItemsConfirmed && (
                                            <p className="text-xs text-muted-foreground">
                                                Release is disabled until all checklist items are confirmed by both buyer and seller.
                                            </p>
                                        )}
                                    </>
                                )}

                                {canDispute && (
                                    <button
                                        type="button"
                                        onClick={() => setDisputeOpen(true)}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-error/30 bg-error/10 py-3 text-sm font-semibold text-error transition-colors hover:bg-error/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <AlertTriangle size={16} /> Open dispute
                                    </button>
                                )}

                                <Link
                                    to={`/listings/${deal.listingId}`}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <ExternalLink size={16} /> View original listing
                                </Link>
                            </Card>

                            {/* Protection note */}
                            <div className="rounded-2xl border border-border bg-muted p-5">
                                <div className="flex items-start gap-3">
                                    <Lock size={20} className="text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground">Escrow protection</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                            Funds are securely held until all transfer items are confirmed by both parties.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Release confirmation */}
            <ConfirmDialog
                open={releaseOpen}
                onOpenChange={setReleaseOpen}
                title="Release funds to the seller?"
                description="This action is final. Funds will be transferred out of escrow to the seller and the deal will be marked complete."
                confirmLabel="Release funds"
                tone="primary"
                loading={releasing}
                confirmDisabled={!allTransferItemsConfirmed}
                onConfirm={handleRelease}
            >
                <div className="rounded-xl border border-border bg-muted p-4 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount to release</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(deal.amount)}</p>
                </div>
            </ConfirmDialog>

            {/* Dispute */}
            <DisputeModal
                open={disputeOpen}
                onOpenChange={setDisputeOpen}
                loading={disputing}
                onSubmit={handleDispute}
            />
        </Layout>
    );
};
