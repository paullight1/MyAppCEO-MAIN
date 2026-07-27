import React, { useState } from 'react';
import { UsersRound, Mail, Copy, Loader2, Search, UserPlus, Shield, X, Crown, Users, Briefcase, AlertCircle } from 'lucide-react';
import { RoleBadge } from './RoleBadge';
import { useAppRole } from '../hooks/useAppRole';
import { useUserStatus } from '../hooks/useUserStatus';
import { CofounderInviteModal } from './modals/CofounderInviteModal';

const ASSIGNABLE_ROLES = [
  { id: 'ceo', label: 'CEO' },
  { id: 'co_founder', label: 'Co-Founder' },
  { id: 'shareholder', label: 'Shareholder' },
  { id: 'early_employee', label: 'Early Employee' },
  { id: 'advisor', label: 'Advisor' },
];

interface MembersPanelProps {
  appId: string;
}

interface Member {
  id: string;
  role?: string;
  equity_pct?: number;
  joined_at?: string;
  user_profile?: { full_name?: string; email?: string; avatar_url?: string };
}

const INVITE_NOTE = 'Email invite only. No public join URL is available yet. Use the Invite button to create a private co-founder request for the intended email address.';

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard access is not available');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Clipboard copy failed');
  }
};

export const MembersPanel: React.FC<MembersPanelProps> = ({ appId }) => {
  const { getMembers, removeMember, updateMemberRole, getRole } = useAppRole();
  const { isAdmin } = useUserStatus();
  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copyStateTimeout = React.useRef<number | null>(null);

  const loadMembers = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getMembers(appId);
      if (result.success && result.data) {
        setMembers(Array.isArray(result.data) ? (result.data as Member[]) : []);
      } else if (!result.success) {
        setError(result.error || 'Failed to load members');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [appId, getMembers]);

  React.useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  React.useEffect(() => {
    let cancelled = false;
    getRole(appId).then(result => {
      if (!cancelled && result.success && result.data) {
        setCanManage(Boolean(result.data.permissions?.manage_team));
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [appId, getRole]);

  React.useEffect(() => {
    return () => {
      if (copyStateTimeout.current) window.clearTimeout(copyStateTimeout.current);
    };
  }, []);

  const handleCopyInviteNote = async () => {
    try {
      await copyTextToClipboard(INVITE_NOTE);
      setCopyState('copied');
    } catch (err) {
      console.error('Failed to copy invite note:', err);
      setCopyState('error');
    }

    if (copyStateTimeout.current) window.clearTimeout(copyStateTimeout.current);
    copyStateTimeout.current = window.setTimeout(() => setCopyState('idle'), 2000);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member from the app?')) return;
    setActionLoading(memberId);
    setError('');
    try {
      await removeMember(memberId);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setActionLoading(memberId);
    setError('');
    try {
      const result = await updateMemberRole(memberId, newRole);
      if (!result.success) throw new Error(result.error || 'Failed to update role');
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const allowRoleManagement = canManage || isAdmin;

  const query = searchQuery.trim().toLowerCase();
  const filteredMembers = members.filter(m =>
    !query ||
    m.user_profile?.full_name?.toLowerCase().includes(query) ||
    m.user_profile?.email?.toLowerCase().includes(query) ||
    m.role?.toLowerCase().includes(query)
  );

  const KNOWN_ROLES = ['owner', 'ceo', 'cofounder', 'shareholder'];
  const groupedMembers = {
    owners: filteredMembers.filter(m => m.role === 'owner'),
    ceos: filteredMembers.filter(m => m.role === 'ceo'),
    cofounders: filteredMembers.filter(m => m.role === 'cofounder'),
    shareholders: filteredMembers.filter(m => m.role === 'shareholder'),
    others: filteredMembers.filter(m => !m.role || !KNOWN_ROLES.includes(m.role)),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <UsersRound size={16} className="text-accent" />
          Members ({members.length})
        </h3>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg font-bold text-xs hover:bg-accent/90 transition-all flex items-center gap-1.5"
        >
          <UserPlus size={14} /> Invite
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-500 font-medium truncate">{error}</p>
          </div>
          <button onClick={loadMembers} className="text-xs font-semibold text-red-500 hover:underline shrink-0">Retry</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, email or role..."
          aria-label="Search members"
          className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Invite Note */}
      <div className="p-4 bg-muted rounded-2xl border border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Mail size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invite access</p>
              <p className="text-sm font-semibold text-foreground">Email invite only</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
            <Shield size={10} />
            Private
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {INVITE_NOTE}
        </p>
        <button
          onClick={handleCopyInviteNote}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            copyState === 'copied'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : copyState === 'error'
                ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                : 'border-border bg-card text-foreground/70 hover:border-accent/25 hover:text-accent'
          }`}
        >
          <Copy size={14} />
          {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy note'}
        </button>
      </div>

      {/* Owners */}
      {groupedMembers.owners.length > 0 && (
        <MemberGroup icon={<Crown size={12} className="text-amber-500" />} label="Owner">
          {groupedMembers.owners.map(member => (
            <MemberCard key={member.id} member={member} isOwner onRemove={handleRemove} actionLoading={actionLoading} />
          ))}
        </MemberGroup>
      )}

      {/* CEO */}
      {groupedMembers.ceos.length > 0 && (
        <MemberGroup icon={<Crown size={12} className="text-purple-500" />} label={`CEO (${groupedMembers.ceos.length})`}>
          {groupedMembers.ceos.map(member => (
            <MemberCard key={member.id} member={member} isOwner={false} onRemove={handleRemove} actionLoading={actionLoading} canManage={allowRoleManagement} onRoleChange={handleRoleChange} />
          ))}
        </MemberGroup>
      )}

      {/* Co-Founders */}
      {groupedMembers.cofounders.length > 0 && (
        <MemberGroup icon={<Users size={12} className="text-blue-500" />} label={`Co-Founders (${groupedMembers.cofounders.length})`}>
          {groupedMembers.cofounders.map(member => (
            <MemberCard key={member.id} member={member} isOwner={false} onRemove={handleRemove} actionLoading={actionLoading} />
          ))}
        </MemberGroup>
      )}

      {/* Shareholders */}
      {groupedMembers.shareholders.length > 0 && (
        <MemberGroup icon={<Briefcase size={12} className="text-emerald-500" />} label={`Shareholders (${groupedMembers.shareholders.length})`}>
          {groupedMembers.shareholders.map(member => (
            <MemberCard key={member.id} member={member} isOwner={false} onRemove={handleRemove} actionLoading={actionLoading} />
          ))}
        </MemberGroup>
      )}

      {/* Other roles (admin, support, prospective, …) */}
      {groupedMembers.others.length > 0 && (
        <MemberGroup icon={<UsersRound size={12} className="text-muted-foreground" />} label={`Other (${groupedMembers.others.length})`}>
          {groupedMembers.others.map(member => (
            <MemberCard key={member.id} member={member} isOwner={false} onRemove={handleRemove} actionLoading={actionLoading} />
          ))}
        </MemberGroup>
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-8">
          <UsersRound size={32} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {members.length === 0 ? 'No members yet. Invite a co-founder to get started.' : 'No members match your search.'}
          </p>
        </div>
      )}

      <CofounderInviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} appId={appId} onInvite={loadMembers} />
    </div>
  );
};

const MemberGroup: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {icon} {label}
    </p>
    {children}
  </div>
);

interface MemberCardProps {
  member: Member;
  isOwner: boolean;
  onRemove: (id: string) => void;
  actionLoading: string | null;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, isOwner, onRemove, actionLoading }) => {
  const joined = member.joined_at ? new Date(member.joined_at) : null;
  const joinedLabel = joined && !isNaN(joined.getTime()) ? joined.toLocaleDateString() : null;
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg mb-2">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {member.user_profile?.full_name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground truncate">{member.user_profile?.full_name || member.user_profile?.email || 'Unknown'}</p>
          <RoleBadge role={member.role || 'prospective'} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{member.equity_pct ?? 0}% equity</span>
          {joinedLabel && (
            <>
              <span className="text-[10px] text-muted-foreground/60">•</span>
              <span className="text-[10px] text-muted-foreground/60">{joinedLabel}</span>
            </>
          )}
        </div>
      </div>
      {!isOwner && (
        <button
          onClick={() => onRemove(member.id)}
          disabled={actionLoading === member.id}
          aria-label="Remove member"
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {actionLoading === member.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
        </button>
      )}
    </div>
  );
};
