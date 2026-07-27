import React from 'react';

type Tile = {
    /** 0 = front and centre, 2 = furthest back */
    depth: 0 | 1 | 2;
    /** vertical nudge in px so the field doesn't read as a flat grid */
    offsetY?: number;
};

/** Front row of six, back row of four — mirrors the depth falloff of the reference. */
const ROW_TOP: Tile[] = [
    { depth: 2, offsetY: 10 },
    { depth: 1, offsetY: -6 },
    { depth: 0 },
    { depth: 0, offsetY: -10 },
    { depth: 1, offsetY: 4 },
    { depth: 2, offsetY: 14 },
];

const ROW_BOTTOM: Tile[] = [
    { depth: 2, offsetY: 8 },
    { depth: 1, offsetY: -4 },
    { depth: 1, offsetY: 2 },
    { depth: 2, offsetY: 12 },
];

const DEPTH_STYLE: Record<Tile['depth'], { scale: number; blur: number; opacity: number; ring: string }> = {
    0: { scale: 1, blur: 0, opacity: 1, ring: 'rgba(255,255,255,0.10)' },
    1: { scale: 0.88, blur: 3, opacity: 0.6, ring: 'rgba(255,255,255,0.06)' },
    2: { scale: 0.76, blur: 7, opacity: 0.3, ring: 'rgba(255,255,255,0.04)' },
};

/** Fallback glyph tiles when there aren't enough listing images to fill the field. */
const FALLBACKS = [
    { label: 'A', from: '#ff5f6d', to: '#ffc371' },
    { label: 'S', from: '#12c2e9', to: '#c471ed' },
    { label: 'M', from: '#0071e3', to: '#00c6ff' },
    { label: 'V', from: '#1dd75b', to: '#0ea5e9' },
    { label: 'P', from: '#f7971e', to: '#ffd200' },
    { label: 'L', from: '#8e2de2', to: '#4a00e0' },
    { label: 'X', from: '#f83600', to: '#fe8c00' },
    { label: 'B', from: '#00b09b', to: '#96c93d' },
    { label: 'C', from: '#ee0979', to: '#ff6a00' },
    { label: 'D', from: '#2b5876', to: '#4e4376' },
];

export interface HeroAppIconFieldProps {
    /** Listing artwork, newest first. Missing entries fall back to glyph tiles. */
    images?: string[];
    className?: string;
}

export const HeroAppIconField: React.FC<HeroAppIconFieldProps> = ({ images = [], className = '' }) => {
    const renderTile = (tile: Tile, index: number) => {
        const depth = DEPTH_STYLE[tile.depth];
        const image = images[index];
        const fallback = FALLBACKS[index % FALLBACKS.length];

        return (
            <div
                key={index}
                className="hero-icon-tile relative shrink-0 rounded-[24px] md:rounded-[30px]"
                style={{
                    width: 'var(--tile)',
                    height: 'var(--tile)',
                    transform: `translateY(${tile.offsetY ?? 0}px) scale(${depth.scale})`,
                    filter: depth.blur ? `blur(${depth.blur}px)` : undefined,
                    opacity: depth.opacity,
                    animationDelay: `${index * 0.45}s`,
                    background: 'linear-gradient(160deg, #1c1c1e 0%, #0d0d0f 100%)',
                    boxShadow: `inset 0 1px 0 ${depth.ring}, 0 24px 60px -20px rgba(0,0,0,0.9)`,
                }}
            >
                <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                    {image ? (
                        <img src={image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                    ) : (
                        <div className="relative flex h-full w-full items-center justify-center bg-[#0e0e11]">
                            {/* colour lives in a soft bloom + the glyph, so the tile itself stays dark */}
                            <div
                                className="absolute inset-[26%] rounded-full opacity-30"
                                style={{
                                    background: `linear-gradient(140deg, ${fallback.from}, ${fallback.to})`,
                                    filter: 'blur(16px)',
                                }}
                            />
                            <span
                                className="relative text-[34px] font-bold tracking-tight md:text-[46px]"
                                style={{
                                    backgroundImage: `linear-gradient(140deg, ${fallback.from}, ${fallback.to})`,
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                {fallback.label}
                            </span>
                        </div>
                    )}
                </div>
                {/* glass edge highlight */}
                <div
                    className="pointer-events-none absolute inset-0 rounded-[inherit]"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 45%)',
                        boxShadow: `inset 0 0 0 1px ${depth.ring}`,
                    }}
                />
            </div>
        );
    };

    return (
        <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
            <style>{`
                @keyframes heroIconFloat {
                    0%, 100% { translate: 0 0; }
                    50% { translate: 0 -10px; }
                }
                .hero-icon-tile { animation: heroIconFloat 9s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .hero-icon-tile { animation: none; }
                }
            `}</style>

            {/* Diagonal light streaks behind the icons */}
            <div
                className="absolute left-1/2 top-[-25%] h-[105%] w-[150%] -translate-x-1/2"
                style={{
                    background:
                        'repeating-linear-gradient(115deg, rgba(233,64,87,0.55) 0px, rgba(233,64,87,0.55) 110px, rgba(10,10,12,0) 110px, rgba(10,10,12,0) 240px, rgba(56,189,248,0.30) 240px, rgba(56,189,248,0.30) 300px, rgba(10,10,12,0) 300px, rgba(10,10,12,0) 470px)',
                    filter: 'blur(60px)',
                    opacity: 0.45,
                    maskImage: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.5) 55%, transparent 85%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.5) 55%, transparent 85%)',
                }}
            />

            {/* Icon field */}
            <div
                className="absolute inset-x-0 top-[16%] flex flex-col items-center gap-4 md:top-[18%] md:gap-6"
                style={{
                    // one knob drives every tile size
                    ['--tile' as string]: 'clamp(64px, 11vw, 132px)',
                    maskImage:
                        'radial-gradient(120% 95% at 50% 40%, #000 30%, rgba(0,0,0,0.55) 62%, transparent 88%)',
                    WebkitMaskImage:
                        'radial-gradient(120% 95% at 50% 40%, #000 30%, rgba(0,0,0,0.55) 62%, transparent 88%)',
                }}
            >
                <div className="flex items-center justify-center gap-3 md:gap-5">
                    {ROW_TOP.map((tile, i) => renderTile(tile, i))}
                </div>
                <div className="flex items-center justify-center gap-3 md:gap-5">
                    {ROW_BOTTOM.map((tile, i) => renderTile(tile, ROW_TOP.length + i))}
                </div>
            </div>

            {/* Dark edges: vignette + bottom fade into the copy */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(110% 80% at 50% 22%, rgba(0,0,0,0) 30%, rgba(6,6,8,0.72) 68%, #060608 100%)',
                }}
            />
            <div
                className="absolute inset-x-0 bottom-0 h-[55%]"
                style={{ background: 'linear-gradient(to top, #060608 22%, rgba(6,6,8,0.85) 55%, rgba(6,6,8,0) 100%)' }}
            />
            <div
                className="absolute inset-x-0 top-0 h-[22%]"
                style={{ background: 'linear-gradient(to bottom, #060608 8%, rgba(6,6,8,0) 100%)' }}
            />
        </div>
    );
};
