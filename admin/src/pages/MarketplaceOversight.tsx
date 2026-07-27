import React, { useState } from 'react';
import { 
    LayoutGrid, 
    ArrowUpRight, 
    MessageSquare, 
    DollarSign, 
    Zap, 
    CheckCircle2, 
    XCircle, 
    AlertCircle,
    Clock,
    Filter,
    ExternalLink,
    ShieldCheck,
    Key,
    Activity,
    ShieldAlert,
    Github,
    ChevronRight
} from 'lucide-react';

const MOCK_LISTING_SUBMISSIONS = [
    { 
        id: 'sub-1', 
        name: 'HealthSync AI', 
        category: 'AI Tool',
        trust_score: 85,
        stage: 'awaiting_technical',
        submitted_at: '2h ago',
        data_room: {
            repo: 'github.com/healthsync/core',
            revenue: '$12.4K/mo',
            cac: '$12.50',
            hosting: 'AWS'
        }
    },
    { 
        id: 'sub-2', 
        name: 'VideoMate Pro', 
        category: 'SaaS',
        trust_score: 42,
        stage: 'awaiting_financial',
        submitted_at: '5h ago',
        data_room: {
            repo: 'Not Connected',
            revenue: '$3.2K/mo',
            cac: '$45.00',
            hosting: 'Vercel'
        }
    }
];

export const MarketplaceOversight: React.FC = () => {
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [filter, setFilter] = useState('all');

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
                        <ShieldCheck size={14} />
                        Institutional Control
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Marketplace Oversight</h1>
                    <p className="text-slate-500 text-lg">Review high-fidelity asset submissions and manage the handover pipeline.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Submission Queue */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="admin-card overflow-hidden">
                        <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
                            <h3 className="font-bold text-xl flex items-center gap-3">
                                <Activity size={22} className="text-indigo-400" />
                                Asset Approval Queue
                            </h3>
                        </div>
                        <div className="divide-y divide-white/[0.03]">
                            {MOCK_LISTING_SUBMISSIONS.map(sub => (
                                <div 
                                    key={sub.id} 
                                    onClick={() => setSelectedSubmission(sub)}
                                    className={`p-8 hover:bg-white/[0.02] transition-all cursor-pointer group ${selectedSubmission?.id === sub.id ? 'bg-indigo-600/5 border-l-4 border-indigo-500' : ''}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex flex-col items-center justify-center">
                                                <span className="text-xl font-black text-white">{sub.trust_score}%</span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase">Trust</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg text-white">{sub.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sub.category}</span>
                                                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                        sub.stage.includes('technical') ? 'text-amber-500' : 'text-indigo-400'
                                                    }`}>{sub.stage.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{sub.submitted_at}</p>
                                            <ChevronRight size={18} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Data Room Details */}
                <div className="space-y-6">
                    {selectedSubmission ? (
                        <div className="admin-card overflow-hidden animate-in slide-in-from-right-4 duration-500">
                            <div className="p-8 border-b border-white/[0.05] bg-indigo-600/10">
                                <h3 className="font-bold text-lg text-white">Institutional Data Room</h3>
                                <p className="text-xs text-indigo-300 mt-1">Submission ID: {selectedSubmission.id}</p>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Technical Access</p>
                                        <div className="flex items-center gap-2 text-white">
                                            <Github size={14} className={selectedSubmission.data_room.repo !== 'Not Connected' ? 'text-emerald-500' : 'text-rose-500'} />
                                            <span className="text-xs font-bold truncate">{selectedSubmission.data_room.repo}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Revenue Oracle</p>
                                        <div className="flex items-center gap-2 text-white">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span className="text-xs font-bold">{selectedSubmission.data_room.revenue}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Handover Readiness</h5>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg text-[10px] font-bold text-white uppercase">DB_SCHEMA_READY</span>
                                        <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg text-[10px] font-bold text-white uppercase">SOP_UPLOADED</span>
                                        <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg text-[10px] font-bold text-white uppercase">IP_WARRANTY_SIGNED</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/[0.05] space-y-4">
                                    <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all">
                                        Approve & Move to Live
                                    </button>
                                    <button className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.05] text-white border border-white/[0.05] rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                                        Request Additional Audit
                                    </button>
                                    <button className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                                        Reject Submission
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="admin-card p-12 text-center flex flex-col items-center justify-center space-y-4 text-slate-500 border-dashed">
                            <ShieldCheck size={40} className="opacity-20" />
                            <p className="text-sm font-medium">Select a submission from the queue to open the Data Room.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
