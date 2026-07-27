import React, { useEffect, useState } from 'react';
import { X, Loader2, DollarSign, CheckCircle2, AlertCircle, Calendar, Link2 } from 'lucide-react';
import { useShareholderSystem } from '../hooks/useShareholderSystem';
import { Dialog, DialogContent } from './ui/dialog';

interface CreateShareholderOfferProps {
  appId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const inputClass =
  'w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';
const labelClass = 'text-sm font-bold text-foreground mb-1.5 block';

export const CreateShareholderOffer: React.FC<CreateShareholderOfferProps> = ({
  appId,
  onSuccess,
  onClose,
}) => {
  const { createOffer } = useShareholderSystem();
  const [formData, setFormData] = useState({
    pricePerShare: '',
    minShares: '1',
    maxShares: '',
    totalAvailable: '',
    conditions: '',
    termsUrl: '',
    expiresAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-close after the success confirmation, cleaning up on unmount.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => onClose?.(), 2000);
    return () => clearTimeout(timer);
  }, [success, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.pricePerShare);
    if (isNaN(price) || price <= 0) {
      setError('Price per share must be greater than 0');
      return;
    }
    if (formData.termsUrl && !/^https?:\/\//i.test(formData.termsUrl.trim())) {
      setError('Terms link must start with http:// or https://');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createOffer(appId, {
        price_per_share: price,
        min_shares: parseInt(formData.minShares) || 1,
        max_shares: formData.maxShares ? parseInt(formData.maxShares) : undefined,
        total_available: formData.totalAvailable ? parseInt(formData.totalAvailable) : undefined,
        conditions: formData.conditions || undefined,
        terms_url: formData.termsUrl.trim() || undefined,
        expires_at: formData.expiresAt || undefined,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-label="Create shareholder offer">
        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
            <h3 className="text-lg font-bold text-foreground mb-2">Offer Created</h3>
            <p className="text-sm text-muted-foreground">Prospective shareholders can now apply for shares.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign size={18} className="text-accent" />
                Create Shareholder Offer
              </h3>
              <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {error && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm mb-4 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="offer-price" className={labelClass}>Price per Share ($) *</label>
                <input
                  id="offer-price"
                  type="number"
                  value={formData.pricePerShare}
                  onChange={e => setFormData(prev => ({ ...prev, pricePerShare: e.target.value }))}
                  placeholder="e.g. 250"
                  min="0.01"
                  step="0.01"
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="offer-min" className={labelClass}>Min Shares</label>
                  <input
                    id="offer-min"
                    type="number"
                    value={formData.minShares}
                    onChange={e => setFormData(prev => ({ ...prev, minShares: e.target.value }))}
                    placeholder="1"
                    min="1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="offer-max" className={labelClass}>Max Shares (optional)</label>
                  <input
                    id="offer-max"
                    type="number"
                    value={formData.maxShares}
                    onChange={e => setFormData(prev => ({ ...prev, maxShares: e.target.value }))}
                    placeholder="Unlimited"
                    min="1"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="offer-total" className={labelClass}>Total Available Shares (optional)</label>
                <input
                  id="offer-total"
                  type="number"
                  value={formData.totalAvailable}
                  onChange={e => setFormData(prev => ({ ...prev, totalAvailable: e.target.value }))}
                  placeholder="Unlimited"
                  min="1"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="offer-conditions" className={labelClass}>Conditions &amp; Terms</label>
                <textarea
                  id="offer-conditions"
                  value={formData.conditions}
                  onChange={e => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder="e.g. Must be accredited investor, minimum holding period of 12 months..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label htmlFor="offer-terms-url" className={`${labelClass} flex items-center gap-2`}>
                  <Link2 size={14} /> Terms Document Link (optional)
                </label>
                <input
                  id="offer-terms-url"
                  type="url"
                  value={formData.termsUrl}
                  onChange={e => setFormData(prev => ({ ...prev, termsUrl: e.target.value }))}
                  placeholder="https://…"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="offer-expires" className={`${labelClass} flex items-center gap-2`}>
                  <Calendar size={14} /> Expiry Date (optional)
                </label>
                <input
                  id="offer-expires"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className={inputClass}
                />
              </div>

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
                  disabled={loading}
                  className="flex-1 py-2.5 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Creating...</>
                  ) : (
                    <><DollarSign size={14} /> Create Offer</>
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
