import React, { useEffect, useState } from 'react';
import { X, Loader2, UserPlus, Mail, Shield, Code, Palette, CheckCircle2, Wrench } from 'lucide-react';
import { useDevelopment } from '../../hooks/useDevelopment';

const ROLES = [
    { id: 'co_founder', label: 'Co-Founder', icon: Shield, description: 'Full access + equity stake' },
    { id: 'lead_developer', label: 'Lead Developer', icon: Code, description: 'Full access to development features' },
    { id: 'developer', label: 'Developer', icon: Code, description: 'Can update progress and complete tasks' },
    { id: 'designer', label: 'Designer', icon: Palette, description: 'Can update design-related progress' },
    { id: 'project_manager', label: 'Project Manager', icon: Shield, description: 'Can manage tasks and post updates' },
    { id: 'qa_engineer', label: 'QA Engineer', icon: CheckCircle2, description: 'Can update testing progress' },
    { id: 'devops', label: 'DevOps', icon: Wrench, description: 'Can manage deployments' },
];

interface AddTeamMemberModalProps {
    appId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
    appId,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { addTeamMember, isLoading } = useDevelopment();

    const [formData, setFormData] = useState({
        email: '',
        role: 'developer',
        equityPct: '',
        canUpdateProgress: true,
        canPostUpdates: false,
        canManageTasks: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, loading, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.trim()) return;

        let equityPct: number | undefined;
        if (formData.role === 'co_founder' && formData.equityPct.trim()) {
            const parsed = parseFloat(formData.equityPct);
            if (isNaN(parsed) || parsed <= 0 || parsed > 50) {
                setError('Co-founder equity must be between 0 and 50%.');
                return;
            }
            equityPct = parsed;
        }

        setLoading(true);
        setError(null);

        const result = await addTeamMember(appId, {
            userId: formData.email,
            role: formData.role,
            equityPct,
            canUpdateProgress: formData.canUpdateProgress,
            canPostUpdates: formData.canPostUpdates,
            canManageTasks: formData.canManageTasks,
        });

        if (result.success) {
            onSuccess();
            onClose();
            setFormData({ email: '', role: 'developer', equityPct: '', canUpdateProgress: true, canPostUpdates: false, canManageTasks: false });
        } else {
            setError('Failed to add team member. User may not exist or already be on the team.');
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={() => !loading && onClose()} />
            <div role="dialog" aria-modal="true" aria-labelledby="add-member-title" className="relative bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-accent" />
                        </div>
                        <h3 id="add-member-title" className="text-lg font-bold text-foreground">Add Team Member</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="add-member-email" className="block text-sm font-semibold text-foreground mb-2">
                            User Email *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                id="add-member-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="teammate@example.com"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            The user must have an account on the platform
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Role
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {ROLES.map(role => {
                                const Icon = role.icon;
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, role: role.id as any }))}
                                        className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                                            formData.role === role.id
                                                ? 'border-accent bg-accent/10 text-accent'
                                                : 'border-border text-foreground hover:border-accent/30'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <div>
                                            <p className="font-medium">{role.label}</p>
                                            <p className="text-xs text-muted-foreground">{role.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {formData.role === 'co_founder' && (
                        <div>
                            <label htmlFor="add-member-equity" className="block text-sm font-semibold text-foreground mb-2">
                                Equity Percentage (%)
                            </label>
                            <div className="relative">
                                <input
                                    id="add-member-equity"
                                    type="number"
                                    value={formData.equityPct}
                                    onChange={(e) => setFormData(prev => ({ ...prev, equityPct: e.target.value }))}
                                    placeholder="e.g. 25"
                                    min="0.1"
                                    max="50"
                                    step="0.1"
                                    className="w-full pl-4 pr-10 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Equity stake for this co-founder (standard: 4yr vesting, 1yr cliff)
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-3">
                            Permissions
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50">
                                <input
                                    type="checkbox"
                                    checked={formData.canUpdateProgress}
                                    onChange={(e) => setFormData(prev => ({ ...prev, canUpdateProgress: e.target.checked }))}
                                    className="w-4 h-4 rounded border-border"
                                />
                                <div>
                                    <p className="font-medium text-foreground text-sm">Update Progress</p>
                                    <p className="text-xs text-muted-foreground">Can update phase and milestone progress</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50">
                                <input
                                    type="checkbox"
                                    checked={formData.canPostUpdates}
                                    onChange={(e) => setFormData(prev => ({ ...prev, canPostUpdates: e.target.checked }))}
                                    className="w-4 h-4 rounded border-border"
                                />
                                <div>
                                    <p className="font-medium text-foreground text-sm">Post Updates</p>
                                    <p className="text-xs text-muted-foreground">Can post progress updates for investors</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50">
                                <input
                                    type="checkbox"
                                    checked={formData.canManageTasks}
                                    onChange={(e) => setFormData(prev => ({ ...prev, canManageTasks: e.target.checked }))}
                                    className="w-4 h-4 rounded border-border"
                                />
                                <div>
                                    <p className="font-medium text-foreground text-sm">Manage Tasks</p>
                                    <p className="text-xs text-muted-foreground">Can create, edit, and assign tasks</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.email.trim()}
                            className="flex-1 px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Add Member
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};