import React, { useState } from 'react';
import { X, Loader2, FileText, Eye, Users, Globe } from 'lucide-react';
import { useDevelopment } from '../../hooks/useDevelopment';

interface PostUpdateModalProps {
    appId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    phases?: { id: string; name: string }[];
    milestones?: { id: string; title: string }[];
}

export const PostUpdateModal: React.FC<PostUpdateModalProps> = ({
    appId,
    isOpen,
    onClose,
    onSuccess,
    phases = [],
    milestones = [],
}) => {
    const { createProgressUpdate, isLoading } = useDevelopment();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        phaseId: '',
        milestoneId: '',
        visibility: 'investors' as 'owner_only' | 'investors' | 'public',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        setLoading(true);
        setError(null);

        const result = await createProgressUpdate(appId, {
            title: formData.title,
            content: formData.content,
            phaseId: formData.phaseId || undefined,
            milestoneId: formData.milestoneId || undefined,
            visibility: formData.visibility,
        });

        if (result.success) {
            onSuccess();
            onClose();
            setFormData({ title: '', content: '', phaseId: '', milestoneId: '', visibility: 'investors' });
        } else {
            setError('Failed to post update. Please try again.');
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Post Update</h3>
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
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Weekly Progress Update"
                            required
                            className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Content *
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Share your progress with investors..."
                            rows={5}
                            required
                            className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {phases.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Related Phase
                                </label>
                                <select
                                    value={formData.phaseId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phaseId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                                >
                                    <option value="">None</option>
                                    {phases.map(phase => (
                                        <option key={phase.id} value={phase.id}>{phase.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {milestones.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Related Milestone
                                </label>
                                <select
                                    value={formData.milestoneId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                                >
                                    <option value="">None</option>
                                    {milestones.map(milestone => (
                                        <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Visibility
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'owner_only', label: 'Only Me', icon: Eye },
                                { id: 'investors', label: 'Investors', icon: Users },
                                { id: 'public', label: 'Public', icon: Globe },
                            ].map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, visibility: option.id as any }))}
                                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                                        formData.visibility === option.id
                                            ? 'border-accent bg-accent/5'
                                            : 'border-border hover:border-accent/30'
                                    }`}
                                >
                                    <option.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-xs font-medium text-foreground">{option.label}</p>
                                </button>
                            ))}
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
                            disabled={loading || !formData.title.trim() || !formData.content.trim()}
                            className="flex-1 px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                'Post Update'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};