import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { calculateVestingProgress } from '../utils/fundingOwnership';

interface VestingProgressProps {
  vestedPct: number;
  startDate?: string;
  cliffDate?: string;
  vestingMonths?: number;
}

export const VestingProgress: React.FC<VestingProgressProps> = ({ vestedPct, startDate, cliffDate, vestingMonths = 48 }) => {
  const calculated = startDate
    ? calculateVestingProgress({ startDate, cliffDate, vestingMonths })
    : { vestedPct, monthsRemaining: vestingMonths - Math.floor((vestedPct / 100) * vestingMonths), isCliffPassed: cliffDate ? new Date(cliffDate) < new Date() : true };
  const displayVestedPct = calculated.vestedPct;
  const monthsRemaining = calculated.monthsRemaining;
  const isCliffPassed = calculated.isCliffPassed;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{displayVestedPct.toFixed(1)}% Vested</span>
        <span className="text-xs text-muted-foreground">{monthsRemaining} months remaining</span>
      </div>
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(Math.min(displayVestedPct, 100))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${displayVestedPct.toFixed(1)}% vested`}
      >
        <div className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(displayVestedPct, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Start: {startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</span>
        <span className="flex items-center gap-1">
          {isCliffPassed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
          {isCliffPassed ? 'Cliff passed' : `Cliff: ${cliffDate ? new Date(cliffDate).toLocaleDateString() : 'N/A'}`}
        </span>
        <span>End: {vestingMonths}mo</span>
      </div>
    </div>
  );
};
