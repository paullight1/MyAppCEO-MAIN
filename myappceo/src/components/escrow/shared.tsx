import { FileCode, Globe, Share2, Database, FileText, Server, Package, LucideIcon } from 'lucide-react';
import type { EscrowDeal, TransferItem } from '../../hooks/useEscrow';

/** Canonical escrow lifecycle stages (1-based, matching EscrowDeal.stage). */
export interface EscrowStage {
    id: number;
    /** Deal statuses that map onto this stage. */
    statuses: EscrowDeal['status'][];
    label: string;
    description: string;
}

export const ESCROW_STAGES: EscrowStage[] = [
    { id: 1, statuses: ['created'], label: 'Deal created', description: 'Terms agreed. Awaiting buyer funding.' },
    { id: 2, statuses: ['funding', 'funded'], label: 'Funds in escrow', description: 'Buyer funds are secured by escrow.' },
    { id: 3, statuses: ['inspection'], label: 'Asset transfer', description: 'Seller hands over assets; buyer verifies.' },
    { id: 4, statuses: ['approval', 'releasing'], label: 'Buyer approval', description: 'Buyer confirms everything checks out.' },
    { id: 5, statuses: ['completed'], label: 'Funds released', description: 'Payment released to the seller. Deal complete.' },
];

/** Resolve the active 1-based stage for a deal from its status (falls back to deal.stage). */
export function resolveStageIndex(deal: Pick<EscrowDeal, 'status' | 'stage'>): number {
    const byStatus = ESCROW_STAGES.find((s) => s.statuses.includes(deal.status));
    if (byStatus) return byStatus.id;
    if (deal.stage && deal.stage >= 1 && deal.stage <= ESCROW_STAGES.length) return deal.stage;
    return 1;
}

/** Terminal statuses that halt the normal timeline. */
export const isTerminalStatus = (status: EscrowDeal['status']) =>
    status === 'refunded' || status === 'disputed' || status === 'held';

export interface TransferMeta {
    icon: LucideIcon;
    label: string;
}

export const TRANSFER_META: Record<TransferItem['type'], TransferMeta> = {
    source_code: { icon: FileCode, label: 'Source code' },
    domain: { icon: Globe, label: 'Domain & DNS' },
    social_accounts: { icon: Share2, label: 'Social accounts' },
    customer_data: { icon: Database, label: 'Customer data' },
    documentation: { icon: FileText, label: 'Documentation' },
    hosting: { icon: Server, label: 'Hosting & infrastructure' },
};

export const transferMeta = (type: TransferItem['type']): TransferMeta =>
    TRANSFER_META[type] ?? { icon: Package, label: type };
