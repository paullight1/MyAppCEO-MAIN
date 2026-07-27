import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const DOCS_URL = import.meta.env.VITE_DOCS_URL?.trim();
const isExternalDocsUrl = Boolean(DOCS_URL && /^https?:\/\//i.test(DOCS_URL));
const normalizeInternalDocsUrl = (value: string) => {
    const normalized = value.startsWith('/') ? value : `/${value}`;
    return normalized.replace(/\/+$/, '') || '/documentation';
};
const internalDocsTarget = DOCS_URL ? normalizeInternalDocsUrl(DOCS_URL) : '/documentation';
const docsTarget = DOCS_URL
    ? isExternalDocsUrl
        ? null
        : internalDocsTarget === '/docs'
            ? '/documentation'
            : internalDocsTarget
    : '/documentation';

export const DocsRedirectPage: React.FC = () => {
    useEffect(() => {
        if (typeof window === 'undefined' || !isExternalDocsUrl || !DOCS_URL) {
            return;
        }

        window.location.replace(DOCS_URL);
    }, []);

    if (isExternalDocsUrl && DOCS_URL) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-6">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">
                        Redirecting to documentation...
                    </p>
                </div>
            </div>
        );
    }

    return docsTarget ? <Navigate to={docsTarget} replace /> : null;
};
