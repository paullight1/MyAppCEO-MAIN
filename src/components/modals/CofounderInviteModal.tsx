import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { useTeamManagement } from '../../hooks/useTeamManagement';

interface CofounderInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: string;
  onInvite?: () => void;
  /** Equity already allocated to existing members (%), used to validate the pool. */
  allocatedEquityPct?: number;
}

const ROLES = [
  { id: 'co_founder', label: 'Co-Founder' },
  { id: 'early_employee', label: 'Early Employee' },
  { id: 'advisor', label: 'Advisor' },
];

const VESTING_OPTIONS = [
  { id: 'standard_4yr_1yr', label: 'Standard', description: '48 months total (4 years).', presetMonths: 48 },
  { id: 'standard_4yr_6mo', label: 'Short', description: '42 months total (3.5 years).', presetMonths: 42 },
  { id: 'custom', label: 'Custom', description: 'Enter a custom vesting duration in months.', presetMonths: null },
] as const;

type VestingOptionId = typeof VESTING_OPTIONS[number]['id'];

const DEFAULT_VESTING_MONTHS = String(VESTING_OPTIONS[0].presetMonths);

export const CofounderInviteModal: React.FC<CofounderInviteModalProps> = ({ isOpen, onClose, appId, onInvite, allocatedEquityPct }) => {
  const remainingEquity = allocatedEquityPct != null ? Math.max(0, 100 - allocatedEquityPct) : null;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('co_founder');
  const [equityPct, setEquityPct] = useState('');
  const [vestingTerms, setVestingTerms] = useState<VestingOptionId>('standard_4yr_1yr');
  const [vestingMonths, setVestingMonths] = useState(DEFAULT_VESTING_MONTHS);
  const [customVestingMonths, setCustomVestingMonths] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { inviteCofounder } = useTeamManagement();
  const closeTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const resetForm = React.useCallback(() => {
    setEmail('');
    setRole('co_founder');
    setEquityPct('');
    setVestingTerms('standard_4yr_1yr');
    setVestingMonths(DEFAULT_VESTING_MONTHS);
    setCustomVestingMonths('');
    setLoading(false);
    setSuccess(false);
    setError('');
  }, []);

  const handleClose = React.useCallback(() => {
    if (loading) return;
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    resetForm();
    onClose();
  }, [loading, onClose, resetForm]);

  const selectVestingOption = (optionId: VestingOptionId) => {
    const option = VESTING_OPTIONS.find(v => v.id === optionId);
    setVestingTerms(optionId);
    setError('');

    if (!option) return;

    if (option.presetMonths == null) {
      setVestingMonths(customVestingMonths);
      return;
    }

    const nextMonths = String(option.presetMonths);
    setVestingMonths(nextMonths);
  };

  const handleCustomVestingMonthsChange = (value: string) => {
    setCustomVestingMonths(value);
    setVestingMonths(value);
    setError('');
  };

  const handleInvite = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const equityValue = Number(equityPct);
    const vestingValue = Number(vestingMonths);

    if (!normalizedEmail) { setError('Email is required'); return; }
    if (!normalizedEmail.includes('@')) { setError('Enter a valid email address'); return; }
    if (!Number.isFinite(equityValue) || equityValue <= 0) { setError('Equity % must be greater than 0'); return; }
    if (equityValue > 100) { setError('Equity % cannot exceed 100'); return; }
    if (remainingEquity != null && equityValue > remainingEquity + 1e-9) {
      setError(`Only ${remainingEquity.toFixed(1)}% equity remains to allocate.`);
      return;
    }
    if (!Number.isFinite(vestingValue) || vestingValue < 1 || !Number.isInteger(vestingValue)) {
      setError('Enter a whole number of vesting months');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await inviteCofounder(appId, normalizedEmail, equityValue, role, vestingValue);
      if (!result.success) throw new Error(result.error || 'Failed to create invite');
      setSuccess(true);
      onInvite?.();
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = window.setTimeout(() => {
        resetForm();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create invite');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
          <X size={20} className="text-muted-foreground" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-2">Invite Co-Founder</h2>
        <p className="text-sm text-muted-foreground mb-6">Create a private invite for a teammate to join your app workspace.</p>

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="text-sm text-emerald-500 font-medium">Pending invite created successfully. They can accept after signing in with that email.</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="cofounder@email.com"
                className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">A pending invite will be created for that email address.</p>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Role</label>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => { setRole(r.id); setError(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${role === r.id ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Equity Percentage</label>
            <div className="relative">
              <input type="number" value={equityPct} onChange={e => { setEquityPct(e.target.value); setError(''); }}
                placeholder="10" min="0" max="100" step="0.1"
                className="w-full pl-4 pr-10 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
            </div>
            {remainingEquity != null && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {allocatedEquityPct!.toFixed(1)}% already allocated · <span className="font-semibold text-foreground">{remainingEquity.toFixed(1)}% remaining</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Vesting Duration</label>
            <p className="mb-2 text-xs text-muted-foreground">The backend stores vesting duration in months. Cliff timing uses the platform default.</p>
            <div className="space-y-2">
              {VESTING_OPTIONS.map(v => (
                <button key={v.id} type="button" onClick={() => selectVestingOption(v.id)}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border text-left px-4 ${vestingTerms === v.id ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                  <span className="block">{v.label}</span>
                  <span className="block text-xs font-normal opacity-80">{v.description}</span>
                </button>
              ))}
            </div>
            {vestingTerms === 'custom' && (
              <div className="mt-3">
                <label className="text-sm font-bold text-foreground mb-1.5 block">Custom Months</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customVestingMonths}
                    onChange={e => handleCustomVestingMonthsChange(e.target.value)}
                    placeholder="48"
                    min="1"
                    step="1"
                    className="w-full pl-4 pr-12 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">mo</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Enter a whole number of months for the invite record.</p>
              </div>
            )}
          </div>

          <button onClick={handleInvite} disabled={loading}
            className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Invite'}
          </button>
        </div>
      </div>
    </div>
  );
};
