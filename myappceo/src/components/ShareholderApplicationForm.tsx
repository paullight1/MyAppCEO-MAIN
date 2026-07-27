import React, { useEffect, useState } from 'react';
import { DollarSign, X, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useShareholderSystem, ShareholderOffer } from '../hooks/useShareholderSystem';
import { Dialog, DialogContent } from './ui/dialog';

interface ShareholderApplicationFormProps {
  appId: string;
  offer: ShareholderOffer;
  onSuccess?: () => void;
  onClose?: () => void;
}

const inputClass =
  'w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

export const ShareholderApplicationForm: React.FC<ShareholderApplicationFormProps> = ({
  appId,
  offer,
  onSuccess,
  onClose,
}) => {
  const { submitRequest } = useShareholderSystem();
  const [shares, setShares] = useState(offer.min_shares.toString());
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const totalInvestment = offer.price_per_share * (parseInt(shares) || 0);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => onClose?.(), 2000);
    return () => clearTimeout(timer);
  }, [success, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the terms');
      return;
    }

    const shareCount = parseInt(shares);
    if (isNaN(shareCount) || shareCount < offer.min_shares) {
      setError(`Minimum ${offer.min_shares} shares required`);
      return;
    }
    if (offer.max_shares && shareCount > offer.max_shares) {
      setError(`Maximum ${offer.max_shares} shares allowed`);
      return;
    }
    if (offer.total_available && shareCount > offer.total_available) {
      setError(`Only ${offer.total_available} shares are available`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await submitRequest(appId, offer.id, shareCount, message);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const stat = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-label="Become a shareholder">
        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
            <h3 className="text-lg font-bold text-foreground mb-2">Application Submitted</h3>
            <p className="text-sm text-muted-foreground">The owner will review your request shortly.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign size={18} className="text-accent" />
                Become a Shareholder
              </h3>
              <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 bg-muted rounded-xl border border-border mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {stat('Price per Share', `$${offer.price_per_share}`)}
                {stat('Available', offer.total_available || 'Unlimited')}
                {stat('Min Shares', offer.min_shares)}
                {stat('Max Shares', offer.max_shares || 'Unlimited')}
              </div>
              {offer.terms_url && (
                <a
                  href={offer.terms_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <ExternalLink size={12} /> View offer terms
                </a>
              )}
            </div>

            {error && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm mb-4 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="apply-shares" className="text-sm font-bold text-foreground mb-1.5 block">Number of Shares</label>
                <input
                  id="apply-shares"
                  type="number"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  min={offer.min_shares}
                  max={offer.max_shares || offer.total_available || undefined}
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Total investment: <span className="font-bold text-foreground">${totalInvestment.toLocaleString()}</span>
                </p>
              </div>

              <div>
                <label htmlFor="apply-message" className="text-sm font-bold text-foreground mb-1.5 block">Message (Optional)</label>
                <textarea
                  id="apply-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell the owner why you want to invest..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <label className="flex items-start gap-3 p-3 bg-muted rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border accent-accent"
                />
                <p className="text-xs text-muted-foreground">
                  I agree to the terms and conditions. I understand this is an illiquid investment and my capital may be at risk.
                </p>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !agreed}
                  className="flex-1 py-2.5 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><DollarSign size={14} /> Submit Application</>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
