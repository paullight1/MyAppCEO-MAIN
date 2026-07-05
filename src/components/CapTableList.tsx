import React from 'react';
import { Trash2, User } from 'lucide-react';

export interface CapTableRow {
  id: string;
  owner_type: string;
  equity_pct?: number;
  shares_count?: number;
  total_value?: number;
  user_profiles?: { full_name?: string } | null;
  share_classes?: { class_name?: string } | null;
}

interface CapTableListProps {
  data: CapTableRow[];
  onRemove?: (id: string) => void;
  editable?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  founder: 'Founder',
  cofounder: 'Co-Founder',
  investor: 'Investor',
  employee: 'Employee',
  option_pool: 'Option Pool',
};

const TYPE_COLORS: Record<string, string> = {
  founder: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cofounder: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  investor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  employee: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  option_pool: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export const CapTableList: React.FC<CapTableListProps> = ({ data, onRemove, editable = false }) => {
  if (!data.length) return (
    <div className="py-12 text-center text-muted-foreground">
      <User size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">No entries in the cap table yet.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          <tr>
            <th className="px-4 py-3">Stakeholder</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Shares</th>
            <th className="px-4 py-3 text-right">Equity</th>
            <th className="px-4 py-3 text-right">Value</th>
            {editable && <th className="px-4 py-3 w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((entry) => (
            <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                    {entry.user_profiles?.full_name?.[0]?.toUpperCase() || entry.owner_type?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{entry.user_profiles?.full_name || entry.owner_type}</p>
                    {entry.share_classes && <p className="text-[10px] text-muted-foreground">{entry.share_classes.class_name}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TYPE_COLORS[entry.owner_type] || TYPE_COLORS.employee}`}>
                  {TYPE_LABELS[entry.owner_type] || entry.owner_type}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{(entry.shares_count ?? 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-bold text-sm text-foreground">{(entry.equity_pct ?? 0).toFixed(2)}%</td>
              <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{entry.total_value != null ? `$${entry.total_value.toLocaleString()}` : '—'}</td>
              {editable && onRemove && (
                <td className="px-4 py-3">
                  <button onClick={() => onRemove(entry.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove entry">
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
