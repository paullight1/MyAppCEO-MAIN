import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { TransferItem } from '../../hooks/useEscrow';
import { cn } from '../../utils/cn';
import { transferMeta } from './shared';
import { StatusBadge } from '../ui/StatusBadge';

interface TransferChecklistItemProps {
    item: TransferItem;
    /** The viewer's role in this deal (derived from auth, not a toggle). */
    role: 'buyer' | 'seller' | null;
    confirming?: boolean;
    onConfirm?: (itemId: string, role: 'buyer' | 'seller') => void;
}

const ConfirmChip: React.FC<{ label: string; confirmed: boolean }> = ({ label, confirmed }) => (
    <span
        className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
            confirmed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
        )}
    >
        {confirmed && <Check className="h-3 w-3" aria-hidden="true" />}
        {label}
    </span>
);

/** A single transfer-checklist row: icon, label, both-party confirmation, and a role-aware confirm action. */
export const TransferChecklistItem: React.FC<TransferChecklistItemProps> = ({ item, role, confirming, onConfirm }) => {
    const { icon: Icon, label } = transferMeta(item.type);
    const alreadyConfirmed = role === 'buyer' ? item.buyerConfirmed : role === 'seller' ? item.sellerConfirmed : true;
    const canConfirm = Boolean(role) && !alreadyConfirmed && onConfirm;

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{item.label || label}</p>
                        {item.required && <span className="text-[11px] font-medium text-muted-foreground">Required</span>}
                        {item.status && <StatusBadge kind="transfer" status={item.status} size="sm" />}
                    </div>
                    {item.description && <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.description}</p>}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end lg:flex-row lg:items-center">
                <div className="flex gap-1.5">
                    <ConfirmChip label="Seller" confirmed={item.sellerConfirmed} />
                    <ConfirmChip label="Buyer" confirmed={item.buyerConfirmed} />
                </div>
                {canConfirm && role && (
                    <button
                        type="button"
                        onClick={() => onConfirm(item.id, role)}
                        disabled={confirming}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                        {confirming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                        Confirm
                    </button>
                )}
            </div>
        </div>
    );
};
