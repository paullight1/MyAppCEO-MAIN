import React, { useState } from 'react';
import { DollarSign, TrendingDown, ChevronRight } from 'lucide-react';
import { calculateDilutionScenario } from '../utils/fundingOwnership';

interface DilutionCalculatorProps {
  currentCapTable: { owner_type: string; equity_pct: number }[];
}

export const DilutionCalculator: React.FC<DilutionCalculatorProps> = ({ currentCapTable }) => {
  const [preMoneyVal, setPreMoneyVal] = useState('1000000');
  const [investAmount, setInvestAmount] = useState('100000');
  const [result, setResult] = useState<ReturnType<typeof calculateDilutionScenario> | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const calculate = () => {
    const pre = parseFloat(preMoneyVal);
    const invest = parseFloat(investAmount);
    if (!Number.isFinite(pre) || pre <= 0 || !Number.isFinite(invest) || invest <= 0) {
      setResult(null);
      setInputError('Enter a pre-money valuation and investment amount greater than zero.');
      return;
    }

    setInputError(null);
    setResult(calculateDilutionScenario(currentCapTable, pre, invest));
  };

  if (!currentCapTable.length) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-bold text-foreground mb-1.5 block">Pre-Money Valuation</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input type="number" min="0" step="1000" value={preMoneyVal} onChange={e => setPreMoneyVal(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-accent" />
          </div>
        </div>
        <div>
          <label className="text-sm font-bold text-foreground mb-1.5 block">Investment Amount</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input type="number" min="0" step="1000" value={investAmount} onChange={e => setInvestAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-accent" />
          </div>
        </div>
      </div>

      {inputError && (
        <p role="alert" className="text-sm font-medium text-red-500">{inputError}</p>
      )}

      <button onClick={calculate} className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all flex items-center justify-center gap-2">
        Calculate Dilution <ChevronRight size={16} />
      </button>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-xl text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Post-Money</p>
              <p className="font-bold text-foreground text-lg">${result.postMoney.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-accent/10 rounded-xl text-center">
              <p className="text-[10px] text-accent uppercase tracking-wider">New Investor</p>
              <p className="font-bold text-accent text-lg">{result.investorPct.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-muted rounded-xl text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Existing Dilution</p>
              <p className="font-bold text-foreground text-lg">{((1 - result.dilution) * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" /> New Ownership After Investment
            </h4>
            {currentCapTable.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{entry.owner_type.replace('_', ' ')}</span>
                <div className="flex items-center gap-3">
                  <span className="text-foreground font-medium">{entry.equity_pct.toFixed(1)}%</span>
                  <span className="text-red-500">→</span>
                  <span className="text-accent font-bold">{(entry.equity_pct * result.dilution).toFixed(1)}%</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="text-accent font-medium">New Investor</span>
              <span className="text-accent font-bold">{result.investorPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
