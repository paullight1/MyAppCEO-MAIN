import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Loader2, AlertCircle, CheckCircle2, Clock, Mail, X } from 'lucide-react';
import { useTeamManagement } from '../hooks/useTeamManagement';
import { CofounderInviteModal } from '../components/modals/CofounderInviteModal';
import { VestingProgress } from '../components/VestingProgress';
import { OnboardingHint } from '../components/OnboardingHint';

export const TeamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getCoowners, removeCofounder, getPendingInvites, acceptInvite, declineInvite } = useTeamManagement();
  const [coowners, setCoowners] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [actingInvite, setActingInvite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadData();
    loadInvites();
  }, [id]);

  const loadInvites = async () => {
    const res = await getPendingInvites();
    if (res.success) {
      const payload = (res.data as any)?.data ?? res.data;
      setPendingInvites(Array.isArray(payload) ? payload : []);
    }
  };

  const respondInvite = async (inviteId: string, accept: boolean) => {
    setActingInvite(inviteId);
    setError('');
    try {
      const res = accept ? await acceptInvite(inviteId) : await declineInvite(inviteId);
      if (!res.success) throw new Error(res.error || 'Failed to update invitation');
      await Promise.all([loadInvites(), loadData()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invitation');
    } finally {
      setActingInvite(null);
    }
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getCoowners(id);
      if (result.success && result.data) {
        setCoowners(Array.isArray(result.data) ? result.data : []);
      } else if (!result.success) {
        setError(result.error || 'Failed to load team');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (coOwnerId: string) => {
    if (!confirm('Remove this team member?')) return;
    if (!id) return;
    setError('');
    try {
      await removeCofounder(id, coOwnerId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const roleColors: Record<string, string> = {
    founder: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    co_founder: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    early_employee: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    advisor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };
  const roleFallback = 'bg-muted text-muted-foreground border-border';
  const formatRole = (role?: string) => (role ? role.replace(/_/g, ' ') : 'member');

  const statusIcons: Record<string, React.ReactNode> = {
    accepted: <CheckCircle2 size={14} className="text-emerald-500" />,
    pending: <Clock size={14} className="text-amber-500" />,
    declined: <AlertCircle size={14} className="text-red-500" />,
    departed: <AlertCircle size={14} className="text-gray-500" />,
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/apps/${id}/dashboard`} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Users size={24} className="text-accent" /> Team & Ownership
              </h1>
              <p className="text-muted-foreground">Manage co-founders, equity splits, and vesting</p>
            </div>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all flex items-center gap-2">
            <Plus size={16} /> Invite
          </button>
        </div>

        <OnboardingHint
          hintKey="hint-invite-cofounder"
          title="Add a co-founder to share the workload"
          description="Distribute equity fairly and set vesting terms to protect everyone's interests."
          actionLabel="Invite someone"
          onAction={() => setShowInvite(true)}
        />

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-accent" />
              <h3 className="font-bold text-foreground">Invitations for you ({pendingInvites.length})</h3>
            </div>
            <div className="space-y-3">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {inv.app?.name || 'An app'} <span className="font-normal text-muted-foreground">invited you as</span> <span className="capitalize">{formatRole(inv.role)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Number(inv.equity_pct) || 0}% equity · {inv.vesting_months || 0}mo vesting
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => respondInvite(inv.id, true)}
                      disabled={actingInvite === inv.id}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      {actingInvite === inv.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Accept
                    </button>
                    <button
                      onClick={() => respondInvite(inv.id, false)}
                      disabled={actingInvite === inv.id}
                      aria-label="Decline invitation"
                      className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <X size={15} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-accent animate-spin" /></div>
        ) : coowners.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <Users size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="font-bold text-foreground text-lg">No team members yet</h3>
            <p className="text-muted-foreground text-sm mt-2">Invite co-founders to build together</p>
            <button onClick={() => setShowInvite(true)} className="mt-4 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90">
              Invite Co-Founder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coowners.map(co => (
              <div key={co.id} className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-lg font-bold text-accent">
                      {co.user_profiles?.full_name?.[0] || co.email?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{co.user_profiles?.full_name || co.email || 'Pending invite'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${roleColors[co.role] || roleFallback}`}>
                        {formatRole(co.role)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {statusIcons[co.status]}
                    <span className="text-xs text-muted-foreground capitalize">{co.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-xl">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Equity</p>
                    <p className="font-bold text-foreground text-lg">{co.equity_pct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vesting</p>
                    <p className="font-bold text-foreground text-lg">{co.vesting_months}mo</p>
                  </div>
                </div>

                {co.status === 'accepted' && co.vesting_months > 0 && (
                  <VestingProgress
                    vestedPct={co.vesting_start ? Math.min(100, ((Date.now() - new Date(co.vesting_start).getTime()) / (co.vesting_months * 30.44 * 24 * 60 * 60 * 1000)) * 100) : 0}
                    startDate={co.vesting_start}
                    cliffDate={co.cliff_date}
                    vestingMonths={co.vesting_months}
                  />
                )}

                {co.status === 'pending' && (
                  <button onClick={() => handleRemove(co.id)} className="w-full py-2.5 bg-red-500/10 text-red-600 rounded-xl font-medium text-sm hover:bg-red-500/20 transition-colors">
                    Withdraw Invite
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <CofounderInviteModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          appId={id || ''}
          onInvite={loadData}
          allocatedEquityPct={coowners
            .filter(c => c.status !== 'declined' && c.status !== 'departed')
            .reduce((sum, c) => sum + (Number(c.equity_pct) || 0), 0)}
        />
      </div>
    </DashboardLayout>
  );
};
