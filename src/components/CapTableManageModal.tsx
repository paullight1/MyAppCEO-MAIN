import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, UserPlus, Layers, Coins, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { FormField } from './ui/FormField';
import { Select } from './ui/Select';
import { useCapTable, ShareClass, OptionPool } from '../hooks/useCapTable';

interface CapTableManageModalProps {
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after any successful write so the parent can reload. */
  onChanged: () => void;
}

const OWNER_TYPES = [
  { value: 'founder', label: 'Founder' },
  { value: 'cofounder', label: 'Co-Founder' },
  { value: 'investor', label: 'Investor' },
  { value: 'employee', label: 'Employee' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'option_pool', label: 'Option Pool' },
];

const CLASS_TYPES = [
  { value: 'common', label: 'Common' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'options', label: 'Options' },
  { value: 'restricted', label: 'Restricted' },
];

const inputClass =
  'w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors';

type Tab = 'stakeholder' | 'classes' | 'pool';

export const CapTableManageModal: React.FC<CapTableManageModalProps> = ({ appId, open, onOpenChange, onChanged }) => {
  const { addEntry, addShareClass, getShareClasses, getOptionPool, updateOptionPool } = useCapTable();
  const [tab, setTab] = useState<Tab>('stakeholder');
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [optionPool, setOptionPool] = useState<OptionPool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Stakeholder form
  const [ownerType, setOwnerType] = useState('founder');
  const [equityPct, setEquityPct] = useState('');
  const [shares, setShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [shareClassId, setShareClassId] = useState('');

  // Share class form
  const [className, setClassName] = useState('');
  const [classType, setClassType] = useState('common');
  const [totalShares, setTotalShares] = useState('');

  // Option pool form
  const [poolTotal, setPoolTotal] = useState('');

  const loadStructure = useCallback(async () => {
    const [classesRes, poolRes] = await Promise.all([getShareClasses(appId), getOptionPool(appId)]);
    if (classesRes.success) {
      const payload = (classesRes.data as any)?.data ?? classesRes.data;
      setShareClasses(Array.isArray(payload) ? payload : []);
    }
    if (poolRes.success) {
      const payload = (poolRes.data as any)?.data ?? poolRes.data;
      setOptionPool(payload || null);
      if (payload?.total_options != null) setPoolTotal(String(payload.total_options));
    }
  }, [appId, getShareClasses, getOptionPool]);

  useEffect(() => {
    if (open) {
      setError('');
      setNotice('');
      loadStructure();
    }
  }, [open, loadStructure]);

  const resetStakeholder = () => {
    setEquityPct('');
    setShares('');
    setPricePerShare('');
    setShareClassId('');
  };

  const submitStakeholder = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await addEntry(appId, {
        owner_type: ownerType,
        equity_pct: equityPct ? Number(equityPct) : 0,
        shares_count: Number(shares),
        price_per_share: pricePerShare ? Number(pricePerShare) : 0,
        share_class_id: shareClassId || undefined,
      });
      if (!res.success) throw new Error(res.error || 'Failed to add stakeholder');
      setNotice('Stakeholder added.');
      resetStakeholder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stakeholder');
    } finally {
      setBusy(false);
    }
  };

  const submitShareClass = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await addShareClass(appId, {
        class_name: className.trim(),
        class_type: classType,
        total_shares: Number(totalShares),
      });
      if (!res.success) throw new Error(res.error || 'Failed to create share class');
      setNotice('Share class created.');
      setClassName('');
      setTotalShares('');
      await loadStructure();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share class');
    } finally {
      setBusy(false);
    }
  };

  const submitPool = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await updateOptionPool(appId, Number(poolTotal));
      if (!res.success) throw new Error(res.error || 'Failed to update option pool');
      setNotice('Option pool updated.');
      await loadStructure();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update option pool');
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof UserPlus }[] = [
    { id: 'stakeholder', label: 'Stakeholder', icon: UserPlus },
    { id: 'classes', label: 'Share Classes', icon: Layers },
    { id: 'pool', label: 'Option Pool', icon: Coins },
  ];

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage cap table</DialogTitle>
          <DialogDescription>Add stakeholders, define share classes, and size your option pool.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setError(''); setNotice(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all ${tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}
        {notice && !error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <Check size={16} className="shrink-0 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{notice}</p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {tab === 'stakeholder' && (
            <>
              <Select label="Stakeholder type" value={ownerType} onValueChange={setOwnerType} options={OWNER_TYPES} size="sm" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Equity %" helperText="Ownership share (0–100)">
                  <input type="number" min={0} max={100} step="0.01" value={equityPct} onChange={e => setEquityPct(e.target.value)} placeholder="e.g. 40" className={inputClass} />
                </FormField>
                <FormField label="Shares">
                  <input type="number" min={0} step="1" value={shares} onChange={e => setShares(e.target.value)} placeholder="e.g. 4000000" className={inputClass} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Price / share" helperText="Optional">
                  <input type="number" min={0} step="0.0001" value={pricePerShare} onChange={e => setPricePerShare(e.target.value)} placeholder="0.00" className={inputClass} />
                </FormField>
                <FormField label="Share class" helperText="Optional">
                  <Select
                    value={shareClassId}
                    onValueChange={setShareClassId}
                    placeholder={shareClasses.length ? 'Unassigned' : 'None defined'}
                    options={shareClasses.map(sc => ({ value: sc.id, label: sc.class_name }))}
                    size="sm"
                  />
                </FormField>
              </div>
              <button
                type="button"
                disabled={busy || !shares}
                onClick={submitStakeholder}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Add stakeholder
              </button>
            </>
          )}

          {tab === 'classes' && (
            <>
              {shareClasses.length > 0 && (
                <div className="space-y-1.5">
                  {shareClasses.map(sc => (
                    <div key={sc.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-semibold text-foreground">{sc.class_name}</span>
                      <span className="text-xs text-muted-foreground">{sc.class_type} · {Number(sc.total_shares).toLocaleString()} shares</span>
                    </div>
                  ))}
                </div>
              )}
              <FormField label="Class name">
                <input type="text" value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. Common A" className={inputClass} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Class type" value={classType} onValueChange={setClassType} options={CLASS_TYPES} size="sm" />
                <FormField label="Total shares">
                  <input type="number" min={1} step="1" value={totalShares} onChange={e => setTotalShares(e.target.value)} placeholder="10000000" className={inputClass} />
                </FormField>
              </div>
              <button
                type="button"
                disabled={busy || !className.trim() || !totalShares}
                onClick={submitShareClass}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />} Create share class
              </button>
            </>
          )}

          {tab === 'pool' && (
            <>
              {optionPool && (
                <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  Granted: <span className="font-semibold text-foreground">{Number(optionPool.granted_options || 0).toLocaleString()}</span> of{' '}
                  <span className="font-semibold text-foreground">{Number(optionPool.total_options || 0).toLocaleString()}</span> options
                </div>
              )}
              <FormField label="Total option pool" helperText="Cannot be lower than already-granted options">
                <input type="number" min={0} step="1" value={poolTotal} onChange={e => setPoolTotal(e.target.value)} placeholder="e.g. 1000000" className={inputClass} />
              </FormField>
              <button
                type="button"
                disabled={busy || poolTotal === ''}
                onClick={submitPool}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />} Save option pool
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
