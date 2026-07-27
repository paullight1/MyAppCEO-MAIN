import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useOffers } from '../hooks/useOffers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button, FormField } from './ui';
import { formatCurrency } from '../utils/format';

interface OfferModalProps {
    /** Preferred controlled-open prop. `isOpen` is accepted as an alias. */
    open?: boolean;
    isOpen?: boolean;
    onClose: () => void;
    onSuccess?: (amount: number) => void;
    listingId: string;
    listingName: string;
    askingPrice: number | null;
}

export const OfferModal: React.FC<OfferModalProps> = ({
    open,
    isOpen,
    onClose,
    onSuccess,
    listingId,
    listingName,
    askingPrice,
}) => {
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { createOffer, isLoading, error } = useOffers();

    const isModalOpen = open ?? isOpen ?? false;

    const parsedAmount = Number(amount);
    const amountError =
        amount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
            ? 'Enter an offer amount greater than ₦0.'
            : null;

    const handleClose = () => {
        if (isLoading) return;
        setSubmitted(false);
        setAmount('');
        setMessage('');
        setValidationError(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setValidationError('Enter an offer amount greater than ₦0.');
            return;
        }

        setValidationError(null);
        const result = await createOffer({ listingId, amount: parsedAmount, message });
        if (result?.success) {
            onSuccess?.(parsedAmount);
            setSubmitted(true);
        }
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={(next) => (!next ? handleClose() : undefined)}>
            <DialogContent className="max-w-lg">
                {submitted ? (
                    <div className="py-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={32} />
                        </div>
                        <DialogTitle className="text-2xl">Offer submitted</DialogTitle>
                        <DialogDescription className="mx-auto mt-2 max-w-sm">
                            The seller will be notified and can accept, reject, or counter your offer. Check your
                            dashboard for updates.
                        </DialogDescription>
                        <div className="mt-6 flex justify-center">
                            <Button onClick={handleClose}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>Make an offer</DialogTitle>
                            <DialogDescription>Submit a private offer to the seller.</DialogDescription>
                        </DialogHeader>

                        {(validationError || amountError || error) && (
                            <div className="flex gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-medium text-error" role="alert">
                                <AlertCircle size={18} className="shrink-0" />
                                <p>{validationError || amountError || error}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted p-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset</p>
                                <p className="truncate font-semibold text-foreground">{listingName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asking price</p>
                                <p className="font-semibold text-foreground">
                                    {askingPrice ? formatCurrency(askingPrice, { maximumFractionDigits: 0 }) : 'Contact'}
                                </p>
                            </div>
                        </div>

                        <FormField label="Your offer" required>
                            {({ id }) => (
                                <>
                                    <input
                                        id={id}
                                        required
                                        type="number"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setValidationError(null);
                                        }}
                                        placeholder={askingPrice ? askingPrice.toString() : 'Enter amount'}
                                        min="1"
                                        step="100"
                                        aria-invalid={!!amountError}
                                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20"
                                    />
                                    {askingPrice && parsedAmount > 0 && (
                                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                                            {parsedAmount < askingPrice
                                                ? `${Math.round((parsedAmount / askingPrice) * 100)}% of asking price`
                                                : 'At or above asking price'}
                                        </p>
                                    )}
                                </>
                            )}
                        </FormField>

                        <FormField label="Message to seller (optional)">
                            {({ id }) => (
                                <textarea
                                    id={id}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Introduce yourself and explain why you're a good buyer..."
                                    rows={4}
                                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20"
                                />
                            )}
                        </FormField>

                        <div className="flex justify-end gap-3 border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading || !amount || !!amountError} className="min-w-[150px]">
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Submit offer'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
