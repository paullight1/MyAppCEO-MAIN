import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ArrowRight } from 'lucide-react';

interface OnboardingHintProps {
  hintKey: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'success' | 'warning';
}

const getDismissedHints = (): string[] => {
  try {
    const stored = localStorage.getItem('dismissed_hints');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const dismissHint = (key: string) => {
  const dismissed = getDismissedHints();
  if (!dismissed.includes(key)) {
    dismissed.push(key);
    localStorage.setItem('dismissed_hints', JSON.stringify(dismissed));
  }
};

const variantStyles: Record<string, string> = {
  default: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
  success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
  warning: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
};

const variantIconColors: Record<string, string> = {
  default: 'text-blue-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
};

export const OnboardingHint: React.FC<OnboardingHintProps> = ({ hintKey, title, description, actionLabel, onAction, variant = 'default' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissedHints();
    if (!dismissed.includes(hintKey)) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hintKey]);

  const handleDismiss = () => {
    setVisible(false);
    dismissHint(hintKey);
  };

  if (!visible) return null;

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]} transition-all animate-in fade-in slide-in-from-top-2`}>
      <div className="flex items-start gap-3">
        <Lightbulb size={20} className={`flex-shrink-0 mt-0.5 ${variantIconColors[variant]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {actionLabel && onAction && (
            <button onClick={onAction} className="mt-2 text-xs font-bold text-accent hover:underline flex items-center gap-1">
              {actionLabel} <ArrowRight size={12} />
            </button>
          )}
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0" aria-label="Dismiss hint">
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
