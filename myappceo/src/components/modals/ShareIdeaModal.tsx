import React, { useState } from 'react';
import { X, Copy, Link, Mail, Check, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface ShareIdeaModalProps {
    isOpen: boolean;
    onClose: () => void;
    ideaId: string;
    ideaTitle: string;
}

export const ShareIdeaModal: React.FC<ShareIdeaModalProps> = ({
    isOpen,
    onClose,
    ideaId,
    ideaTitle,
}) => {
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');
    const [shareType, setShareType] = useState<'link' | 'email'>('link');

    if (!isOpen) return null;

    const shareUrl = `${window.location.origin}/ideas/${ideaId}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEmailShare = () => {
        const subject = encodeURIComponent(`Check out this app idea: ${ideaTitle}`);
        const body = encodeURIComponent(`I wanted to share this app idea with you:\n\n${ideaTitle}\n\nView it here: ${shareUrl}`);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-accent" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Share Idea</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                    Share your idea with others to get feedback before starting a crowdfunding campaign.
                </p>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setShareType('link')}
                        className={`flex-1 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                            shareType === 'link' 
                                ? 'bg-accent text-white' 
                                : 'bg-muted/50 text-foreground hover:bg-muted'
                        }`}
                    >
                        <Link className="w-4 h-4" />
                        Copy Link
                    </button>
                    <button
                        onClick={() => setShareType('email')}
                        className={`flex-1 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                            shareType === 'email' 
                                ? 'bg-accent text-white' 
                                : 'bg-muted/50 text-foreground hover:bg-muted'
                        }`}
                    >
                        <Mail className="w-4 h-4" />
                        Email
                    </button>
                </div>

                {shareType === 'link' ? (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className="px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors flex items-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Anyone with this link can view your idea details and designs.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                        />
                        <button
                            onClick={handleEmailShare}
                            disabled={!email}
                            className="w-full px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Send Email
                        </button>
                    </div>
                )}

                <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-600">
                        <strong>Note:</strong> Shared links show your PRD and designs but not cost estimates. Only investors in funded campaigns see financial details.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};