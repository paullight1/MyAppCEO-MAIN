import React from 'react';
import { CheckCircle2, XCircle, ArrowLeftRight, Clock, Loader2 } from 'lucide-react';

interface EquitySplitProfile {
  full_name?: string;
  avatar_url?: string;
}

export interface EquitySplitCardData {
  id: string;
  status: string;
  proposed_pct: number;
  counter_pct?: number;
  role_offered: string;
  vesting_terms: string;
  created_at: string;
  target_profile?: EquitySplitProfile;
  offered_by_profile?: EquitySplitProfile;
  /** Present on "my pending offers" (joined from listings). */
  listings?: { name?: string } | null;
}

interface EquitySplitCardProps {
  split: EquitySplitCardData;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCounter: (id: string, pct: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  declined: 'bg-red-500/10 text-red-600 border-red-500/20',
  countered: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};
const STATUS_FALLBACK = 'bg-muted text-muted-foreground border-border';

const VESTING_LABELS: Record<string, string> = {
  standard_4yr_1yr: 'Standard · 4yr / 1yr cliff',
  standard: 'Standard',
  accelerated: 'Accelerated',
  none: 'No vesting',
};

const humanize = (value?: string) => (value ? value.replace(/_/g, ' ') : '');

export const EquitySplitCard: React.FC<EquitySplitCardProps> = ({ split, onAccept, onDecline, onCounter }) => {
  const [counterPct, setCounterPct] = React.useState('');
  const [showCounter, setShowCounter] = React.useState(false);
  const [counterError, setCounterError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const appName = split.listings?.name;
  const displayName = split.target_profile?.full_name || split.offered_by_profile?.full_name || 'Pending user';
  const vestingLabel = VESTING_LABELS[split.vesting_terms] || humanize(split.vesting_terms) || '—';
  const statusClass = STATUS_COLORS[split.status] || STATUS_FALLBACK;

  const guard = (fn: () => void) => {
    if (busy) return;
    setBusy(true);
    fn();
  };

  const sendCounter = () => {
    const pct = parseFloat(counterPct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setCounterError('Enter a counter between 0 and 100%.');
      return;
    }
    setCounterError(null);
    setShowCounter(false);
    guard(() => onCounter(split.id, pct));
  };

  return (
    <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{displayName}</p>
            {appName && <p className="text-xs text-muted-foreground truncate">{appName}</p>}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0 ${statusClass}`}>
          {humanize(split.status) || 'Unknown'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 bg-muted/50 p-3 rounded-xl">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Equity</p>
          <p className="font-bold text-foreground">{split.proposed_pct}%</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</p>
          <p className="font-bold text-foreground capitalize">{humanize(split.role_offered) || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vesting</p>
          <p className="font-bold text-foreground text-sm">{vestingLabel}</p>
        </div>
      </div>

      {split.status === 'countered' && split.counter_pct != null && (
        <p className="text-xs text-blue-600 font-medium">You countered at {split.counter_pct}%.</p>
      )}

      {split.status === 'proposed' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => guard(() => onAccept(split.id))}
              disabled={busy}
              className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Accept
            </button>
            {!showCounter ? (
              <button
                onClick={() => setShowCounter(true)}
                disabled={busy}
                className="px-4 py-2.5 bg-blue-500/10 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-500/20 transition-colors flex items-center gap-2 disabled:opacity-50">
                <ArrowLeftRight size={16} /> Counter
              </button>
            ) : (
              <div className="flex gap-2 flex-1">
                <input
                  type="number" min="0" max="100" step="0.1" value={counterPct}
                  onChange={e => setCounterPct(e.target.value)}
                  placeholder="Counter %" aria-label="Counter equity percentage"
                  className="flex-1 min-w-0 px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent" />
                <button onClick={sendCounter} className="px-4 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600">Send</button>
              </div>
            )}
            <button
              onClick={() => guard(() => onDecline(split.id))}
              disabled={busy}
              aria-label="Decline offer"
              className="px-4 py-2.5 bg-red-500/10 text-red-600 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
              <XCircle size={16} />
            </button>
          </div>
          {counterError && <p role="alert" className="text-xs text-red-500 font-medium">{counterError}</p>}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Clock size={12} /> {new Date(split.created_at).toLocaleDateString()}
      </p>
    </div>
  );
};
