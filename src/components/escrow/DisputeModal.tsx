import React, { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import type { EscrowDisputePayload } from '../../hooks/useEscrow';

interface DisputeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loading?: boolean;
    onSubmit: (payload: EscrowDisputePayload) => void;
}

const RESOLUTIONS: { value: NonNullable<EscrowDisputePayload['requestedResolution']>; label: string }[] = [
    { value: 'manual_review', label: 'Manual review' },
    { value: 'refund', label: 'Full refund' },
    { value: 'partial_refund', label: 'Partial refund' },
    { value: 'release', label: 'Release to seller' },
];

/**
 * Accessible dispute modal that captures a reason, a requested resolution, and
 * structured evidence links. Fixes the prior bug where evidence was collected
 * (or passed as a stray 3rd arg) and silently dropped — here it is sent as the
 * typed `evidence` array the hook expects.
 */
export const DisputeModal: React.FC<DisputeModalProps> = ({ open, onOpenChange, loading = false, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [resolution, setResolution] = useState<EscrowDisputePayload['requestedResolution']>('manual_review');
    const [evidence, setEvidence] = useState<string[]>([]);
    const [evidenceDraft, setEvidenceDraft] = useState('');

    const addEvidence = () => {
        const value = evidenceDraft.trim();
        if (!value) return;
        setEvidence((prev) => [...prev, value]);
        setEvidenceDraft('');
    };

    const submit = () => {
        if (!reason.trim()) return;
        onSubmit({
            reason: reason.trim(),
            requestedResolution: resolution,
            evidence: evidence.map((value) => ({
                type: /^https?:\/\//i.test(value) ? 'url' : 'text',
                value,
            })),
        });
    };

    return (
        <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Open a dispute</DialogTitle>
                    <DialogDescription>
                        Disputes pause the deal and route it to our resolution team. Add as much detail and evidence as you can.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="dispute-reason" className="mb-1.5 block text-sm font-medium text-foreground">
                            What went wrong?
                        </label>
                        <textarea
                            id="dispute-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            placeholder="Describe the issue in detail…"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div>
                        <label htmlFor="dispute-resolution" className="mb-1.5 block text-sm font-medium text-foreground">
                            Requested resolution
                        </label>
                        <select
                            id="dispute-resolution"
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value as EscrowDisputePayload['requestedResolution'])}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {RESOLUTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="dispute-evidence" className="mb-1.5 block text-sm font-medium text-foreground">
                            Evidence <span className="font-normal text-muted-foreground">(links or notes, optional)</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="dispute-evidence"
                                value={evidenceDraft}
                                onChange={(e) => setEvidenceDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addEvidence();
                                    }
                                }}
                                placeholder="https://… or a short note"
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button
                                type="button"
                                onClick={addEvidence}
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted"
                                aria-label="Add evidence"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        {evidence.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                                {evidence.map((item, i) => (
                                    <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm text-foreground">
                                        <span className="truncate">{item}</span>
                                        <button
                                            type="button"
                                            onClick={() => setEvidence((prev) => prev.filter((_, idx) => idx !== i))}
                                            className="shrink-0 text-muted-foreground hover:text-foreground"
                                            aria-label={`Remove evidence ${i + 1}`}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={loading || !reason.trim()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-error px-4 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Submit dispute
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
