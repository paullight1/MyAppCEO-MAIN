import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
    CheckCircle2,
    Clock,
    FileText,
    Loader2,
    ShieldCheck,
    Upload,
    XCircle,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Select } from '../components/ui/Select';
import { LoadingState } from '../components/ui/State';
import { useUserStatus } from '../hooks/useUserStatus';
import {
    DocumentType,
    VerificationType,
    useVerification,
    type VerificationRecord,
    type VerificationStatus,
} from '../hooks/useVerification';
import { formatDate, formatDateTime } from '../utils/format';
import { cn } from '../utils/cn';

const inputCls =
    'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/30';

const STATUS_META: Record<VerificationStatus, { label: string; pill: string; icon: typeof Clock; description: string }> = {
    pending: {
        label: 'Pending review',
        pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        icon: Clock,
        description: 'Your details have been submitted and are queued for review.',
    },
    in_review: {
        label: 'In review',
        pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        icon: Clock,
        description: 'A reviewer is currently checking your submission.',
    },
    approved: {
        label: 'Verified',
        pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        icon: CheckCircle2,
        description: 'Your identity is verified. Payouts and higher-trust actions are unlocked.',
    },
    rejected: {
        label: 'Rejected',
        pill: 'bg-red-500/10 text-red-600 dark:text-red-400',
        icon: XCircle,
        description: 'Your verification was not approved. Review the note below and resubmit.',
    },
    needs_more_info: {
        label: 'More info needed',
        pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        icon: FileText,
        description: 'The reviewer needs additional details before a decision can be made.',
    },
};

const TYPE_OPTIONS = [
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' },
];

const DOC_OPTIONS = [
    { value: 'passport', label: 'Passport' },
    { value: 'national_id', label: 'National ID' },
    { value: 'drivers_license', label: "Driver's license" },
];

function StatusCard({ record }: { record: VerificationRecord }) {
    const meta = STATUS_META[record.status];
    const Icon = meta.icon;
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>Verification status</CardTitle>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', meta.pill)}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {meta.label}
                    </span>
                </div>
                <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {record.reviewerNote && (record.status === 'rejected' || record.status === 'needs_more_info') && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                        <p className="font-semibold">Reviewer note</p>
                        <p className="mt-1">{record.reviewerNote}</p>
                    </div>
                )}
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legal name</dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">{record.legalName}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</dt>
                        <dd className="mt-1 text-sm font-semibold capitalize text-foreground">{record.verificationType}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Country</dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">{record.country}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Submitted</dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">{formatDateTime(record.submittedAt)}</dd>
                    </div>
                    {record.reviewedAt && (
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reviewed</dt>
                            <dd className="mt-1 text-sm font-semibold text-foreground">{formatDate(record.reviewedAt)}</dd>
                        </div>
                    )}
                    {record.documentPath && (
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Document</dt>
                            <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Uploaded
                            </dd>
                        </div>
                    )}
                </dl>
            </CardContent>
        </Card>
    );
}

