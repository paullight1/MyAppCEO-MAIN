import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Rocket,
    Loader2,
    AlertCircle,
    ExternalLink,
    CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDevelopment } from '../hooks/useDevelopment';

const PLATFORMS = [
    { id: 'ios', label: 'iOS App Store', icon: '🍎', placeholder: 'https://apps.apple.com/app/...' },
    { id: 'android', label: 'Google Play Store', icon: '🤖', placeholder: 'https://play.google.com/store/apps/...' },
    { id: 'web', label: 'Web (Live URL)', icon: '🌐', placeholder: 'https://yourapp.com' },
    { id: 'desktop', label: 'Desktop', icon: '💻', placeholder: 'https://download.yourapp.com/...' },
];

export const CreateDeploymentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { createDeployment, isLoading } = useDevelopment();

    const [formData, setFormData] = useState({
        platform: 'ios',
        version: '',
        buildNumber: '',
        storeUrl: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setLoading(true);
        setError(null);
        const buildNumber = Number(formData.buildNumber);
        if (!Number.isInteger(buildNumber) || buildNumber < 1) {
            setError('Build number must be a positive whole number.');
            setLoading(false);
            return;
        }

        const result = await createDeployment(id, {
            platform: formData.platform,
            version: formData.version.trim(),
            buildNumber,
            storeUrl: formData.storeUrl || undefined,
            notes: formData.notes || undefined,
        });

        if (result.success) {
            navigate(`/apps/${id}/dashboard`);
        } else {
            setError('Failed to create deployment. Please try again.');
        }
        setLoading(false);
    };

    const selectedPlatform = PLATFORMS.find(p => p.id === formData.platform);

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-semibold transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Development Dashboard
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-[2rem] border border-border p-8 relative overflow-hidden"
                >
                    {/* Decorative Effects */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-accent/20"
                        >
                            <Rocket className="w-10 h-10 text-accent" />
                        </motion.div>
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Create Deployment</h1>
                        <p className="text-muted-foreground mt-3 text-lg">Log a new release or update for your application</p>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-8"
                            >
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
                                Target Platform
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {PLATFORMS.map((platform) => {
                                    const isSelected = formData.platform === platform.id;
                                    return (
                                        <button
                                            key={platform.id}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, platform: platform.id as any }))}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all ${isSelected
                                                    ? 'border-accent bg-accent/5 ring-4 ring-accent/10'
                                                    : 'border-border bg-muted/20 hover:border-accent/40 hover:bg-muted/40'
                                                } flex items-center justify-between group`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{platform.icon}</span>
                                                <p className={`font-bold ${isSelected ? 'text-accent' : 'text-foreground'}`}>{platform.label}</p>
                                            </div>
                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/20 p-5 sm:p-6 rounded-2xl border border-border/50">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">
                                    Version <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.version}
                                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                                    placeholder="e.g. 1.0.0"
                                    required
                                    className="w-full px-5 py-3.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">
                                    Build Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.buildNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, buildNumber: e.target.value }))}
                                    placeholder="e.g. 42"
                                    required
                                    min="1"
                                    className="w-full px-5 py-3.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">
                                Store / Download URL
                            </label>
                            <div className="relative group">
                                <ExternalLink className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                                <input
                                    type="url"
                                    value={formData.storeUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, storeUrl: e.target.value }))}
                                    placeholder={selectedPlatform?.placeholder}
                                    className="w-full pl-12 pr-5 py-3.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium transition-all"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">Optional: Where can users download this build?</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">
                                Release Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Describe what's new in this release..."
                                rows={4}
                                className="w-full px-5 py-4 bg-card border border-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium transition-all resize-none"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/50">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="w-full sm:w-auto px-8 py-3.5 bg-muted text-foreground rounded-xl hover:bg-muted/80 font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.version || !formData.buildNumber}
                                className="w-full sm:flex-1 px-8 py-3.5 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2 font-bold transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Record Deployment
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};
