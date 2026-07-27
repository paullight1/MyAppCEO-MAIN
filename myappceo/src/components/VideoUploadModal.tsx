import React, { useState, useRef, useEffect } from 'react';
import { 
    X, 
    Upload, 
    Instagram, 
    Video, 
    Twitter, 
    Check,
    AlertCircle,
    Loader2,
    Play,
    FileVideo
} from 'lucide-react';
import { useVideoPost, VideoPost, VIDEO_UPLOAD_LIMITS, validateVideoUpload } from '../hooks/useVideoPost';
import { SocialAccount } from '../hooks/useSocialAutomation';
import { apiUpload } from '../lib/apiClient';

interface VideoUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    appId: string;
    connectedAccounts: SocialAccount[];
    onSuccess?: (video: VideoPost) => void;
}

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-600 to-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: Video, color: 'bg-black' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black' },
];

const ACCEPTED_TYPES = VIDEO_UPLOAD_LIMITS.acceptedTypes;

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
    isOpen,
    onClose,
    appId,
    connectedAccounts,
    onSuccess,
}) => {
    const { uploadVideo, isLoading } = useVideoPost();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [file, setFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [duration, setDuration] = useState<number | undefined>();
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const connectedPlatformIds = connectedAccounts.map(a => a.platform);
    const availablePlatforms = PLATFORMS.filter(p => connectedPlatformIds.includes(p.id as any));

    useEffect(() => {
        return () => {
            if (videoPreview) {
                URL.revokeObjectURL(videoPreview);
            }
        };
    }, [videoPreview]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
            setError('Please upload a valid video file (MP4, MOV, AVI, WEBM)');
            return;
        }

        if (selectedFile.size > VIDEO_UPLOAD_LIMITS.maxSizeBytes) {
            setError('Video file must be less than 500MB');
            return;
        }

        setFile(selectedFile);
        setError(null);
        
        const url = URL.createObjectURL(selectedFile);
        setVideoPreview(url);
    };

    const handlePlatformToggle = (platformId: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };

    const handleUpload = async () => {
        if (!file || selectedPlatforms.length === 0) return;

        const validationErrors = validateVideoUpload({
            appId,
            fileUrl: 'pending-upload',
            caption,
            platforms: selectedPlatforms,
            duration,
        });
        if (validationErrors.length) {
            setError(validationErrors[0]);
            return;
        }

        setUploadProgress('uploading');
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadResult = await apiUpload<{ data?: { url: string }; url?: string }>('/media/upload', formData);
            const fileUrl = uploadResult?.data?.url || uploadResult?.url;

            if (!fileUrl) {
                throw new Error('Failed to upload video file');
            }

            const result = await uploadVideo({
                appId,
                fileUrl,
                caption,
                platforms: selectedPlatforms,
                duration,
            });

            if (result?.data) {
                setUploadProgress('success');
                onSuccess?.(result.data);
                setTimeout(() => {
                    handleClose();
                }, 1500);
            } else {
                setUploadProgress('error');
                setError('Failed to post video');
            }
        } catch (err: unknown) {
            setUploadProgress('error');
            setError(err instanceof Error ? err.message : 'Failed to upload video');
        }
    };

    const handleClose = () => {
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview);
        }
        setFile(null);
        setVideoPreview(null);
        setCaption('');
        setDuration(undefined);
        setSelectedPlatforms([]);
        setUploadProgress('idle');
        setError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-card border border-border rounded-[40px] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <button 
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                    <X size={20} className="text-muted-foreground" />
                </button>

                <h2 className="text-2xl font-black text-foreground mb-2">Upload Video</h2>
                <p className="text-muted-foreground font-medium mb-8">Auto-post to your connected social accounts.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-500" />
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* File Upload */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Video File</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={ACCEPTED_TYPES.join(',')}
                        className="hidden"
                    />
                    
                    {!file ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-12 border-2 border-dashed border-border rounded-[32px] flex flex-col items-center gap-4 hover:border-accent/50 hover:bg-muted/30 transition-all"
                        >
                            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                                <Upload size={32} className="text-accent" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-foreground">Click to upload video</p>
                                <p className="text-sm text-muted-foreground">MP4, MOV, AVI, or WEBM (max 500MB and 10 minutes)</p>
                            </div>
                        </button>
                    ) : (
                        <div className="relative rounded-[32px] overflow-hidden border border-border">
                            {videoPreview && (
                                <video 
                                    src={videoPreview} 
                                    className="w-full aspect-video object-contain bg-black"
                                    controls
                                    onLoadedMetadata={(event) => {
                                        const nextDuration = event.currentTarget.duration;
                                        setDuration(nextDuration);
                                        if (nextDuration > VIDEO_UPLOAD_LIMITS.maxDurationSeconds) {
                                            setError('Video duration must be 10 minutes or less');
                                        }
                                    }}
                                />
                            )}
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setVideoPreview(null);
                                }}
                                className="absolute top-4 right-4 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                            >
                                <X size={16} className="text-white" />
                            </button>
                            <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/60 rounded-full flex items-center gap-2">
                                <FileVideo size={16} className="text-white" />
                                <span className="text-white text-sm font-medium">{file.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Caption */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-foreground mb-3 block">Caption</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption for your video..."
                        className="w-full p-4 bg-muted/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent resize-none"
                        rows={3}
                    />
                    <p className={`text-xs mt-2 ${caption.length > VIDEO_UPLOAD_LIMITS.maxCaptionLength ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {caption.length}/{VIDEO_UPLOAD_LIMITS.maxCaptionLength} characters
                    </p>
                </div>

                {/* Platform Selection */}
                <div className="mb-8">
                    <label className="text-sm font-bold text-foreground mb-3 block">Post to</label>
                    
                    {availablePlatforms.length === 0 ? (
                        <div className="p-6 bg-muted/30 border border-border rounded-2xl text-center">
                            <AlertCircle size={24} className="text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground font-medium">No connected accounts</p>
                            <p className="text-sm text-muted-foreground">Connect social accounts to post videos</p>
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

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || !caption.trim() || selectedPlatforms.length === 0 || isLoading || uploadProgress === 'uploading' || caption.length > VIDEO_UPLOAD_LIMITS.maxCaptionLength}
                    className="w-full py-4 bg-accent text-accent-foreground rounded-2xl font-black text-sm hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {uploadProgress === 'uploading' ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Uploading and posting...
                        </>
                    ) : uploadProgress === 'success' ? (
                        <>
                            <Check size={18} />
                            Uploaded successfully!
                        </>
                    ) : (
                        <>
                            <Upload size={18} />
                            Upload & Post
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
