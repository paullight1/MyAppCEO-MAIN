import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    XCircle,
    MessageSquare,
    ArrowRight,
    Loader2,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';
import { Offer, OfferStatus, useOffers } from '../hooks/useOffers';
import { useEscrow } from '../hooks/useEscrow';
import { CounterOfferModal } from './CounterOfferModal';
import { StatusBadge } from './ui';
import { formatCurrency } from '../utils/format';

type TableOffer = Offer & {
    app?: string;
    listingName?: string;
    buyerName?: string;
    buyer?: string;
    date?: string;
};

export const OffersTable: React.FC = () => {
    const navigate = useNavigate();
    const {
        getMyReceivedOffers,
        acceptOffer,
        rejectOffer,
        withdrawOffer,
        isLoading,
        error,
    } = useOffers();
    const { createEscrow } = useEscrow();
    const [offers, setOffers] = useState<TableOffer[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [counteringOffer, setCounteringOffer] = useState<TableOffer | null>(null);

    useEffect(() => {
        let active = true;
        const loadOffers = async () => {
            const result = await getMyReceivedOffers();
            if (active && result?.success) {
                setOffers((result.data || []) as TableOffer[]);
            }
        };
        loadOffers();
        return () => {
            active = false;
        };
    }, []);

    const handleAccept = async (offerId: string) => {
        setActionLoading(`${offerId}:accepted`);
        const result = await acceptOffer(offerId);
        if (result?.success) {
            setOffers((prev) =>
                prev.map((offer) => (offer.id === offerId ? { ...offer, status: 'accepted' } : offer)),
            );
            const escrow = await createEscrow(offerId);
            const dealId = (escrow?.data as { id?: string } | undefined)?.id;
            if (escrow?.success && dealId) {
                navigate(`/escrow/${dealId}`);
                return;
            }
        }
        setActionLoading(null);
    };

    const updateStatus = async (
        offerId: string,
        status: Extract<OfferStatus, 'rejected' | 'withdrawn'>,
    ) => {
        setActionLoading(`${offerId}:${status}`);
        const action = status === 'rejected' ? rejectOffer : withdrawOffer;
        const result = await action(offerId);
        if (result?.success) {
            setOffers((prev) =>
                prev.map((offer) => (offer.id === offerId ? { ...offer, status } : offer)),
            );
        }
        setActionLoading(null);
    };

    const getListingLabel = (offer: TableOffer) =>
        offer.app || offer.listingName || `Listing ${offer.listingId.slice(0, 8)}`;

    const getBuyerLabel = (offer: TableOffer) =>
        offer.buyer || offer.buyerName || `Buyer ${offer.buyerId.slice(0, 8)}`;

    const getOfferDate = (offer: TableOffer) =>
        offer.date || new Date(offer.createdAt).toLocaleDateString();

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-6">
                <div>
                    <h3 className="font-semibold text-foreground">Recent offers</h3>
                    <p className="text-sm text-muted-foreground">Manage offers on your listings</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/manage-listings')}
                    className="flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    View all <ArrowRight size={14} />
                </button>
            </div>

            {error && (
                <div className="m-5 flex gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-medium text-error" role="alert">
                    <AlertCircle size={18} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="divide-y divide-border">
                {isLoading && offers.length === 0 ? (
                    <div className="flex items-center justify-center gap-3 p-10 text-sm font-semibold text-muted-foreground">
                        <Loader2 size={18} className="animate-spin" />
                        Loading offers
                    </div>
                ) : offers.length === 0 ? (
                    <div className="p-10 text-center text-sm font-semibold text-muted-foreground">
                        No offers have been received yet.
                    </div>
                ) : (
                    offers.map((offer) => {
                        const listingLabel = getListingLabel(offer);
                        const busy = actionLoading?.startsWith(offer.id) ?? false;
                        return (
                            <div
                                key={offer.id}
                                className="flex flex-col gap-4 p-5 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                                        {listingLabel[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-foreground">{listingLabel}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Offer from <strong className="text-foreground">{getBuyerLabel(offer)}</strong> · {getOfferDate(offer)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                    <div className="text-right">
                                        <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(Number(offer.amount), { maximumFractionDigits: 0 })}
                                        </p>
                                        <StatusBadge kind="offer" status={offer.status} size="sm" />
                                    </div>

                                    {offer.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAccept(offer.id)}
                                                disabled={busy}
                                                aria-label="Accept offer"
                                                className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
                                            >
                                                {actionLoading === `${offer.id}:accepted` ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle2 size={18} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => updateStatus(offer.id, 'rejected')}
                                                disabled={busy}
                                                aria-label="Reject offer"
                                                className="rounded-xl bg-error/10 p-2.5 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                                            >
                                                {actionLoading === `${offer.id}:rejected` ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <XCircle size={18} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setCounteringOffer(offer)}
                                                disabled={busy}
                                                aria-label="Counter offer"
                                                className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                        </div>
                                    )}

                                    {offer.status === 'countered' && (
                                        <button
                                            onClick={() => updateStatus(offer.id, 'withdrawn')}
                                            disabled={busy}
                                            aria-label="Withdraw counter"
                                            className="rounded-xl bg-muted p-2.5 text-muted-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
                                        >
                                            {actionLoading === `${offer.id}:withdrawn` ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <RotateCcw size={18} />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {counteringOffer && (
                <CounterOfferModal
                    isOpen={!!counteringOffer}
                    onClose={() => setCounteringOffer(null)}
                    offerId={counteringOffer.id}
                    listingName={getListingLabel(counteringOffer)}
                    originalAmount={Number(counteringOffer.amount)}
                    onSuccess={(newAmount) => {
                        setOffers((prev) =>
                            prev.map((offer) =>
                                offer.id === counteringOffer.id
                                    ? { ...offer, amount: newAmount, status: 'countered' }
                                    : offer,
                            ),
                        );
                    }}
                />
            )}
        </div>
    );
};
