import React from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { cn } from '../../utils/cn';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Extra content rendered between the description and the actions. */
    children?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger';
    loading?: boolean;
    /** Disable the confirm button (e.g. required field empty). */
    confirmDisabled?: boolean;
    onConfirm: () => void;
}

/**
 * Token-based confirmation dialog. Replaces native `confirm()` and the several
 * hand-rolled, inaccessible modals (no focus/escape handling) across the
 * transactional pages. Built on the accessible <Dialog> primitive.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'primary',
    loading = false,
    confirmDisabled = false,
    onConfirm,
}) => (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading || confirmDisabled}
                    className={cn(
                        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                        tone === 'danger' ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90',
                    )}
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {confirmLabel}
                </button>
            </div>
        </DialogContent>
    </Dialog>
);
