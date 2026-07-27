/** @type {import('tailwindcss').Config} */

// Helper: wrap a CSS var in hsl() with an alpha-value slot so that
// Tailwind opacity modifiers (bg-card/80, border-border/40, etc.) work.
// The CSS vars must be stored as bare HSL channels: "210 40% 98%"
const hsl = (v) => `hsl(var(${v}) / <alpha-value>)`;

export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                outfit: ['Outfit', 'sans-serif'],
                mono: ['IBM Plex Mono', 'monospace'],
            },
            colors: {
                background:  hsl('--background'),
                foreground:  hsl('--foreground'),
                card: {
                    DEFAULT:    hsl('--card'),
                    foreground: hsl('--card-foreground'),
                },
                popover: {
                    DEFAULT:    hsl('--popover'),
                    foreground: hsl('--popover-foreground'),
                },
                primary: {
                    DEFAULT:    hsl('--primary'),
                    foreground: hsl('--primary-foreground'),
                },
                secondary: {
                    DEFAULT:    hsl('--secondary'),
                    foreground: hsl('--secondary-foreground'),
                },
                muted: {
                    DEFAULT:    hsl('--muted'),
                    foreground: hsl('--muted-foreground'),
                },
                accent: {
                    DEFAULT:    hsl('--accent'),
                    foreground: hsl('--accent-foreground'),
                },
                destructive: {
                    DEFAULT:    hsl('--destructive'),
                    foreground: hsl('--destructive-foreground'),
                },
                error: {
                    DEFAULT:    hsl('--error'),
                    foreground: hsl('--error-foreground'),
                },
                success: {
                    DEFAULT:    hsl('--success'),
                    foreground: hsl('--success-foreground'),
                },
                warning: {
                    DEFAULT:    hsl('--warning'),
                    foreground: hsl('--warning-foreground'),
                },
                border: hsl('--border'),
                input:  hsl('--input'),
                ring:   hsl('--ring'),
                sidebar: {
                    DEFAULT:    hsl('--sidebar'),
                    foreground: hsl('--sidebar-foreground'),
                    border:     hsl('--sidebar-border'),
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            letterSpacing: {
                tighter: '-0.05em',
                tight:   '-0.025em',
                normal:  '0',
                wide:    '0.025em',
                wider:   '0.05em',
                widest:  '0.1em',
                display: '0.2em',
            },
        },
    },
    plugins: [],
}

