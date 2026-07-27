import React, { forwardRef, HTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

interface ToggleProps extends Omit<HTMLAttributes<HTMLInputElement>, 'type'> {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    error?: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md' | 'lg';
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
    (
        {
            id,
            checked,
            defaultChecked,
            onCheckedChange,
            disabled,
            label,
            description,
            error,
            variant = 'default',
            size = 'md',
            className,
            ...props
        },
        ref
    ) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(e.target.checked);
        };

        const sizeClasses = {
            sm: {
                input: 'w-9 h-5',
                thumb: 'w-3.5 h-3.5',
                translate: 'translateX(1rem)',
            },
            md: {
                input: 'w-11 h-6',
                thumb: 'w-4 h-4',
                translate: 'translateX(1.25rem)',
            },
            lg: {
                input: 'w-14 h-8',
                thumb: 'w-5 h-5',
                translate: 'translateX(1.5rem)',
            },
        };

        const variantClasses = {
            default: {
                checked: 'bg-primary',
                ring: 'focus:ring-primary',
            },
            success: {
                checked: 'bg-success',
                ring: 'focus:ring-success',
            },
            warning: {
                checked: 'bg-warning',
                ring: 'focus:ring-warning',
            },
            error: {
                checked: 'bg-error',
                ring: 'focus:ring-error',
            },
        };

        const generatedId = useId();
        const toggleId = id || generatedId;
        const descriptionId = description ? `${toggleId}-description` : undefined;
        const errorId = error ? `${toggleId}-error` : undefined;
        const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

        return (
            <div className={cn('flex items-start gap-3', className)}>
                <div className="relative flex items-center pt-0.5">
                    <input
                        id={toggleId}
                        ref={ref}
                        type="checkbox"
                        role="switch"
                        checked={checked}
                        defaultChecked={defaultChecked}
                        onChange={handleChange}
                        disabled={disabled}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={describedBy}
                        className={cn(
                            'appearance-none cursor-pointer transition-all duration-200',
                            'rounded-full',
                            'bg-muted',
                            'peer',
                            sizeClasses[size].input,
                            'hover:bg-muted-foreground/10',
                            'focus:outline-none focus:ring-2 focus:ring-offset-2',
                            variantClasses[variant].ring,
                            error && 'border-error focus:ring-error',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        style={{
                            backgroundImage: checked ? 'none' : undefined,
                        }}
                        {...props}
                    />
                    <span
                        className={cn(
                            'absolute top-0.5 left-0.5',
                            'bg-white rounded-full',
                            'transition-transform duration-200',
                            'shadow-sm pointer-events-none',
                            sizeClasses[size].thumb,
                            checked && sizeClasses[size].translate,
                            disabled && 'opacity-50'
                        )}
                        aria-hidden="true"
                    />
                </div>
                {(label || description) && (
                    <div className="flex-1">
                        {label && (
                            <label
                                htmlFor={toggleId}
                                className={cn(
                                    'block font-medium cursor-pointer transition-colors',
                                    disabled ? 'text-muted-foreground cursor-not-allowed' : 'text-foreground',
                                    error && 'text-error',
                                    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-base'
                                )}
                            >
                                {label}
                            </label>
                        )}
                        {description && (
                            <p className={cn(
                                'text-sm mt-0.5',
                                'text-muted-foreground',
                                disabled && 'opacity-50',
                                size === 'sm' ? 'text-xs' : ''
                            )}
                                id={descriptionId}
                            >
                                {description}
                            </p>
                        )}
                        {error && (
                            <p id={errorId} className="text-sm text-error mt-0.5" role="alert">
                                {error}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Toggle.displayName = 'Toggle';
