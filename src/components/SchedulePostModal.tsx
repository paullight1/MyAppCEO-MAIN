import React, { useState } from 'react';
import { 
    X, 
    Instagram, 
    Video, 
    Twitter, 
    Check,
    AlertCircle,
    Loader2,
    Calendar,
    Clock,
    Repeat
} from 'lucide-react';
import { PLATFORM_POST_LIMITS, useScheduler, validateScheduledPost } from '../hooks/useScheduler';
import { SocialAccount } from '../hooks/useSocialAutomation';

interface SchedulePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    appId: string;
    connectedAccounts: SocialAccount[];
    onSuccess?: () => void;
}

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-600 to-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: Video, color: 'bg-black' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black' },
];

const RECURRENCE_OPTIONS = [
    { id: '', name: 'One-time' },
    { id: 'daily', name: 'Daily' },
    { id: 'weekly', name: 'Weekly' },
    { id: 'monthly', name: 'Monthly' },
];

export const SchedulePostModal: React.FC<SchedulePostModalProps> = ({
    isOpen,
    onClose,
    appId,
    connectedAccounts,
    onSuccess,
}) => {
    const { createScheduledPost, isLoading } = useScheduler();
    
    const [content, setContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [mediaUrl, setMediaUrl] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceRule, setRecurrenceRule] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const connectedPlatformIds = connectedAccounts.map(a => a.platform);
    const availablePlatforms = PLATFORMS.filter(p => connectedPlatformIds.includes(p.id as any));

    if (!isOpen) return null;

    const handlePlatformToggle = (platformId: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };

    const handleSchedule = async () => {
        const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);

        const validationErrors = validateScheduledPost({
            appId,
            content,
            platforms: selectedPlatforms,
            mediaUrls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
            scheduledAt: scheduledAt.toISOString(),
            timezone,
            isRecurring,
            recurrenceRule: isRecurring ? recurrenceRule : undefined,
        });
        if (validationErrors.length) {
            setError(validationErrors[0]);
            return;
        }

        setError(null);

        try {
            const result = await createScheduledPost({
                appId,
                content,
                mediaUrls: mediaUrl.trim() ? [mediaUrl.trim()] : undefined,
                platforms: selectedPlatforms,
                scheduledAt: scheduledAt.toISOString(),
                timezone,
                isRecurring,
                recurrenceRule: isRecurring ? recurrenceRule : undefined,
            });

            if (result?.data) {
                setSuccess(true);
                setTimeout(() => {
                    handleClose();
                    onSuccess?.();
                }, 1500);
            } else {
                setError('Failed to schedule post');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to schedule post');
        }
    };

    const handleClose = () => {
        setContent('');
        setSelectedPlatforms([]);
        setScheduledDate('');
        setScheduledTime('');
        setMediaUrl('');
        setIsRecurring(false);
        setRecurrenceRule('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    const minDate = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-card border border-border rounded-[40px] p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <button 
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                    <X size={20} className="text-muted-foreground" />
                </button>

                <h2 className="text-2xl font-black text-foreground mb-2">Schedule Post</h2>
                <p className="text-muted-foreground font-medium mb-8">Plan your content for later.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-500" />
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Content */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Post Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What do you want to share?"
                        className="w-full p-4 bg-muted/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent resize-none"
                        rows={4}
                    />
                    <p className={`text-xs mt-2 ${selectedPlatforms.some(platform => content.length > (PLATFORM_POST_LIMITS[platform]?.maxContentLength || Infinity)) ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {content.length} characters
                    </p>
                </div>

                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Media URL (optional)</label>
                    <input
                        type="url"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                    />
                    {mediaUrl && (
                        <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground break-all">
                            {mediaUrl}
                        </div>
                    )}
                </div>

                {/* Platform Selection */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Post to</label>
                    
                    {availablePlatforms.length === 0 ? (
                        <div className="p-6 bg-muted/30 border border-border rounded-2xl text-center">
                            <AlertCircle size={24} className="text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground font-medium">No connected accounts</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {availablePlatforms.map(platform => {
                                const isSelected = selectedPlatforms.includes(platform.id);
                                const Icon = platform.icon;
                                
                                return (
                                    <button
                                        key={platform.id}
                                        onClick={() => handlePlatformToggle(platform.id)}
                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                                            isSelected 
                                                ? 'bg-accent/10 border-2 border-accent' 
                                                : 'bg-muted/50 border-2 border-transparent hover:border-border'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl ${platform.color} flex items-center justify-center text-white`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className={`text-sm font-bold ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                                            {platform.name}
                                        </span>
                                        {isSelected && <Check size={16} className="text-accent" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Date & Time */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Schedule for</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={minDate}
                                className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent"
                            />
                        </div>
                        <div className="relative">
                            <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-2xl text-foreground focus:outline-none focus:border-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* Recurring */}
                <div className="mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-accent focus:ring-accent"
                        />
                        <Repeat size={18} className="text-muted-foreground" />
                        <span className="font-bold text-foreground">Repeat this post</span>
                    </label>
                    
                    {isRecurring && (
                        <div className="mt-4 flex gap-2">
                            {RECURRENCE_OPTIONS.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => setRecurrenceRule(option.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                        recurrenceRule === option.id
                                            ? 'bg-accent text-accent-foreground'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {option.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Schedule Button */}
                <button
                    onClick={handleSchedule}
                    disabled={isLoading || !content || selectedPlatforms.length === 0 || !scheduledDate || !scheduledTime || (isRecurring && !recurrenceRule)}
                    className="w-full py-4 bg-accent text-accent-foreground rounded-2xl font-black text-sm hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Scheduling...
                        </>
                    ) : success ? (
                        <>
                            <Check size={18} />
                            Scheduled successfully!
                        </>
                    ) : (
                        <>
                            <Calendar size={18} />
                            Schedule Post
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
