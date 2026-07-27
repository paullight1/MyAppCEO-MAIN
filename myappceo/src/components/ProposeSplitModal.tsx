import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeftRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { FormField } from './ui/FormField';
import { Select } from './ui/Select';
import { useEquitySplit } from '../hooks/useEquitySplit';
import { useTeamManagement, Cofounder } from '../hooks/useTeamManagement';
import { useAuth } from '../hooks/useAuth';

interface ProposeSplitModalProps {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful proposal so the parent can reload. */
  onProposed: () => void;
}

const ROLES = [
  { value: 'co_founder', label: 'Co-Founder' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'employee', label: 'Employee' },
  { value: 'shareholder', label: 'Shareholder' },
];

const VESTING = [
  { value: 'standard_4yr_1yr', label: 'Standard · 4yr / 1yr cliff' },
  { value: 'standard', label: 'Standard' },
  { value: 'accelerated', label: 'Accelerated' },
  { value: 'none', label: 'No vesting' },
];

const inputClass =
  'w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors';

export const ProposeSplitModal: React.FC<ProposeSplitModalProps> = ({ appId, open, onOpenChange, onProposed }) => {
  const { proposeSplit } = useEquitySplit();
  const { getCoowners } = useTeamManagement();
  const { user } = useAuth();

  const [candidates, setCandidates] = useState<Cofounder[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [targetUserId, setTargetUserId] = useState('');
  const [pct, setPct] = useState('');
  const [role, setRole] = useState('co_founder');
  const [vesting, setVesting] = useState('standard_4yr_1yr');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const res = await getCoowners(appId);
      const payload = (res.data as any)?.data ?? res.data;
      const list: Cofounder[] = Array.isArray(payload) ? payload : [];
      // Only co-owners with a real linked account can receive an offer (equity_splits.user_id is required).
      setCandidates(list.filter(c => c.user_id && c.user_id !== user?.id));
    } finally {
      setLoadingCandidates(false);
    }
  }, [appId, getCoowners, user?.id]);

  useEffect(() => {
    if (open) {
      setError('');
      setTargetUserId('');
      setPct('');
      setRole('co_founder');
      setVesting('standard_4yr_1yr');
      loadCandidates();
    }
  }, [open, loadCandidates]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await proposeSplit(appId, targetUserId, Number(pct), role, vesting);
      if (!res.success) throw new Error(res.error || 'Failed to send proposal');
      onProposed();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send proposal');
    } finally {
      setBusy(false);
    }
  };

  const candidateOptions = candidates.map(c => ({
    value: c.user_id,
    label: c.user_profiles?.full_name || c.email || 'Team member',
  }));

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Propose an equity split</DialogTitle>
          <DialogDescription>Offer ownership to a team member. They can accept, decline, or counter.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}

        {loadingCandidates ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <Users size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-semibold text-foreground">No eligible team members yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              Invite a co-founder and once they join with an account you can propose an equity split to them.
            </p>
            <Link
              to={`/apps/${appId}/team`}
              onClick={() => onOpenChange(false)}
              className="mt-4 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/90"
            >
              Go to Team
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <Select label="Team member" value={targetUserId} onValueChange={setTargetUserId} placeholder="Select a recipient" options={candidateOptions} size="sm" />
            <FormField label="Proposed equity %" helperText="Greater than 0, up to 100">
              <input type="number" min={0.01} max={100} step="0.01" value={pct} onChange={e => setPct(e.target.value)} placeholder="e.g. 10" className={inputClass} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Role" value={role} onValueChange={setRole} options={ROLES} size="sm" />
              <Select label="Vesting" value={vesting} onValueChange={setVesting} options={VESTING} size="sm" />
            </div>
            <button
              type="button"
              disabled={busy || !targetUserId || !pct}
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />} Send proposal
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
