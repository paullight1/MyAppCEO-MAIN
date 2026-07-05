import React, { HTMLAttributes, ReactNode, useId } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FormFieldRenderProps {
    id: string;
    disabled?: boolean;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
}

interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    id?: string;
    label?: ReactNode;
    description?: ReactNode;
    helperText?: ReactNode;
    error?: ReactNode;
    success?: ReactNode;
    required?: boolean;
    disabled?: boolean;
    hideLabel?: boolean;
    children: ReactNode | ((fieldProps: FormFieldRenderProps) => ReactNode);
}

export function FormField({
    id,
    label,
    description,
    helperText,
    error,
    success,
    required,
    disabled,
    hideLabel,
    children,
    className,
    ...props
}: FormFieldProps) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const descriptionId = description || helperText ? `${fieldId}-description` : undefined;
    const messageId = error || success ? `${fieldId}-message` : undefined;
    const describedBy = [descriptionId, messageId].filter(Boolean).join(' ') || undefined;
    const fieldProps: FormFieldRenderProps = {
        id: fieldId,
        disabled,
        'aria-describedby': describedBy,
        'aria-invalid': Boolean(error) || undefined,
    };

    return (
        <div className={cn('space-y-1.5', disabled && 'opacity-70', className)} {...props}>
            {label && (
                <label
                    htmlFor={fieldId}
                    className={cn(
                        'block text-sm font-semibold text-foreground',
                        disabled && 'cursor-not-allowed text-muted-foreground',
                        error && 'text-error',
                        hideLabel && 'sr-only'
                    )}
                >
                    {label}
                    {required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
                </label>
            )}

            {typeof children === 'function' ? children(fieldProps) : children}

            {(description || helperText) && (
                <p id={descriptionId} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{description ?? helperText}</span>
                </p>
            )}

            {error && (
                <p id={messageId} className="flex items-start gap-1.5 text-sm font-medium text-error" role="alert">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </p>
            )}

            {!error && success && (
                <p id={messageId} className="flex items-start gap-1.5 text-sm font-medium text-success">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{success}</span>
                </p>
            )}
        </div>
    );
}
