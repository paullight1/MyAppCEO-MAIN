import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReferenceApp {
    id: string;
    name: string;
    icon: string;
    category: string;
    description: string;
}

const POPULAR_APPS: ReferenceApp[] = [
    { id: '1', name: 'Instagram', icon: '📸', category: 'Social', description: 'Photo sharing & social' },
    { id: '2', name: 'TikTok', icon: '🎵', category: 'Social', description: 'Short video platform' },
    { id: '3', name: 'Uber', icon: '🚗', category: 'Marketplace', description: 'Ride sharing' },
    { id: '4', name: 'Airbnb', icon: '🏠', category: 'Marketplace', description: 'Vacation rentals' },
    { id: '5', name: 'Notion', icon: '📝', category: 'Productivity', description: 'All-in-one workspace' },
    { id: '6', name: 'Slack', icon: '💬', category: 'Productivity', description: 'Team communication' },
    { id: '7', name: 'Figma', icon: '🎨', category: 'Design', description: 'UI/UX design tool' },
    { id: '8', name: 'Spotify', icon: '🎧', category: 'Entertainment', description: 'Music streaming' },
    { id: '9', name: 'Netflix', icon: '🎬', category: 'Entertainment', description: 'Video streaming' },
    { id: '10', name: 'Amazon', icon: '📦', category: 'E-commerce', description: 'E-commerce platform' },
    { id: '11', name: 'Shopify', icon: '🛒', category: 'E-commerce', description: 'E-commerce builder' },
    { id: '12', name: 'Duolingo', icon: '🦉', category: 'Education', description: 'Language learning' },
    { id: '13', name: 'Calendly', icon: '📅', category: 'Productivity', description: 'Scheduling' },
    { id: '14', name: 'Zoom', icon: '📹', category: 'Productivity', description: 'Video conferencing' },
    { id: '15', name: 'Dropbox', icon: '📁', category: 'Productivity', description: 'Cloud storage' },
    { id: '16', name: 'Canva', icon: '✏️', category: 'Design', description: 'Graphic design' },
    { id: '17', name: 'Discord', icon: '🎮', category: 'Social', description: 'Gaming community' },
    { id: '18', name: 'Twitter', icon: '🐦', category: 'Social', description: 'Microblogging' },
    { id: '19', name: 'LinkedIn', icon: '💼', category: 'Social', description: 'Professional network' },
    { id: '20', name: 'WhatsApp', icon: '💭', category: 'Messaging', description: 'Instant messaging' },
];

interface ReferenceAppInputProps {
    value: string[];
    onChange: (apps: string[]) => void;
    maxSelection?: number;
}

export function ReferenceAppInput({
    value,
    onChange,
    maxSelection = 3,
}: ReferenceAppInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedApps = POPULAR_APPS.filter(app => value.includes(app.name));

    const filteredApps = POPULAR_APPS.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).filter(app => !value.includes(app.name));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (appName: string) => {
        if (value.length >= maxSelection) return;

        setIsLoading(true);
        
        // Simulate AI analysis delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        onChange([...value, appName]);
        setSearchQuery('');
        setIsLoading(false);
    };

    const handleRemove = (appName: string) => {
        onChange(value.filter(name => name !== appName));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <label className="block text-sm font-semibold text-foreground mb-2">
                Similar to... (optional)
                <span className="text-muted-foreground font-normal ml-2">
                    Reference apps to help AI understand style preferences
                </span>
            </label>

            {/* Selected Apps */}
            {selectedApps.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedApps.map(app => {
                        return (
                            <motion.div
                                key={app.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-sm"
                            >
                                <span>{app.icon}</span>
                                <span className="font-medium text-foreground">{app.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(app.name)}
                                    className="ml-1 p-0.5 hover:bg-accent/20 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-accent" />
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Input Field */}
            {value.length < maxSelection && (
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., Instagram, Uber, Notion..."
                        className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg 
                                 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all
                                 text-sm"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                        >
                            <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                    )}
                </div>
            )}

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && searchQuery && filteredApps.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto"
                    >
                        {isLoading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                                <Sparkles className="w-4 h-4 animate-pulse" />
                                <span className="text-sm">Analyzing...</span>
                            </div>
                        ) : (
                            <div className="py-1">
                                {filteredApps.slice(0, 8).map(app => (
                                    <button
                                        key={app.id}
                                        type="button"
                                        onClick={() => handleSelect(app.name)}
                                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/50 
                                                 text-left transition-colors"
                                    >
                                        <span className="text-xl">{app.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground text-sm">
                                                {app.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {app.description}
                                            </p>
                                        </div>
                                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                            {app.category}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hint */}
            {value.length === 0 && !searchQuery && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Tip: Select apps similar to what you're building for better AI suggestions
                </p>
            )}

            {/* Max selection hint */}
            {value.length >= maxSelection && (
                <p className="mt-2 text-xs text-muted-foreground">
                    Maximum {maxSelection} reference apps selected
                </p>
            )}
        </div>
    );
}

export default ReferenceAppInput;
