import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Plus, Loader2 } from 'lucide-react';
import { PRDNode } from './types';

interface AISuggestionsProps {
    node: PRDNode;
    suggestions: string[];
    isLoading: boolean;
    onAcceptSuggestion: (suggestion: string) => void;
    onRejectSuggestion: (suggestion: string) => void;
    onAddAll: () => void;
    onGenerateMore: () => void;
    onClose: () => void;
}

export function AISuggestions({
    node,
    suggestions,
    isLoading,
    onAcceptSuggestion,
    onRejectSuggestion,
    onAddAll,
    onGenerateMore,
    onClose
}: AISuggestionsProps) {
    const [accepted, setAccepted] = useState<Set<string>>(new Set());
    const [rejected, setRejected] = useState<Set<string>>(new Set());

    const visibleSuggestions = suggestions.filter(
        s => !accepted.has(s) && !rejected.has(s)
    );

    const handleAccept = (suggestion: string) => {
        setAccepted(prev => new Set(prev).add(suggestion));
        onAcceptSuggestion(suggestion);
    };

    const handleReject = (suggestion: string) => {
        setRejected(prev => new Set(prev).add(suggestion));
        onRejectSuggestion(suggestion);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border w-80 max-h-96 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-500" />
                    <h3 className="font-semibold">AI Suggestions</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="p-3 border-b bg-purple-50 dark:bg-purple-900/20">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                    Suggestions for: <strong>{node.label}</strong>
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-purple-500" size={24} />
                            <span className="ml-2 text-sm text-gray-500">Generating suggestions...</span>
                        </div>
                    ) : visibleSuggestions.length > 0 ? (
                        visibleSuggestions.map((suggestion, index) => (
                            <motion.div
                                key={suggestion}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                            >
                                <span className="flex-1 text-sm">{suggestion}</span>
                                <button
                                    onClick={() => handleAccept(suggestion)}
                                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Accept"
                                >
                                    <Check size={14} className="text-green-600" />
                                </button>
                                <button
                                    onClick={() => handleReject(suggestion)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Reject"
                                >
                                    <X size={14} className="text-red-600" />
                                </button>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No suggestions available</p>
                            <button
                                onClick={onGenerateMore}
                                className="mt-2 text-sm text-purple-500 hover:underline"
                            >
                                Generate more
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {visibleSuggestions.length > 0 && (
                <div className="p-3 border-t flex gap-2">
                    <button
                        onClick={onAddAll}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-500 
                                   hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
                    >
                        <Plus size={16} />
                        Add All
                    </button>
                    <button
                        onClick={onGenerateMore}
                        className="flex-1 py-2 border border-purple-500 text-purple-500 
                                   hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-sm transition-colors"
                    >
                        Generate More
                    </button>
                </div>
            )}
        </div>
    );
}