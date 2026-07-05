import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { EquitySplit, useEquitySplit } from '../hooks/useEquitySplit';
import { EquitySplitCard } from '../components/EquitySplitCard';
import { ProposeSplitModal } from '../components/ProposeSplitModal';
import { OnboardingHint } from '../components/OnboardingHint';

export const EquitySplitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPendingSplits, getMyPendingOffers, acceptSplit, declineSplit, counterSplit } = useEquitySplit();
  const [splits, setSplits] = useState<EquitySplit[]>([]);
  const [myOffers, setMyOffers] = useState<EquitySplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPropose, setShowPropose] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [splitsRes, offersRes] = await Promise.all([getPendingSplits(id), getMyPendingOffers()]);
      if (splitsRes.success) setSplits(splitsRes.data ?? []);
      if (offersRes.success) setMyOffers(offersRes.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load equity splits');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (splitId: string) => {
    try {
      const result = await acceptSplit(splitId);
      if (result.success) { setSuccess('Offer accepted!'); loadData(); setTimeout(() => setSuccess(''), 3000); }
    } catch (err: any) { setError(err.message); }
  };

  const handleDecline = async (splitId: string) => {
    try {
      const result = await declineSplit(splitId);
      if (result.success) { setSuccess('Offer declined'); loadData(); setTimeout(() => setSuccess(''), 3000); }
    } catch (err: any) { setError(err.message); }
  };

  const handleCounter = async (splitId: string, pct: number) => {
    if (!pct || pct <= 0) return;
    try {
      const result = await counterSplit(splitId, pct);
      if (result.success) { setSuccess('Counter-offer sent'); loadData(); setTimeout(() => setSuccess(''), 3000); }
    } catch (err: any) { setError(err.message); }
  };

  const totalProposedEquity = splits.reduce((sum, s) => sum + (s.proposed_pct || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <Link to={`/apps/${id}/team`} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft size={20} className="text-muted-foreground" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <ArrowLeftRight size={24} className="text-accent" /> Equity Splits
            </h1>
            <p className="text-muted-foreground">Manage equity proposals and negotiations</p>
          </div>
          <button
            onClick={() => setShowPropose(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus size={16} /> Propose Split
          </button>
        </div>

        <OnboardingHint
          hintKey="hint-equity-split"
          title="Fair equity splits prevent disputes later"
          description="Use the equity split feature to propose and negotiate ownership percentages with your team."
          variant="default"
        />

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="text-sm text-emerald-500 font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {totalProposedEquity > 0 && (
          <div className="p-4 bg-muted rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Proposed Equity</p>
              <p className={`text-lg font-bold ${totalProposedEquity > 100 ? 'text-red-500' : totalProposedEquity > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {totalProposedEquity.toFixed(1)}% / 100%
              </p>
            </div>
            <div className="h-2 bg-muted-foreground/20 rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${totalProposedEquity > 100 ? 'bg-red-500' : totalProposedEquity > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(totalProposedEquity, 100)}%` }} />
            </div>
            {totalProposedEquity > 100 && (
              <p className="text-xs text-red-500 mt-2 font-medium">Warning: Proposed equity exceeds 100%</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-accent animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {splits.length === 0 && myOffers.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-2xl border border-border">
                <ArrowLeftRight size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="font-bold text-foreground text-lg">No equity proposals</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
                  Invite co-founders from the team page or review the cap table before negotiating ownership changes.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button onClick={() => setShowPropose(true)} className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent/90">
                    Propose a Split
                  </button>
                  <Link to={`/apps/${id}/team`} className="rounded-xl bg-muted px-5 py-3 text-sm font-bold text-foreground hover:bg-muted/80">
                    Invite Co-Founder
                  </Link>
                  <Link to={`/apps/${id}/cap-table`} className="rounded-xl bg-muted px-5 py-3 text-sm font-bold text-foreground hover:bg-muted/80">
                    Review Cap Table
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {myOffers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">My Offers</h3>
                    <div className="space-y-3">
                      {myOffers.map(s => (
                        <EquitySplitCard key={s.id} split={s} onAccept={handleAccept} onDecline={handleDecline} onCounter={handleCounter} />
                      ))}
                    </div>
                  </div>
                )}
                {splits.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Incoming Proposals</h3>
                    <div className="space-y-3">
                      {splits.map(s => (
                        <EquitySplitCard key={s.id} split={s} onAccept={handleAccept} onDecline={handleDecline} onCounter={handleCounter} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {id && (
        <ProposeSplitModal
          appId={id}
          open={showPropose}
          onOpenChange={setShowPropose}
          onProposed={() => { setSuccess('Proposal sent'); loadData(); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </DashboardLayout>
  );
};
