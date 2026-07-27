import React from 'react';
import { motion, useReducedMotion, type Variants, type TargetAndTransition } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

/**
 * AnimatedIcon — a lightweight framer-motion wrapper around a lucide icon that
 * adds tasteful micro-interactions. Every variant respects the user's
 * `prefers-reduced-motion` setting and falls back to a static icon.
 *
 * `trigger: 'hover'` animates when the nearest ancestor with the `group` class
 * is hovered (great for cards/buttons); `trigger: 'loop'` runs continuously
 * (great for status/heartbeat indicators); `trigger: 'mount'` plays once.
 */
export type IconAnimation =
    | 'pulse'
    | 'bounce'
    | 'wiggle'
    | 'spin'
    | 'float'
    | 'ping'
    | 'pop';

export type IconTrigger = 'hover' | 'loop' | 'mount';

interface AnimatedIconProps {
    icon: LucideIcon;
    size?: number;
    className?: string;
    strokeWidth?: number;
    animation?: IconAnimation;
    trigger?: IconTrigger;
    /** Delay in seconds before a mount/loop animation starts. */
    delay?: number;
    'aria-hidden'?: boolean;
}

const HOVER_VARIANTS: Record<IconAnimation, Variants> = {
    pulse: { rest: { scale: 1 }, active: { scale: [1, 1.15, 1] } },
    bounce: { rest: { y: 0 }, active: { y: [0, -3, 0] } },
    wiggle: { rest: { rotate: 0 }, active: { rotate: [0, -8, 8, -6, 0] } },
    spin: { rest: { rotate: 0 }, active: { rotate: 360 } },
    float: { rest: { y: 0 }, active: { y: [0, -2.5, 0] } },
    ping: { rest: { scale: 1, opacity: 1 }, active: { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } },
    pop: { rest: { scale: 1 }, active: { scale: [1, 0.85, 1.1, 1] } },
};

const HOVER_TRANSITION: Record<IconAnimation, object> = {
    pulse: { duration: 0.45, ease: 'easeInOut' },
    bounce: { duration: 0.4, ease: 'easeOut' },
    wiggle: { duration: 0.5, ease: 'easeInOut' },
    spin: { duration: 0.6, ease: 'easeInOut' },
    float: { duration: 0.5, ease: 'easeInOut' },
    ping: { duration: 0.5, ease: 'easeInOut' },
    pop: { duration: 0.4, ease: 'easeOut' },
};

const LOOP_TRANSITION: Record<IconAnimation, object> = {
    pulse: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    bounce: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
    wiggle: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 },
    spin: { duration: 2.2, repeat: Infinity, ease: 'linear' },
    float: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
    ping: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
    pop: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
};

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
    icon: Icon,
    size = 18,
    className,
    strokeWidth,
    animation = 'pulse',
    trigger = 'hover',
    delay = 0,
    'aria-hidden': ariaHidden = true,
}) => {
    const reduceMotion = useReducedMotion();
    // Memoize the motion-wrapped icon so it isn't recreated (and remounted) each render.
    const MotionIcon = React.useMemo(() => motion(Icon), [Icon]);

    // Static fallback for reduced-motion users.
    if (reduceMotion) {
        return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden={ariaHidden} />;
    }

    if (trigger === 'hover') {
        return (
            <MotionIcon
                size={size}
                className={className}
                strokeWidth={strokeWidth}
                aria-hidden={ariaHidden}
                variants={HOVER_VARIANTS[animation]}
                initial="rest"
                animate="rest"
                whileHover="active"
                whileTap="active"
                transition={{ ...HOVER_TRANSITION[animation], delay }}
            />
        );
    }

    if (trigger === 'loop') {
        return (
            <MotionIcon
                size={size}
                className={className}
                strokeWidth={strokeWidth}
                aria-hidden={ariaHidden}
                animate={HOVER_VARIANTS[animation].active as TargetAndTransition}
                transition={{ ...LOOP_TRANSITION[animation], delay }}
            />
        );
    }

    // mount
    return (
        <MotionIcon
            size={size}
            className={className}
            strokeWidth={strokeWidth}
            aria-hidden={ariaHidden}
            initial={{ scale: 0, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay }}
        />
    );
};

/**
 * GroupHoverIcon — animates only when an ancestor `.group` is hovered. Uses
 * CSS-driven group-hover so it works without wiring hover state through React.
 */
interface GroupHoverIconProps {
    icon: LucideIcon;
    size?: number;
    className?: string;
    animation?: 'translate-x' | 'translate-up' | 'rotate' | 'scale';
}

const GROUP_HOVER_CLASS: Record<NonNullable<GroupHoverIconProps['animation']>, string> = {
    'translate-x': 'transition-transform duration-300 group-hover:translate-x-1',
    'translate-up': 'transition-transform duration-300 group-hover:-translate-y-0.5',
    rotate: 'transition-transform duration-300 group-hover:rotate-12',
    scale: 'transition-transform duration-300 group-hover:scale-110',
};

export const GroupHoverIcon: React.FC<GroupHoverIconProps> = ({
    icon: Icon,
    size = 18,
    className = '',
    animation = 'translate-x',
}) => (
    <Icon
        size={size}
        aria-hidden
        className={`${GROUP_HOVER_CLASS[animation]} motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100 ${className}`}
    />
);