export const VerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const { verification, isLoading, error, submitting, submitVerification, refetch } = useVerification();
    const { isVerified, refetch: refetchProfile } = useUserStatus();

    const [type, setType] = useState<VerificationType>('individual');
    const [legalName, setLegalName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [country, setCountry] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [documentType, setDocumentType] = useState<DocumentType | ''>('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessReg, setBusinessReg] = useState('');
    const [document, setDocument] = useState<File | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const approved = isVerified || verification?.status === 'approved';
    const awaitingReview = verification?.status === 'pending' || verification?.status === 'in_review';
    // A rejected / needs-more-info record can be resubmitted; approved/awaiting cannot.
    const showForm = !approved && !awaitingReview;

    const canSubmit = useMemo(() => {
        if (!legalName.trim() || !country.trim()) return false;
        if (type === 'business' && !businessName.trim()) return false;
        return true;
    }, [legalName, country, type, businessName]);

    const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';
        if (file && file.size > 5 * 1024 * 1024) {
            setFormError('Document must be 5 MB or smaller.');
            return;
        }
        setFormError(null);
        setDocument(file);
    };

    const handleSubmit = async () => {
        setFormError(null);
        if (!canSubmit) {
            setFormError('Fill in the required fields before submitting.');
            return;
        }
        const record = await submitVerification({
            verificationType: type,
            legalName: legalName.trim(),
            dateOfBirth: dateOfBirth || undefined,
            country: country.trim(),
            addressLine: addressLine.trim() || undefined,
            city: city.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            documentType: documentType || undefined,
            documentNumber: documentNumber.trim() || undefined,
            document,
            businessName: type === 'business' ? businessName.trim() || undefined : undefined,
            businessRegistrationNumber: type === 'business' ? businessReg.trim() || undefined : undefined,
        });
        if (record) {
            // Keep the profile-derived trust flag in sync (trigger set kyc_status=pending).
            await refetchProfile();
            await refetch();
        }
    };

    return (
        <Layout>
            <div className="mx-auto max-w-3xl space-y-6 pb-20">
                <div>
                    <Link to="/settings?section=verification" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to settings
                    </Link>
                    <div className="mt-3 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Identity verification</h1>
                            <p className="text-sm text-muted-foreground">Verify your identity to unlock payouts and higher-trust marketplace actions.</p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <LoadingState title="Loading your verification status" />
                ) : approved ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <BadgeCheck className="h-7 w-7" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">You're verified</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Your identity has been approved. No further action is needed.</p>
                            </div>
                            <Button variant="outline" onClick={() => navigate('/settings')}>Back to settings</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {verification && <StatusCard record={verification} />}

                        {showForm && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{verification ? 'Resubmit verification' : 'Submit verification'}</CardTitle>
                                    <CardDescription>Your information is reviewed by our compliance team. Documents are stored privately.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <Select
                                        label="Verification type"
                                        options={TYPE_OPTIONS}
                                        value={type}
                                        onValueChange={(v) => setType(v as VerificationType)}
                                        size="sm"
                                    />

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <FormField label={type === 'business' ? 'Authorized representative' : 'Full legal name'} required>
                                            {(p) => <input {...p} className={inputCls} value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="As shown on your ID" />}
                                        </FormField>
                                        <FormField label="Date of birth">
                                            {(p) => <input {...p} type="date" className={inputCls} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />}
                                        </FormField>
                                        <FormField label="Country" required>
                                            {(p) => <input {...p} className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country of residence" />}
                                        </FormField>
                                        <FormField label="City">
                                            {(p) => <input {...p} className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />}
                                        </FormField>
                                        <FormField label="Address line" className="sm:col-span-2">
                                            {(p) => <input {...p} className={inputCls} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />}
                                        </FormField>
                                        <FormField label="Postal code">
                                            {(p) => <input {...p} className={inputCls} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />}
                                        </FormField>
                                    </div>

                                    {type === 'business' && (
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <FormField label="Business name" required>
                                                {(p) => <input {...p} className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />}
                                            </FormField>
                                            <FormField label="Registration number">
                                                {(p) => <input {...p} className={inputCls} value={businessReg} onChange={(e) => setBusinessReg(e.target.value)} />}
                                            </FormField>
                                        </div>
                                    )}

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <Select
                                            label="ID document type"
                                            options={DOC_OPTIONS}
                                            value={documentType}
                                            onValueChange={(v) => setDocumentType(v as DocumentType)}
                                            placeholder="Select a document"
                                            size="sm"
                                        />
                                        <FormField label="Document number">
                                            {(p) => <input {...p} className={inputCls} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />}
                                        </FormField>
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-foreground">ID document</p>
                                        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                                                <Upload className="h-4 w-4" aria-hidden="true" /> {document ? 'Change file' : 'Upload document'}
                                            </Button>
                                            {document && (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <FileText className="h-4 w-4" aria-hidden="true" /> {document.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1.5 text-xs text-muted-foreground">Image or PDF, up to 5 MB. Stored privately, visible only to reviewers.</p>
                                    </div>

                                    {(formError || error) && (
                                        <p className="flex items-center gap-1.5 text-sm font-medium text-error" role="alert">
                                            <XCircle className="h-4 w-4" aria-hidden="true" /> {formError || error}
                                        </p>
                                    )}

                                    <div className="flex justify-end">
                                        <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                                            Submit for review
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {awaitingReview && (
                            <p className="text-center text-sm text-muted-foreground">
                                We'll email you once the review is complete. You can leave this page.
                            </p>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};
