import React, { forwardRef, HTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<HTMLAttributes<HTMLSelectElement>, 'size'> {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    error?: string;
    placeholder?: string;
    options: SelectOption[];
    variant?: 'default' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            id,
            value,
            defaultValue,
            onValueChange,
            disabled,
            label,
            description,
            error,
            placeholder = 'Select an option',
            options,
            variant = 'default',
            size = 'md',
            fullWidth = true,
            className,
            ...props
        },
        ref
    ) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onValueChange?.(e.target.value);
        };

        const sizeClasses = {
            sm: 'px-3 py-2 text-sm rounded-lg',
            md: 'px-4 py-3 text-base rounded-xl',
            lg: 'px-5 py-4 text-lg rounded-2xl',
        };

        const variantClasses = {
            default: 'focus:ring-primary focus:border-primary',
            success: 'focus:ring-success focus:border-success',
            warning: 'focus:ring-warning focus:border-warning',
            error: 'focus:ring-error focus:border-error',
        };

        const generatedId = useId();
        const selectId = id || generatedId;
        const descriptionId = description ? `${selectId}-description` : undefined;
        const errorId = error ? `${selectId}-error` : undefined;
        const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

        return (
            <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
                {(label || description) && (
                    <div>
                        {label && (
                            <label
                                htmlFor={selectId}
                                className={cn(
                                    'block font-medium transition-colors',
                                    disabled ? 'text-muted-foreground' : 'text-foreground',
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
                    </div>
                )}
                <div className="relative">
                    <select
                        id={selectId}
                        ref={ref}
                        value={value}
                        defaultValue={defaultValue}
                        onChange={handleChange}
                        disabled={disabled}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={describedBy}
                        className={cn(
                            'appearance-none cursor-pointer transition-all duration-200',
                            'w-full',
                            'bg-background',
                            'border-2',
                            'focus:outline-none focus:ring-2 focus:ring-offset-2',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted',
                            sizeClasses[size],
                            variantClasses[variant],
                            error && 'border-error',
                            !error && 'border-border'
                        )}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        className={cn(
                            'absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none',
                            'transition-transform duration-200',
                            'text-muted-foreground',
                            disabled && 'opacity-50',
                            size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-5 h-5'
                        )}
                    />
                </div>
                {error && (
                    <p id={errorId} className="text-sm text-error mt-0.5" role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
