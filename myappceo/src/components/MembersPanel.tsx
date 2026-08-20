import React, { useState } from 'react';
import {
  UsersRound,
  Mail,
  Copy,
  Loader2,
  Search,
  UserPlus,
  Shield,
  X,
  Crown,
  Users,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { RoleBadge } from './RoleBadge';
import { useAppRole } from '../hooks/useAppRole';
import { CofounderInviteModal } from './modals/CofounderInviteModal';

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

const INVITE_NOTE =
  'Email invite only. No public join URL is available yet. Use the Invite button to create a private co-founder request for the intended email address.';

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
  const { getMembers, removeMember } = useAppRole();
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
    if (!window.confirm('Remove this member from the app?')) return;
    setActionLoading(memberId);
    setError('');
    try {
      const result = await removeMember(memberId);
      if (!result.success) throw new Error(result.error || 'Failed to remove member');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredMembers = members.filter(
    (member) =>
      !query ||
      member.user_profile?.full_name?.toLowerCase().includes(query) ||
      member.user_profile?.email?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query),
  );

  const knownRoles = ['owner', 'ceo', 'cofounder', 'shareholder'];
  const groupedMembers = {
    owners: filteredMembers.filter((member) => member.role === 'owner'),
    ceos: filteredMembers.filter((member) => member.role === 'ceo'),
    cofounders: filteredMembers.filter((member) => member.role === 'cofounder'),
    shareholders: filteredMembers.filter((member) => member.role === 'shareholder'),
    others: filteredMembers.filter(
      (member) => !member.role || !knownRoles.includes(member.role),
    ),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <UsersRound size={16} className="text-accent" />
          Members ({members.length})
        </h3>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-all hover:bg-accent/90"
        >
          <UserPlus size={14} /> Invite
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <p className="truncate text-sm font-medium text-red-500">{error}</p>
          </div>
          <button
            onClick={loadMembers}
            className="shrink-0 text-xs font-semibold text-red-500 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, email or role..."
          aria-label="Search members"
          className="w-full rounded-lg border border-border bg-muted py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="rounded-2xl border border-border bg-muted p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Mail size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Invite access
              </p>
              <p className="text-sm font-semibold text-foreground">Email invite only</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
            <Shield size={10} /> Private
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{INVITE_NOTE}</p>
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
          {copyState === 'copied'
            ? 'Copied'
            : copyState === 'error'
              ? 'Copy failed'
              : 'Copy note'}
        </button>
      </div>

      {groupedMembers.owners.length > 0 && (
        <MemberGroup
          icon={<Crown size={12} className="text-amber-500" />}
          label="Owner"
        >
          {groupedMembers.owners.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner
              onRemove={handleRemove}
              actionLoading={actionLoading}
            />
          ))}
        </MemberGroup>
      )}

      {groupedMembers.ceos.length > 0 && (
        <MemberGroup
          icon={<Crown size={12} className="text-purple-500" />}
          label={`CEO (${groupedMembers.ceos.length})`}
        >
          {groupedMembers.ceos.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={false}
              onRemove={handleRemove}
              actionLoading={actionLoading}
            />
          ))}
        </MemberGroup>
      )}

      {groupedMembers.cofounders.length > 0 && (
        <MemberGroup
          icon={<Users size={12} className="text-blue-500" />}
          label={`Co-Founders (${groupedMembers.cofounders.length})`}
        >
          {groupedMembers.cofounders.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={false}
              onRemove={handleRemove}
              actionLoading={actionLoading}
            />
          ))}
        </MemberGroup>
      )}

      {groupedMembers.shareholders.length > 0 && (
        <MemberGroup
          icon={<Briefcase size={12} className="text-emerald-500" />}
          label={`Shareholders (${groupedMembers.shareholders.length})`}
        >
          {groupedMembers.shareholders.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={false}
              onRemove={handleRemove}
              actionLoading={actionLoading}
            />
          ))}
        </MemberGroup>
      )}

      {groupedMembers.others.length > 0 && (
        <MemberGroup
          icon={<UsersRound size={12} className="text-muted-foreground" />}
          label={`Other (${groupedMembers.others.length})`}
        >
          {groupedMembers.others.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={false}
              onRemove={handleRemove}
              actionLoading={actionLoading}
            />
          ))}
        </MemberGroup>
      )}

      {filteredMembers.length === 0 && (
        <div className="py-8 text-center">
          <UsersRound size={32} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {members.length === 0
              ? 'No members yet. Invite a co-founder to get started.'
              : 'No members match your search.'}
          </p>
        </div>
      )}

      <CofounderInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        appId={appId}
        onInvite={loadMembers}
      />
    </div>
  );
};

const MemberGroup: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div>
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
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

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  isOwner,
  onRemove,
  actionLoading,
}) => {
  const joined = member.joined_at ? new Date(member.joined_at) : null;
  const joinedLabel =
    joined && !Number.isNaN(joined.getTime()) ? joined.toLocaleDateString() : null;

  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent/80 text-sm font-bold text-white">
        {member.user_profile?.full_name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">
            {member.user_profile?.full_name ||
              member.user_profile?.email ||
              'Unknown'}
          </p>
          <RoleBadge role={member.role || 'prospective'} />
        </div>
        <div className="mt-0.5 flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            {member.equity_pct ?? 0}% equity
          </span>
          {joinedLabel && (
            <>
              <span className="text-[10px] text-muted-foreground/60">•</span>
              <span className="text-[10px] text-muted-foreground/60">
                {joinedLabel}
              </span>
            </>
          )}
        </div>
      </div>
      {!isOwner && (
        <button
          onClick={() => onRemove(member.id)}
          disabled={actionLoading === member.id}
          aria-label="Remove member"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
        >
          {actionLoading === member.id ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
        </button>
      )}
    </div>
  );
};
