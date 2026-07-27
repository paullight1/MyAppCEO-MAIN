import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Share2 } from 'lucide-react';

interface MindMapControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitToScreen: () => void;
    onReset: () => void;
    onExport: () => void;
    onShare?: () => void;
}

export function MindMapControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onFitToScreen,
    onReset,
    onExport,
    onShare
}: MindMapControlsProps) {
    return (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white dark:bg-gray-800 
                        rounded-lg shadow-lg border p-2 z-50">
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
                <button
                    onClick={onZoomOut}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
                <span className="text-sm font-medium w-12 text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={onZoomIn}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
            </div>
            
            <button
                onClick={onFitToScreen}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Fit to Screen"
            >
                <Maximize2 size={18} />
            </button>
            
            <button
                onClick={onReset}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Reset View"
            >
                <RotateCcw size={18} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            
            <button
                onClick={onExport}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Export PRD"
            >
                <Download size={18} />
            </button>
            
            {onShare && (
                <button
                    onClick={onShare}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Share"
                >
                    <Share2 size={18} />
                </button>
            )}
        </div>
    );
}