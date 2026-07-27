import React, { useState } from 'react';
import { 
    BookOpen, 
    Plus, 
    Search, 
    FileText, 
    Edit2, 
    Trash2, 
    ChevronRight,
    Layout,
    Eye,
    Save,
    Image as ImageIcon,
    Map as MapIcon,
    Type
} from 'lucide-react';

interface DocItem {
    id: string;
    title: string;
    category: string;
    lastUpdated: string;
    status: 'published' | 'draft';
}

const MOCK_DOCS: DocItem[] = [
    { id: '1', title: 'Getting Started for CEOs', category: 'Onboarding', lastUpdated: '2h ago', status: 'published' },
    { id: '2', title: 'Understanding Equity Stakes', category: 'Investment', lastUpdated: '1d ago', status: 'published' },
    { id: '3', title: 'Setting up Stripe Connect', category: 'Finance', lastUpdated: '3d ago', status: 'draft' },
];

export const DocumentationPage: React.FC = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Documentation Master</h1>
                    <p className="text-slate-500">Manage global ecosystem guides, technical docs, and user manuals.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-xl shadow-indigo-600/20"
                >
                    <Plus size={18} /> Create New Doc
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: List & Search */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="admin-card p-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                                type="text"
                                placeholder="Search documentation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="admin-card overflow-hidden">
                        <div className="p-6 border-b border-white/[0.05] flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <FileText size={18} className="text-indigo-400" />
                                Content Library
                            </h3>
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold">12 PUBLISHED</span>
                                <span className="text-[10px] bg-slate-500/10 text-slate-500 px-2 py-1 rounded-full font-bold">4 DRAFTS</span>
                            </div>
                        </div>
                        <div className="divide-y divide-white/[0.03]">
                            {MOCK_DOCS.map(doc => (
                                <div key={doc.id} className="p-6 hover:bg-white/[0.01] transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{doc.title}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{doc.category}</span>
                                                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                    <span className="text-[10px] text-slate-500">Updated {doc.lastUpdated}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-slate-500 hover:text-white transition-colors"><Edit2 size={16} /></button>
                                            <button className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                            <button className="ml-2 p-2 bg-white/[0.03] rounded-lg text-slate-400 hover:text-white transition-colors border border-white/[0.05]">
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Quick Tools & Stats */}
                <div className="space-y-6">
                    <div className="admin-card p-6 space-y-6">
                        <h3 className="font-bold">Editor Toolkit</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: <Type size={18} />, label: 'Text Editor' },
                                { icon: <ImageIcon size={18} />, label: 'Asset Library' },
                                { icon: <MapIcon size={18} />, label: 'Site Map' },
                                { icon: <Layout size={18} />, label: 'Templates' },
                            ].map((tool, i) => (
                                <button key={i} className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-indigo-600/10 hover:border-indigo-500/20 transition-all group">
                                    <div className="text-slate-500 group-hover:text-indigo-400 mb-2">{tool.icon}</div>
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-white uppercase tracking-wider">{tool.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="admin-card p-6 space-y-6 bg-gradient-to-br from-indigo-600/10 to-transparent">
                        <h3 className="font-bold">Recent Preview</h3>
                        <div className="aspect-video rounded-xl bg-slate-900 border border-white/[0.05] flex items-center justify-center relative group overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Eye className="text-white relative z-10" />
                            <span className="absolute bottom-4 left-4 text-[10px] font-bold text-slate-400">DRAFT: API_REF_V2</span>
                        </div>
                        <button className="w-full py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                            Preview Full Site
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal for adding/editing (Simplified) */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0f0f0f] border border-white/[0.1] rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-8 border-b border-white/[0.05] flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">Create Documentation</h2>
                                <p className="text-slate-500 text-sm">Drafting a new entry for the Ecosystem Guide.</p>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white"><Plus className="rotate-45" size={24} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Doc Title</label>
                                    <input type="text" placeholder="e.g. Setting up Escrow" className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                                    <select className="w-full bg-[#1a1a1a] border border-white/[0.05] rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-indigo-500">
                                        <option>Onboarding</option>
                                        <option>Investment</option>
                                        <option>Finance</option>
                                        <option>Technical</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Content (Markdown Supported)</label>
                                <textarea 
                                    rows={10}
                                    placeholder="# Introduction\nStart typing your guide here..."
                                    className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl py-4 px-4 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                                />
                            </div>

                            <div className="p-6 bg-indigo-600/5 rounded-2xl border border-indigo-600/10 flex items-center gap-4">
                                <ImageIcon className="text-indigo-400" />
                                <div className="flex-1">
                                    <p className="text-xs font-bold">Add Visuals</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Drag and drop images or system maps to embed in the doc.</p>
                                </div>
                                <button className="px-4 py-2 bg-white/[0.05] rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/[0.1]">Upload</button>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-4">
                            <button onClick={() => setIsAdding(false)} className="px-8 py-3 text-sm font-bold text-slate-500 hover:text-white">Cancel</button>
                            <button className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20">
                                <Save size={18} /> Save & Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
