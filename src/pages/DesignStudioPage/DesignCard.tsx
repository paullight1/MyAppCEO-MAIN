import React, { useState } from 'react';
import {
    Sparkles,
    RefreshCw,
    CheckCircle2,
    Eye,
    Maximize2,
    Loader2,
    FileText,
    Image,
    ArrowRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

interface PRDNode {
    id: string;
    label: string;
    type: 'root' | 'page' | 'feature' | 'component';
    description?: string;
    children?: PRDNode[];
    designGenerated?: boolean;
    designUrl?: string;
    designLoading?: boolean;
}

interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
}

interface DesignCardProps {
    node: PRDNode;
    viewMode: 'prd' | 'design' | 'split';
    brandColors: BrandColors;
    onGenerate: () => void;
    onPreview?: () => void;
}

export const DesignCard: React.FC<DesignCardProps> = ({
    node,
    viewMode,
    brandColors,
    onGenerate,
    onPreview,
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [showFullDesign, setShowFullDesign] = useState(false);

    const handleGenerate = () => {
        onGenerate();
    };

    const showPRD = viewMode === 'prd' || (viewMode === 'split' && !node.designGenerated);
    const showDesign = viewMode === 'design' || (viewMode === 'split' && node.designGenerated);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    'bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:border-primary/20',
                    node.designLoading && 'ring-2 ring-primary'
                )}
            >
                {/* Preview Area */}
                <div
                    className="relative aspect-[9/16] bg-muted flex items-center justify-center overflow-hidden"
                    style={{ background: showDesign && node.designGenerated ? undefined : brandColors.background }}
                >
                    {showPRD && (
                        <div className="p-4 text-center">
                            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: brandColors.primary }} />
                            <p className="text-sm font-medium text-foreground">{node.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{node.type}</p>
                            {node.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{node.description}</p>
                            )}
                        </div>
                    )}

                    {showDesign && node.designGenerated && node.designUrl && (
                        <>
                            <img
                                src={node.designUrl}
                                alt={node.label}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setShowFullDesign(true)}
                                className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
                            >
                                <div className="bg-white/90 px-4 py-2 rounded-xl flex items-center gap-2">
                                    <Maximize2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Preview</span>
                                </div>
                            </button>
                        </>
                    )}

                    {showDesign && node.designLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: brandColors.primary }} />
                                <p className="text-sm mt-2 text-muted-foreground">Generating design...</p>
                            </div>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                        {node.designGenerated ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-full text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Ready
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                                <FileText className="w-3 h-3" />
                                PRD
                            </div>
                        )}
                    </div>
                </div>

                {/* Card Footer */}
                <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-foreground">{node.label}</h3>
                            <p className="text-xs text-muted-foreground">{node.type}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {node.designGenerated ? (
                            <>
                                <button
                                    onClick={onPreview}
                                    className="flex-1 btn-secondary btn-sm"
                                >
                                    <Eye className="w-3 h-3" />
                                    Preview
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="flex-1 btn-secondary btn-sm"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={node.designLoading}
                                className="flex-1 btn-primary btn-sm"
                                style={{ background: brandColors.primary }}
                            >
                                {node.designLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3 h-3" />
                                )}
                                Generate
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Full Screen Preview Modal */}
            {showFullDesign && node.designUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8"
                    onClick={() => setShowFullDesign(false)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                        onClick={() => setShowFullDesign(false)}
                    >
                        ×
                    </button>
                    <img
                        src={node.designUrl}
                        alt={node.label}
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};