import React, { forwardRef, HTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

interface RadioProps extends Omit<HTMLAttributes<HTMLInputElement>, 'type'> {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    error?: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md' | 'lg';
    name?: string;
    value?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
    (
        {
            id,
            name,
            value,
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
            sm: 'w-4 h-4',
            md: 'w-5 h-5',
            lg: 'w-6 h-6',
        };

        const variantClasses = {
            default: '',
            success: 'focus:ring-success',
            warning: 'focus:ring-warning',
            error: 'focus:ring-error',
        };

        const generatedId = useId();
        const radioId = id || generatedId;
        const descriptionId = description ? `${radioId}-description` : undefined;
        const errorId = error ? `${radioId}-error` : undefined;
        const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

        return (
            <div className={cn('flex items-start gap-3', className)}>
                <div className="relative flex items-start pt-0.5">
                    <input
                        id={radioId}
                        ref={ref}
                        type="radio"
                        name={name}
                        value={value}
                        checked={checked}
                        defaultChecked={defaultChecked}
                        onChange={handleChange}
                        disabled={disabled}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={describedBy}
                        className={cn(
                            'appearance-none cursor-pointer transition-all duration-200',
                            'border-2 rounded-full',
                            'bg-background',
                            'checked:bg-primary checked:border-primary',
                            'hover:border-primary/50',
                            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            sizeClasses[size],
                            variantClasses[variant],
                            error && 'border-error focus:ring-error',
                            disabled && 'bg-muted'
                        )}
                        {...props}
                    />
                </div>
                {(label || description) && (
                    <div className="flex-1">
                        {label && (
                            <label
                                htmlFor={radioId}
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

Radio.displayName = 'Radio';
