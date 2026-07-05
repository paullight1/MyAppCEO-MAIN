import React, { useState } from 'react';
import { CheckCircle2, Building2, Loader2, AlertCircle } from 'lucide-react';

interface LegalEntityWizardProps {
  appId: string;
  onCreate: (entity: any) => void;
  existingEntity?: any;
}

const ENTITY_TYPES = [
  { id: 'sole_proprietorship', label: 'Sole Proprietorship', desc: 'Simplest structure, you and the business are one' },
  { id: 'llc', label: 'LLC', desc: 'Liability protection with flexible taxation' },
  { id: 'c_corp', label: 'C-Corporation', desc: 'Standard for venture-backed startups' },
  { id: 's_corp', label: 'S-Corporation', desc: 'Pass-through taxation for US businesses' },
  { id: 'partnership', label: 'Partnership', desc: 'Shared ownership with shared liability' },
];

const JURISDICTIONS = [
  { id: 'delaware', label: 'Delaware', desc: 'Most startup-friendly' },
  { id: 'wyoming', label: 'Wyoming', desc: 'Low fees, strong privacy' },
  { id: 'nevada', label: 'Nevada', desc: 'No state income tax' },
  { id: 'california', label: 'California', desc: 'If your team is based here' },
  { id: 'new_york', label: 'New York', desc: 'Financial hub' },
  { id: 'other_us', label: 'Other US State', desc: '' },
  { id: 'international', label: 'International', desc: 'Outside the United States' },
];

export const LegalEntityWizard: React.FC<LegalEntityWizardProps> = ({ appId, onCreate, existingEntity }) => {
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState(existingEntity?.entity_type || '');
  const [jurisdiction, setJurisdiction] = useState(existingEntity?.jurisdiction || '');
  const [entityName, setEntityName] = useState(existingEntity?.entity_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!entityType) { setError('Select an entity type'); return; }
    if (!jurisdiction) { setError('Select a jurisdiction'); return; }

    setLoading(true);
    setError('');
    try {
      await onCreate({ entity_type: entityType, jurisdiction, entity_name: entityName || undefined });
      setSuccess(true);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to create entity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-500 font-medium">Legal entity configured successfully!</p>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-500 font-medium">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > s ? 'bg-emerald-500 text-white' : step === s ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}>
              {step > s ? <CheckCircle2 size={16} /> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-emerald-500' : 'bg-muted'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Select Entity Type</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ENTITY_TYPES.map(t => (
              <button key={t.id} onClick={() => { setEntityType(t.id); setStep(2); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${entityType === t.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                <p className="font-bold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Choose Jurisdiction</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {JURISDICTIONS.map(j => (
              <button key={j.id} onClick={() => setJurisdiction(j.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${jurisdiction === j.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                <p className="font-bold text-foreground">{j.label}</p>
                {j.desc && <p className="text-xs text-muted-foreground mt-1">{j.desc}</p>}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-sm font-bold text-foreground mb-1.5 block">Entity Name (optional)</label>
            <input type="text" value={entityName} onChange={e => setEntityName(e.target.value)}
              placeholder="MyAppCEO Inc."
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(1)} className="px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80">Back</button>
            <button onClick={handleCreate} disabled={loading} className="flex-1 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <> <Building2 size={16} /> Create Entity</>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-center">
          <Building2 size={32} className="text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-emerald-800 dark:text-emerald-400 text-lg">Entity Created</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400/80 mt-1">{ENTITY_TYPES.find(t => t.id === entityType)?.label} in {JURISDICTIONS.find(j => j.id === jurisdiction)?.label}</p>
        </div>
      )}
    </div>
  );
};
