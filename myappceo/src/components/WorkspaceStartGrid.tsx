import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export type WorkspaceStartMode = 'connect' | 'upload' | 'build';

export interface WorkspaceStartOption {
  id: WorkspaceStartMode;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  icon: React.ElementType;
  href?: string;
}

interface WorkspaceStartGridProps {
  options: WorkspaceStartOption[];
  selectedId?: WorkspaceStartMode;
  onSelect?: (mode: WorkspaceStartMode) => void;
  className?: string;
}

export const WorkspaceStartGrid: React.FC<WorkspaceStartGridProps> = ({
  options,
  selectedId,
  onSelect,
  className,
}) => {
  return (
    <div className={`grid gap-4 ${className || ''}`}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = selectedId === option.id;
        const sharedClass = [
          'group block w-full rounded-[28px] border p-6 text-left transition-all duration-300',
          active
            ? 'border-[#0071e3]/25 bg-[#f8fbff] shadow-[0_18px_44px_rgba(15,23,42,0.08)]'
            : 'border-[#1d1d1f]/8 bg-white hover:border-[#0071e3]/18 hover:shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:bg-[#1e1e20] dark:border-white/8 dark:hover:border-white/15',
        ].join(' ');

        const content = (
          <>
            <div className="flex items-start justify-between gap-4">
              <div
                className={[
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors',
                  active
                    ? 'bg-[#0071e3] text-white'
                    : 'bg-[#0071e3]/10 text-[#0071e3] dark:bg-white/10 dark:text-white',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="mt-1 rounded-full border border-[#1d1d1f]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1d1d1f]/45 dark:border-white/8 dark:text-white/40">
                {option.eyebrow}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                {option.title}
              </h3>
              <p className="max-w-xl text-sm leading-6 text-[#1d1d1f]/58 dark:text-white/58">
                {option.description}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d1d1f]/36 dark:text-white/36">
                {option.note}
              </p>
              <ArrowRight className="h-4 w-4 text-[#0071e3] transition-transform group-hover:translate-x-0.5" />
            </div>
          </>
        );

        if (option.href) {
          return (
            <Link key={option.id} to={option.href} className={sharedClass}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect?.(option.id)}
            className={sharedClass}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
};
