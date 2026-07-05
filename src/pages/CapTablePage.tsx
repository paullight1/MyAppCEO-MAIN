import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, PieChart, Plus, Calculator, Loader2, AlertCircle } from 'lucide-react';
import { useCapTable } from '../hooks/useCapTable';
import { CapTableChart, capTableColor } from '../components/CapTableChart';
import { CapTableList, CapTableRow } from '../components/CapTableList';
import { CapTableManageModal } from '../components/CapTableManageModal';
import { DilutionCalculator } from '../components/DilutionCalculator';
import { OnboardingHint } from '../components/OnboardingHint';
import { ConfirmDialog } from '../components/ui';

export const CapTablePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getCapTable, removeEntry } = useCapTable();
  const [capTable, setCapTable] = useState<CapTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDilution, setShowDilution] = useState(false);
  const [error, setError] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CapTableRow | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setError('');
      const result = await getCapTable(id);
      if (result.success && result.data) {
        const payload = (result.data as unknown as { data?: CapTableRow[] }).data ?? (result.data as unknown as CapTableRow[]);
        setCapTable(Array.isArray(payload) ? payload : []);
      } else if (!result.success) {
        setError(result.error || 'Failed to load cap table');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cap table');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      setError('');
      const res = await removeEntry(pendingRemove.id);
      if (!res.success) throw new Error(res.error || 'Failed to remove stakeholder');
      setPendingRemove(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stakeholder');
    } finally {
      setRemoving(false);
    }
  };

  const chartData = capTable.map(entry => ({
    name: entry.user_profiles?.full_name || entry.owner_type,
    value: entry.equity_pct ?? 0,
    type: entry.owner_type,
    color: capTableColor(entry.owner_type),
  }));

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <Link to={`/apps/${id}/dashboard`} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft size={20} className="text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <PieChart size={24} className="text-accent" /> Cap Table
            </h1>
            <p className="text-muted-foreground">Ownership breakdown and dilution analysis</p>
          </div>
        </div>

        <OnboardingHint
          hintKey="hint-review-captable"
          title="Review your cap table before launching"
          description="Make sure your equity split is fair and you understand dilution before raising funds."
          variant="default"
        />

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-accent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="font-bold text-foreground mb-4">Ownership Distribution</h3>
              <CapTableChart data={chartData} />
            </div>

            {/* Table */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Stakeholders</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowDilution(!showDilution)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${showDilution ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                    <Calculator size={14} className="inline mr-1" /> Dilution
                  </button>
                  <button onClick={() => setShowManage(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-accent text-white hover:bg-accent/90">
                    <Plus size={14} className="inline mr-1" /> Manage
                  </button>
                </div>
              </div>

              {showDilution ? (
                <DilutionCalculator currentCapTable={capTable.map(e => ({ owner_type: e.owner_type, equity_pct: e.equity_pct }))} />
              ) : capTable.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <Plus className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <h4 className="text-lg font-bold text-foreground">No ownership records yet</h4>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Add co-founders or sync paid investors before relying on this cap table for a funding round.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button onClick={() => setShowManage(true)} className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent/90">
                      Add Stakeholder
                    </button>
                    <Link to={`/apps/${id}/team`} className="rounded-xl bg-muted px-5 py-3 text-sm font-bold text-foreground hover:bg-muted/80">
                      Add Team Ownership
                    </Link>
                    <Link to={`/campaigns/new?appId=${id}`} className="rounded-xl bg-muted px-5 py-3 text-sm font-bold text-foreground hover:bg-muted/80">
                      Create Funding Draft
                    </Link>
                  </div>
                </div>
              ) : (
                <CapTableList data={capTable} editable onRemove={(entryId) => setPendingRemove(capTable.find(e => e.id === entryId) || null)} />
              )}
            </div>
          </div>
        )}
      </div>

      {id && (
        <CapTableManageModal appId={id} open={showManage} onOpenChange={setShowManage} onChanged={loadData} />
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(o) => { if (!o) setPendingRemove(null); }}
        title="Remove stakeholder?"
        description={pendingRemove ? `This removes ${pendingRemove.user_profiles?.full_name || pendingRemove.owner_type} from the cap table. This cannot be undone.` : ''}
        confirmLabel="Remove"
        tone="danger"
        loading={removing}
        onConfirm={handleRemove}
      />
    </DashboardLayout>
  );
};
