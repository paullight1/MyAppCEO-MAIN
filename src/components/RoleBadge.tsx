import React from 'react';
import { Crown, UsersRound, Briefcase, Clock } from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  owner: {
    label: 'Owner',
    icon: <Crown size={12} />,
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  cofounder: {
    label: 'Co-Founder',
    icon: <UsersRound size={12} />,
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  shareholder: {
    label: 'Shareholder',
    icon: <Briefcase size={12} />,
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  prospective: {
    label: 'Prospective',
    icon: <Clock size={12} />,
    bg: 'bg-gray-500/10 dark:bg-gray-500/15',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-500/20',
  },
};

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm' }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.prospective;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-bold border ${config.bg} ${config.text} ${config.border} ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
    }`}>
      {config.icon}
      {config.label}
    </span>
  );
};
