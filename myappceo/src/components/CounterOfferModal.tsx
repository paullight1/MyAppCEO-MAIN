import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import { useOffers } from '../hooks/useOffers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button, FormField } from './ui';
import { formatCurrency } from '../utils/format';

interface CounterOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    offerId: string;
    listingName?: string;
    originalAmount: number;
    onSuccess: (newAmount: number) => void;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({
    isOpen,
    onClose,
    offerId,
    listingName,
    originalAmount,
    onSuccess,
}) => {
    const [amount, setAmount] = useState(originalAmount.toString());
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { counterOffer, isLoading, error } = useOffers();

    const numericAmount = Number(amount);
    const amountError =
        amount && (!Number.isFinite(numericAmount) || numericAmount <= 0)
            ? 'Enter a counter price greater than ₦0.'
            : null;

    const handleClose = () => {
        if (isLoading) return;
        setSubmitted(false);
        setAmount(originalAmount.toString());
        setMessage('');
        setValidationError(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setValidationError('Enter a counter price greater than ₦0.');
            return;
        }
        setValidationError(null);
        const result = await counterOffer(offerId, numericAmount, message);
        if (result?.success) {
            onSuccess(numericAmount);
            setSubmitted(true);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(next) => (!next ? handleClose() : undefined)}>
            <DialogContent className="max-w-lg">
                {submitted ? (
                    <div className="py-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={32} />
                        </div>
                        <DialogTitle className="text-2xl">Counter-offer sent</DialogTitle>
                        <DialogDescription className="mx-auto mt-2 max-w-sm">
                            The buyer has been notified of your new terms. You'll receive a notification once they respond.
                        </DialogDescription>
                        <div className="mt-6 flex justify-center">
                            <Button onClick={handleClose}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <RefreshCcw size={18} />
                                </div>
                                <DialogTitle>Submit counter-offer</DialogTitle>
                            </div>
                        </DialogHeader>

                        {(validationError || amountError || error) && (
                            <div className="flex gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-medium text-error" role="alert">
                                <AlertCircle size={18} className="shrink-0" />
                                <p>{validationError || amountError || error}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted p-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listing</p>
                                <p className="truncate font-semibold text-foreground">{listingName || 'Listing'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyer's offer</p>
                                <p className="font-semibold text-foreground">
                                    {formatCurrency(originalAmount, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>

                        <FormField label="Your counter price" required>
                            {({ id }) => (
                                <input
                                    id={id}
                                    required
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setValidationError(null);
                                    }}
                                    min="1"
                                    step="100"
                                    aria-invalid={!!amountError}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-semibold text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20"
                                />
                            )}
                        </FormField>

                        <FormField label="Message to buyer">
                            {({ id }) => (
                                <textarea
                                    id={id}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Explain why you're countering and any additional terms..."
                                    rows={4}
                                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20"
                                />
                            )}
                        </FormField>

                        <div className="flex justify-end gap-3 border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading || !amount || !!amountError} className="min-w-[170px]">
                                {isLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        Send counter <RefreshCcw size={16} />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
