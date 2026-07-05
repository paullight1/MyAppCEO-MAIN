import React, { useMemo, useState } from 'react';
import {
    BadgeCheck,
    Building2,
    CheckCircle2,
    ExternalLink,
    FileText,
    Loader2,
    ShieldCheck,
    User,
    XCircle,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State';
import {
    AdminVerificationRecord,
    ReviewDecision,
    useAdminVerifications,
} from '../hooks/useAdminVerifications';
import type { VerificationStatus } from '../hooks/useVerification';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/format';
import { cn } from '../utils/cn';

const STATUS_PILL: Record<VerificationStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    in_review: { label: 'In review', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    needs_more_info: { label: 'More info', className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
};

const FILTERS: { value: VerificationStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'needs_more_info', label: 'More info' },
    { value: 'in_review', label: 'In review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
];

function StatusPill({ status }: { status: VerificationStatus }) {
    const pill = STATUS_PILL[status];
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', pill.className)}>
            {pill.label}
        </span>
    );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    if (value == null || value === '') return null;
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
        </div>
    );
}

export const AdminVerificationQueuePage: React.FC = () => {
    const {
        records,
        statusFilter,
        setStatusFilter,
        isLoading,
        error,
        reviewingId,
        reviewVerification,
        getDocumentUrl,
        refetch,
    } = useAdminVerifications('pending');

    const [active, setActive] = useState<AdminVerificationRecord | null>(null);
    const [note, setNote] = useState('');
    const [docLoading, setDocLoading] = useState(false);

    const openReview = (record: AdminVerificationRecord) => {
        setActive(record);
        setNote(record.reviewerNote ?? '');
    };

    const closeReview = () => {
        setActive(null);
        setNote('');
    };

    const submitterName = (r: AdminVerificationRecord) => r.submitter?.fullName || r.legalName || 'Applicant';

    const handleDecision = async (decision: ReviewDecision) => {
        if (!active) return;
        const ok = await reviewVerification(active.id, decision, note);
        if (ok) closeReview();
    };

    const viewDocument = async () => {
        if (!active?.documentPath) return;
        setDocLoading(true);
        const url = await getDocumentUrl(active.documentPath);
        setDocLoading(false);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    const decided = active?.status === 'approved' || active?.status === 'rejected';

    const emptyLabel = useMemo(() => {
        const f = FILTERS.find((x) => x.value === statusFilter);
        return f && f.value !== 'all' ? `No ${f.label.toLowerCase()} submissions` : 'No submissions yet';
    }, [statusFilter]);

    return (
        <Layout>
            <div className="space-y-6 pb-20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Identity verification queue</h1>
                            <p className="text-sm text-muted-foreground">Review KYC submissions and approve, reject, or request more information.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} Refresh
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={cn(
                                'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                                statusFilter === f.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <LoadingState title="Loading submissions" variant="skeleton" rows={4} />
                ) : error ? (
                    <ErrorState title="Couldn't load submissions" description={error} action={{ label: 'Retry', onClick: () => refetch() }} />
                ) : records.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title={emptyLabel} description="Submissions appear here as members complete identity verification." />
                ) : (
                    <div className="space-y-3">
                        {records.map((r) => {
                            const TypeIcon = r.verificationType === 'business' ? Building2 : User;
                            return (
                                <Card key={r.id}>
                                    <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            {r.submitter?.avatarUrl ? (
                                                <img src={r.submitter.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                                            ) : (
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                                                    {submitterName(r).slice(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate font-semibold text-foreground">{submitterName(r)}</p>
                                                    <StatusPill status={r.status} />
                                                </div>
                                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1 capitalize"><TypeIcon className="h-3.5 w-3.5" aria-hidden="true" /> {r.verificationType}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>{r.country}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>Submitted {formatRelativeTime(r.submittedAt)}</span>
                                                    {r.submitter?.email && (<><span aria-hidden="true">·</span><span className="truncate">{r.submitter.email}</span></>)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => openReview(r)}>
                                            Review
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={active !== null} onOpenChange={(o) => !o && closeReview()}>
                <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                    {active && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between gap-3">
                                    <DialogTitle>{submitterName(active)}</DialogTitle>
                                    <StatusPill status={active.status} />
                                </div>
                                <DialogDescription>
                                    {active.verificationType === 'business' ? 'Business verification' : 'Individual verification'} · submitted {formatDateTime(active.submittedAt)}
                                </DialogDescription>
                            </DialogHeader>

                            <dl className="mt-4 grid grid-cols-2 gap-4">
                                <Detail label="Legal name" value={active.legalName} />
                                <Detail label="Country" value={active.country} />
                                <Detail label="Date of birth" value={active.dateOfBirth ? formatDate(active.dateOfBirth) : null} />
                                <Detail label="City" value={active.city} />
                                <Detail label="Address" value={active.addressLine} />
                                <Detail label="Postal code" value={active.postalCode} />
                                <Detail label="Document type" value={active.documentType ? active.documentType.replace(/_/g, ' ') : null} />
                                <Detail label="Document number" value={active.documentNumber} />
                                {active.verificationType === 'business' && <Detail label="Business name" value={active.businessName} />}
                                {active.verificationType === 'business' && <Detail label="Reg. number" value={active.businessRegistrationNumber} />}
                                {active.submitter?.email && <Detail label="Account email" value={active.submitter.email} />}
                            </dl>

                            {active.documentPath && (
                                <div className="mt-4">
                                    <Button variant="outline" size="sm" onClick={viewDocument} disabled={docLoading}>
                                        {docLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                                        View ID document
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                </div>
                            )}

                            {decided ? (
                                <div className="mt-5 rounded-xl border border-border bg-muted p-4 text-sm">
                                    <p className="font-semibold text-foreground">
                                        Decision recorded: <span className="capitalize">{active.status}</span>
                                        {active.reviewedAt ? ` · ${formatDate(active.reviewedAt)}` : ''}
                                    </p>
                                    {active.reviewerNote && <p className="mt-1 text-muted-foreground">{active.reviewerNote}</p>}
                                </div>
                            ) : (
                                <div className="mt-5 space-y-3">
                                    <label htmlFor="kyc-review-note" className="block text-sm font-semibold text-foreground">
                                        Reviewer note <span className="font-normal text-muted-foreground">(shown to the applicant when rejecting or requesting info)</span>
                                    </label>
                                    <textarea
                                        id="kyc-review-note"
                                        rows={3}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add context for the decision…"
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/30"
                                    />
                                    {error && <p className="text-sm font-medium text-error" role="alert">{error}</p>}
                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDecision('needs_more_info')}
                                            disabled={reviewingId === active.id}
                                            className="text-amber-600 dark:text-amber-400"
                                        >
                                            Request info
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDecision('rejected')}
                                            disabled={reviewingId === active.id}
                                        >
                                            <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                                        </Button>
                                        <Button
                                            onClick={() => handleDecision('approved')}
                                            disabled={reviewingId === active.id}
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            {reviewingId === active.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                                            Approve
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {active.status === 'approved' && (
                                <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Applicant is verified.
                                </p>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};
