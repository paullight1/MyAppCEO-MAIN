import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
}

interface BrandColorPickerProps {
    colors: BrandColors;
    onChange: (colors: BrandColors) => void;
    presets?: { name: string; colors: BrandColors }[];
    onClose: () => void;
}

const COLOR_LABELS: Record<keyof BrandColors, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    accent: 'Accent',
    background: 'Background',
};

export const BrandColorPicker: React.FC<BrandColorPickerProps> = ({
    colors,
    onChange,
    presets = [],
    onClose,
}) => {
    const handleColorChange = (key: keyof BrandColors, value: string) => {
        onChange({ ...colors, [key]: value });
    };

    return (
        <div className="w-80 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Brand Colors</h3>
                <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Color Inputs */}
                {(Object.keys(colors) as Array<keyof BrandColors>).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                            {COLOR_LABELS[key]}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={colors[key]}
                                onChange={(e) => handleColorChange(key, e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border-0"
                            />
                            <input
                                type="text"
                                value={colors[key]}
                                onChange={(e) => handleColorChange(key, e.target.value)}
                                className="w-20 px-2 py-1 text-xs bg-muted rounded border border-border"
                            />
                        </div>
                    </div>
                ))}

                {/* Preview */}
                <div 
                    className="p-4 rounded-xl mt-4"
                    style={{ background: colors.background }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div 
                            className="px-3 py-1 rounded-full text-white text-xs font-medium"
                            style={{ background: colors.primary }}
                        >
                            Primary
                        </div>
                        <div 
                            className="px-3 py-1 rounded-full text-white text-xs font-medium"
                            style={{ background: colors.secondary }}
                        >
                            Secondary
                        </div>
                    </div>
                    <p className="text-sm font-medium" style={{ color: colors.primary }}>
                        Sample Heading Text
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.secondary }}>
                        Secondary description text
                    </p>
                </div>
            </div>

            {/* Presets */}
            {presets.length > 0 && (
                <div className="p-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick Presets</p>
                    <div className="grid grid-cols-3 gap-2">
                        {presets.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => onChange(preset.colors)}
                                className={cn(
                                    'p-2 rounded-lg border border-border hover:border-primary transition-all text-xs',
                                    colors.primary === preset.colors.primary && 'border-primary bg-primary/5'
                                )}
                            >
                                <div className="flex -space-x-1 mb-1">
                                    <div className="w-4 h-4 rounded-full" style={{ background: preset.colors.primary }} />
                                    <div className="w-4 h-4 rounded-full" style={{ background: preset.colors.secondary }} />
                                    <div className="w-4 h-4 rounded-full" style={{ background: preset.colors.accent }} />
                                </div>
                                <span className="text-foreground">{preset.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};