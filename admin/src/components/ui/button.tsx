import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
    default: 'bg-accent text-accent-foreground hover:bg-accent/90',
    ghost: 'bg-transparent hover:bg-muted',
    outline: 'border border-border bg-card hover:bg-muted',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-error text-white hover:bg-error/90',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-6',
    icon: 'h-10 w-10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:pointer-events-none disabled:opacity-50',
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            {...props}
        />
    )
);

Button.displayName = 'Button';
