import React, {
    HTMLAttributes,
    ReactNode,
    createContext,
    forwardRef,
    useContext,
    useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

interface DialogContextValue {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
}

interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}

const DialogContext = createContext<DialogContextValue>({ open: false });

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange }}>
            {children}
        </DialogContext.Provider>
    );
}

export const DialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        const { open, onOpenChange } = useContext(DialogContext);

        useEffect(() => {
            if (!open) return;

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    onOpenChange?.(false);
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [open, onOpenChange]);

        if (!open) return null;

        return createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <button
                    type="button"
                    aria-label="Close dialog"
                    className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                    onClick={() => onOpenChange?.(false)}
                />
                <div
                    ref={ref}
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                        'relative z-10 w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl',
                        className
                    )}
                    {...props}
                >
                    {children}
                </div>
            </div>,
            document.body
        );
    }
);

DialogContent.displayName = 'DialogContent';

export const DialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
    )
);

DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h2 ref={ref} className={cn('text-lg font-semibold text-foreground', className)} {...props} />
    )
);

DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
    )
);

DialogDescription.displayName = 'DialogDescription';
