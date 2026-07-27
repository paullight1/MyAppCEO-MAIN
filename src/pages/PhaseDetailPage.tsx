import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Clock,
    Play,
    AlertCircle,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDevelopment, DevelopmentPhase, DevelopmentMilestone, DevelopmentTask } from '../hooks/useDevelopment';

const PHASE_STATUS_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
    not_started: { label: 'Not Started', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', badge: 'bg-slate-100 text-slate-600' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', badge: 'bg-blue-100 text-blue-600' },
    completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', badge: 'bg-emerald-100 text-emerald-600' },
    blocked: { label: 'Blocked', color: 'bg-red-500/10 text-red-600 border-red-500/20', badge: 'bg-red-100 text-red-600' },
    skipped: { label: 'Skipped', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', badge: 'bg-amber-100 text-amber-600' },
};

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    blocked: { label: 'Blocked', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    overdue: { label: 'Overdue', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
};

export const PhaseDetailPage: React.FC = () => {
    // Route is /apps/:id/phases/:phaseId — the app param is `id`, not `appId`.
    const { id: appId, phaseId } = useParams<{ id: string; phaseId: string }>();
    const navigate = useNavigate();
    const { getPhase, startPhase, completePhase, completeMilestone, approveMilestone, rejectMilestone, createTask, updateTask } = useDevelopment();

    const [phase, setPhase] = useState<DevelopmentPhase | null>(null);
    const [milestones, setMilestones] = useState<DevelopmentMilestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedMilestone, setSelectedMilestone] = useState<DevelopmentMilestone | null>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    useEffect(() => {
        loadPhase();
    }, [phaseId]);

    const loadPhase = async () => {
        if (!phaseId) return;
        setLoading(true);
        const result = await getPhase(phaseId);
        if (result.success && result.data) {
            const phaseData = (result.data as any).data || result.data;
            setPhase(phaseData);
            setMilestones(phaseData.milestones || []);
        }
        setLoading(false);
    };

    const handleStartPhase = async () => {
        if (!phaseId) return;
        setActionLoading('start');
        await startPhase(phaseId);
        await loadPhase();
        setActionLoading(null);
    };

    const handleCompletePhase = async () => {
        if (!phaseId) return;
        setActionLoading('complete');
        await completePhase(phaseId);
        await loadPhase();
        setActionLoading(null);
    };

    const handleCompleteMilestone = async (milestoneId: string) => {
        setActionLoading(milestoneId);
        await completeMilestone(milestoneId);
        await loadPhase();
        setActionLoading(null);
    };

    const handleApproveMilestone = async (milestoneId: string) => {
        setActionLoading(milestoneId);
        await approveMilestone(milestoneId);
        await loadPhase();
        setActionLoading(null);
    };

    const handleAddTask = async () => {
        if (!selectedMilestone || !newTaskTitle.trim()) return;
        await createTask(selectedMilestone.id, { title: newTaskTitle.trim() });
        setNewTaskTitle('');
        setShowTaskModal(false);
        await loadPhase();
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                </div>
            </DashboardLayout>
        );
    }

    if (!phase) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Phase not found</p>
                </div>
            </DashboardLayout>
        );
    }

    const statusConfig = PHASE_STATUS_CONFIG[phase.status];
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const progress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate(`/apps/${appId}/dashboard`)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-semibold transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-[2rem] border border-border overflow-hidden"
                >
                    <div className="p-8 sm:p-10 border-b border-border bg-gradient-to-br from-accent/5 via-transparent to-transparent relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${statusConfig.color}`}>
                                        {statusConfig.label}
                                    </span>
                                    <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">
                                        Phase {phase.phaseNumber}
                                    </span>
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{phase.name}</h1>
                                {phase.description && (
                                    <p className="text-muted-foreground mt-3 text-lg leading-relaxed max-w-2xl">{phase.description}</p>
                                )}
                            </div>
                            <div className="text-left md:text-right bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-border/50">
                                <p className="text-4xl font-black text-foreground">{progress}%</p>
                                <p className="text-sm font-semibold text-muted-foreground mt-1 tracking-wide uppercase">
                                    {completedMilestones} / {milestones.length} Milestones
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 relative z-10">
                            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 mt-6 text-sm font-medium text-muted-foreground relative z-10">
                            {phase.startDate && (
                                <div className="flex items-center gap-2 bg-card/50 px-3 py-1.5 rounded-lg border border-border/50">
                                    <Calendar className="w-4 h-4 text-accent" />
                                    <span>Started {new Date(phase.startDate).toLocaleDateString()}</span>
                                </div>
                            )}
                            {phase.estimatedEndDate && (
                                <div className="flex items-center gap-2 bg-card/50 px-3 py-1.5 rounded-lg border border-border/50">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    <span>Est. End: {new Date(phase.estimatedEndDate).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 sm:p-10 bg-muted/10">
                        {phase.status === 'not_started' && (
                            <button
                                onClick={handleStartPhase}
                                disabled={actionLoading === 'start'}
                                className="w-full px-6 py-4 bg-accent text-white rounded-2xl hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-3 font-bold mb-8 transition-all text-lg"
                            >
                                {actionLoading === 'start' ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Play className="w-6 h-6" />
                                )}
                                Start This Phase
                            </button>
                        )}

                        {phase.status === 'in_progress' && progress === 100 && (
                            <button
                                onClick={handleCompletePhase}
                                disabled={actionLoading === 'complete'}
                                className="w-full px-6 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-3 font-bold mb-8 transition-all text-lg"
                            >
                                {actionLoading === 'complete' ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-6 h-6" />
                                )}
                                Approve & Complete Phase
                            </button>
                        )}

                        <h3 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wider">Milestones</h3>

                        <div className="space-y-4">
                            <AnimatePresence>
                                {milestones.map((milestone, index) => {
                                    const milestoneStatus = MILESTONE_STATUS_CONFIG[milestone.status];
                                    const isExpanded = selectedMilestone?.id === milestone.id;

                                    return (
                                        <motion.div
                                            key={milestone.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-card rounded-2xl overflow-hidden border border-border transition-shadow"
                                        >
                                            <div
                                                onClick={() => setSelectedMilestone(isExpanded ? null : milestone)}
                                                className="p-5 sm:p-6 cursor-pointer transition-colors"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${milestone.status === 'completed' ? 'bg-emerald-400 text-white' :
                                                            milestone.status === 'in_progress' ? 'bg-accent text-white' :
                                                                'bg-muted-foreground/10 text-muted-foreground'
                                                            }`}>
                                                            {milestone.status === 'completed' ? (
                                                                <CheckCircle2 className="w-6 h-6" />
                                                            ) : (
                                                                index + 1
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground text-lg">{milestone.title}</p>
                                                            {milestone.description && (
                                                                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{milestone.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {milestone.requiresOwnerApproval && milestone.status === 'completed' && !milestone.approvedAt && (
                                                            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                                Awaiting Approval
                                                            </span>
                                                        )}
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${milestoneStatus.color}`}>
                                                            {milestoneStatus.label}
                                                        </span>
                                                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-border/50 p-6 bg-card"
                                                    >
                                                        {milestone.requiresOwnerApproval && milestone.status === 'completed' && !milestone.approvedAt && (
                                                            <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                                                <div className="flex-1 flex items-center gap-2 text-amber-600 font-medium text-sm">
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    Review required by owner
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleApproveMilestone(milestone.id);
                                                                        }}
                                                                        disabled={actionLoading === milestone.id}
                                                                        className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 text-sm font-bold"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const reason = prompt('Rejection reason:');
                                                                            if (reason) rejectMilestone(milestone.id, reason);
                                                                        }}
                                                                        disabled={actionLoading === milestone.id}
                                                                        className="px-5 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50 text-sm font-bold"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-bold text-foreground tracking-wider uppercase">Tasks</p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowTaskModal(true);
                                                                    }}
                                                                    className="text-sm text-accent hover:text-accent/80 font-bold px-3 py-1.5 bg-accent/5 rounded-lg transition-colors"
                                                                >
                                                                    + Add Task
                                                                </button>
                                                            </div>

                                                            <div className="space-y-2.5">
                                                                {milestone.tasks?.map((task: DevelopmentTask) => (
                                                                    <div key={task.id} className="flex items-center gap-4 p-4 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl border border-border/40">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={task.status === 'done'}
                                                                            onChange={async (e) => {
                                                                                await updateTask(task.id, { status: e.target.checked ? 'done' : 'todo' });
                                                                                await loadPhase();
                                                                            }}
                                                                            className="w-5 h-5 rounded border-border text-accent focus:ring-accent cursor-pointer transition-all"
                                                                        />
                                                                        <span className={`font-medium text-base transition-colors ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                            {task.title}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {(!milestone.tasks || milestone.tasks.length === 0) && (
                                                                <div className="text-center py-6 bg-muted/20 border border-border/50 border-dashed rounded-xl">
                                                                    <p className="text-sm font-medium text-muted-foreground">No tasks defined yet</p>
                                                                </div>
                                                            )}

                                                            {milestone.status === 'in_progress' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCompleteMilestone(milestone.id);
                                                                    }}
                                                                    disabled={actionLoading === milestone.id}
                                                                    className="w-full mt-6 px-6 py-3.5 bg-card border-2 border-accent text-accent rounded-xl hover:bg-accent hover:text-white disabled:opacity-50 flex items-center justify-center gap-2 font-bold transition-all"
                                                                >
                                                                    {actionLoading === milestone.id ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-5 h-5" />
                                                                    )}
                                                                    Mark Milestone as Completed
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>

            {showTaskModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-border"
                    >
                        <h3 className="text-2xl font-black text-foreground mb-6">Add New Task</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Task Title</label>
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="What needs to be done?"
                                    className="w-full px-5 py-4 bg-muted/50 rounded-2xl border border-border focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none font-medium transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowTaskModal(false)}
                                className="flex-1 px-6 py-4 bg-muted text-foreground rounded-2xl hover:bg-border font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTask}
                                disabled={!newTaskTitle.trim()}
                                className="flex-1 px-6 py-4 bg-accent text-white rounded-2xl hover:bg-accent/90 disabled:opacity-50 font-bold transition-all"
                            >
                                Add Task
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};