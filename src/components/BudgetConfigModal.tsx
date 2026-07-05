import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Zap, Loader2, DollarSign } from 'lucide-react';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { CreateBudgetPayload, PromotionBudget } from '../hooks/usePromotionBudget';

interface BudgetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateBudgetPayload) => Promise<void> | void;
    isLoading?: boolean;
    /** Existing budget to prefill the form when editing. */
    initial?: PromotionBudget | null;
}

const PRESET_LIMITS = [500, 1000, 2500, 5000, 10000];

export const BudgetConfigModal: React.FC<BudgetConfigModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
    initial,
}) => {
    const [monthlyLimit, setMonthlyLimit] = useState<number>(initial?.monthlyLimit ?? 1000);
    const [walletSource, setWalletSource] = useState<'main' | 'dedicated'>(initial?.walletSource ?? 'main');
    const [autoFund, setAutoFund] = useState<boolean>(initial?.autoFund ?? false);

    // Re-sync form when a different budget is passed in.
    useEffect(() => {
        if (isOpen) {
            setMonthlyLimit(initial?.monthlyLimit ?? 1000);
            setWalletSource(initial?.walletSource ?? 'main');
            setAutoFund(initial?.autoFund ?? false);
        }
    }, [isOpen, initial]);

    // Escape to close.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isLoading && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, isLoading, onClose]);

    const handleSubmit = async () => {
        if (monthlyLimit <= 0) return;
        await onSubmit({ monthlyLimit, walletSource, autoFund });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Configure promotion budget"
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="relative bg-card border border-border rounded-3xl max-w-lg w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center">
                                    <AnimatedIcon icon={Wallet} size={20} className="text-white" animation="float" trigger="loop" />
                                </span>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {initial ? 'Update Promotion Budget' : 'Set Promotion Budget'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Control how much auto-promotion can spend</p>
                                </div>
                            </div>
                            <button
                                onClick={() => !isLoading && onClose()}
                                className="p-2 rounded-xl hover:bg-muted transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} className="text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Monthly limit */}
                            <div>
                                <label className="text-sm font-bold text-foreground mb-2 block">Monthly Limit</label>
                                <div className="relative">
                                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="number"
                                        min={0}
                                        step={50}
                                        value={monthlyLimit}
                                        onChange={(e) => setMonthlyLimit(Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-9 pr-4 py-3 bg-muted border-0 rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {PRESET_LIMITS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setMonthlyLimit(preset)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                monthlyLimit === preset
                                                    ? 'bg-[#0071e3] text-white'
                                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            ${preset.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Wallet source */}
                            <div>
                                <label className="text-sm font-bold text-foreground mb-2 block">Funding Source</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { id: 'main' as const, title: 'Main Wallet', desc: 'Use your primary balance' },
                                        { id: 'dedicated' as const, title: 'Dedicated', desc: 'Separate promotion balance' },
                                    ]).map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setWalletSource(opt.id)}
                                            className={`text-left p-4 rounded-2xl border transition-all ${
                                                walletSource === opt.id
                                                    ? 'border-[#0071e3] bg-[#0071e3]/5 ring-1 ring-[#0071e3]/30'
                                                    : 'border-border bg-muted/40 hover:border-[#0071e3]/30'
                                            }`}
                                        >
                                            <p className="text-sm font-bold text-foreground">{opt.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Auto-fund toggle */}
                            <button
                                type="button"
                                onClick={() => setAutoFund((v) => !v)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border hover:border-[#0071e3]/30 transition-all"
                                aria-pressed={autoFund}
                            >
                                <span className="flex items-center gap-3">
                                    <Zap size={18} className={autoFund ? 'text-[#0071e3]' : 'text-muted-foreground'} />
                                    <span className="text-left">
                                        <span className="block text-sm font-bold text-foreground">Auto-refill</span>
                                        <span className="block text-xs text-muted-foreground">Top up automatically when the limit is reached</span>
                                    </span>
                                </span>
                                <span className={`relative w-11 h-6 rounded-full transition-colors ${autoFund ? 'bg-[#0071e3]' : 'bg-border'}`}>
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoFund ? 'translate-x-5' : ''}`} />
                                </span>
                            </button>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => !isLoading && onClose()}
                                    disabled={isLoading}
                                    className="flex-1 py-3 rounded-xl border border-border font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || monthlyLimit <= 0}
                                    className="flex-1 py-3 rounded-xl bg-[#0071e3] text-white font-bold hover:bg-[#0077ed] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : initial ? 'Save Budget' : 'Set Budget'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
