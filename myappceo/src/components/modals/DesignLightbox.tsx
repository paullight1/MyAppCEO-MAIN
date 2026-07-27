import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateUrl } from '../../utils/security';

interface Design {
    id: string;
    imageUrl: string;
    screenName: string;
    screenType: string;
    figmaUrl?: string;
}

interface DesignLightboxProps {
    designs: Design[];
    initialIndex: number;
    onClose: () => void;
}

export const DesignLightbox: React.FC<DesignLightboxProps> = ({
    designs,
    initialIndex,
    onClose,
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);

    const currentDesign = designs[currentIndex];

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? designs.length - 1 : prev - 1));
        setZoom(1);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === designs.length - 1 ? 0 : prev + 1));
        setZoom(1);
    };

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));
    const handleDownload = () => {
        if (!currentDesign?.imageUrl) return;
        const a = document.createElement('a');
        a.href = currentDesign.imageUrl;
        a.download = `${currentDesign.screenName || 'design'}.png`;
        a.click();
    };
    const handleShare = async () => {
        if (!currentDesign?.imageUrl) return;
        if (navigator.share) {
            await navigator.share({
                title: currentDesign.screenName,
                url: currentDesign.imageUrl,
            });
            return;
        }
        await navigator.clipboard.writeText(currentDesign.imageUrl);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
                onClick={onClose}
            >
                <div className="flex items-center justify-between p-4 text-white">
                    <div>
                        <h3 className="font-semibold">{currentDesign?.screenName}</h3>
                        <p className="text-sm text-white/60">{currentDesign?.screenType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            disabled={zoom === 1}
                        >
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-sm">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            disabled={zoom === 3}
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Download image"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); void handleShare(); }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Share or copy link"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                        {currentDesign?.figmaUrl && validateUrl(currentDesign.figmaUrl) && (
                            <a
                                href={currentDesign.figmaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="Open in Figma"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <motion.img
                        key={currentDesign?.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: zoom }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        src={currentDesign?.imageUrl}
                        alt={currentDesign?.screenName}
                        className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 flex justify-center gap-2">
                    {designs.map((design, index) => (
                        <button
                            key={design.id}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); setZoom(1); }}
                            className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                                index === currentIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            <img src={design.imageUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>

                <div className="text-center pb-4 text-white/60 text-sm">
                    {currentIndex + 1} of {designs.length}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
