import React from 'react';
import { Crown, Users, FileText, DollarSign, Settings, BarChart3, Shield, Activity } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  analytics: <BarChart3 size={20} />,
  members: <Users size={20} />,
  documents: <FileText size={20} />,
  shares: <DollarSign size={20} />,
  settings: <Settings size={20} />,
  legal: <Shield size={20} />,
  activity: <Activity size={20} />,
  captable: <Crown size={20} />,
};

interface QuickActionCardProps {
  icon: string;
  label: string;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  label,
  count,
  onClick,
  disabled = false,
  hidden = false,
}) => {
  if (hidden) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-all min-w-[72px] sm:min-w-[88px] ${
        disabled
          ? 'bg-muted border-border opacity-40 cursor-not-allowed'
          : 'bg-card border-border hover:border-primary/30 active:scale-[0.96]'
      }`}
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
        disabled
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
      }`}>
        {ICON_MAP[icon] || ICON_MAP.analytics}
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-foreground text-center leading-tight">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

interface QuickActionRowProps {
  cards: QuickActionCardProps[];
}

export const QuickActionRow: React.FC<QuickActionRowProps> = ({ cards }) => {
  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" style={{ scrollbarWidth: 'none' }}>
      {cards.map((card, i) => (
        <QuickActionCard key={i} {...card} />
      ))}
    </div>
  );
};
