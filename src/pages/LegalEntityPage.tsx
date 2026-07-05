import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { useLegalEntity, LegalEntity } from '../hooks/useLegalEntity';
import { LegalEntityWizard } from '../components/LegalEntityWizard';
import { OnboardingHint } from '../components/OnboardingHint';

const ENTITY_LABELS: Record<string, string> = {
  sole_proprietorship: 'Sole Proprietorship',
  llc: 'LLC',
  c_corp: 'C-Corporation',
  s_corp: 'S-Corporation',
  corporation: 'Corporation',
  partnership: 'Partnership',
  foundation: 'Foundation',
  not_formed: 'Not Formed',
};

const STATUS_STYLES: Record<string, string> = {
  not_formed: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  formed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const humanize = (value?: string) => (value ? value.replace(/_/g, ' ') : '');

export const LegalEntityPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getEntity, createEntity, updateEntity } = useLegalEntity();
  const [entity, setEntity] = useState<LegalEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) loadEntity();
  }, [id]);

  const loadEntity = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getEntity(id);
      if (res.success) {
        const data = (res.data as any)?.data ?? res.data;
        setEntity(data || null);
      } else {
        setError(res.error || 'Failed to load legal entity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load legal entity');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (payload: { entity_type: string; jurisdiction?: string; entity_name?: string }) => {
    if (!id) return;
    const res = entity
      ? await updateEntity(id, payload)
      : await createEntity(id, payload);
    if (!res.success) throw new Error(res.error || 'Failed to save legal entity');
    const data = (res.data as any)?.data ?? res.data;
    setEntity(data || null);
    setEditing(false);
  };

  const showWizard = !entity || editing;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <Link to={`/apps/${id}/dashboard`} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft size={20} className="text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Building2 size={24} className="text-accent" /> Legal Entity
            </h1>
            <p className="text-muted-foreground">Incorporate your app and set up its legal structure</p>
          </div>
        </div>

        <OnboardingHint
          hintKey="hint-legal-entity"
          title="Formalize your business before raising or hiring"
          description="Choose an entity type and jurisdiction. You can update these details as your incorporation progresses."
          variant="default"
        />

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-accent animate-spin" /></div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            {entity && !editing && (
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[entity.status] || STATUS_STYLES.not_formed}`}>
                    {humanize(entity.status) || 'Not formed'}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil size={14} /> Edit details
                </button>
              </div>
            )}

            {entity && !editing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entity type</p>
                  <p className="font-bold text-foreground mt-0.5">{ENTITY_LABELS[entity.entity_type] || humanize(entity.entity_type)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jurisdiction</p>
                  <p className="font-bold text-foreground mt-0.5 capitalize">{humanize(entity.jurisdiction) || '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 sm:col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entity name</p>
                  <p className="font-bold text-foreground mt-0.5">{entity.entity_name || 'Not set'}</p>
                </div>
              </div>
            )}

            {showWizard && id && (
              <>
                {editing && (
                  <button onClick={() => setEditing(false)} className="mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground">
                    ← Cancel edit
                  </button>
                )}
                <LegalEntityWizard appId={id} onCreate={handleSave} existingEntity={editing ? entity : undefined} />
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
