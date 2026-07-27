import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { apiDelete, apiGetAuth, apiPost } from '../lib/apiClient';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, LoadingState } from '../components/ui/State';
import { formatDate, formatNumber, formatPercent } from '../utils/format';
import { cn } from '../utils/cn';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Code2,
    Copy,
    ExternalLink,
    Key,
    Loader2,
    Package,
    RefreshCcw,
    ShieldCheck,
    Terminal,
    Trash2,
    Webhook,
} from 'lucide-react';

type ApiKeyStatus = 'active' | 'revoked';
type ApiKeyEnvironment = 'test' | 'live';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    maskedKey: string;
    environment: ApiKeyEnvironment;
    scopes: string[];
    lastUsedAt: string | null;
    createdAt: string;
    status: ApiKeyStatus;
    requestsToday: number;
    errorRate: number;
}

interface ApiResponse<T> {
    success?: boolean;
    data?: T;
}

const API_SCOPES = [
    { id: 'listings:read', label: 'Listings read' },
    { id: 'listings:write', label: 'Listings write' },
    { id: 'campaigns:read', label: 'Campaigns read' },
    { id: 'campaigns:write', label: 'Campaigns write' },
    { id: 'escrow:read', label: 'Escrow read' },
    { id: 'webhooks:write', label: 'Webhooks write' },
];

const DEFAULT_KEYS: ApiKey[] = [
    {
        id: 'demo-live-marketplace',
        name: 'Production marketplace sync',
        prefix: 'mceo_live',
        maskedKey: 'mceo_live_4b9a...f812',
        environment: 'live',
        scopes: ['listings:read', 'campaigns:read', 'escrow:read'],
        lastUsedAt: '2026-05-31T07:26:00.000Z',
        createdAt: '2026-05-12T10:00:00.000Z',
        status: 'active',
        requestsToday: 1284,
        errorRate: 0.3,
    },
    {
        id: 'demo-test-runner',
        name: 'Staging test runner',
        prefix: 'mceo_test',
        maskedKey: 'mceo_test_219c...7de0',
        environment: 'test',
        scopes: ['listings:read', 'listings:write', 'campaigns:read'],
        lastUsedAt: null,
        createdAt: '2026-05-18T14:30:00.000Z',
        status: 'active',
        requestsToday: 0,
        errorRate: 0,
    },
];

const DOCS_URL = import.meta.env.VITE_DOCS_URL || '/documentation';
const API_BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

const buildSecret = (environment: ApiKeyEnvironment): string => {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `mceo_${environment}_${token}`;
};

const normalizeKeys = (payload: ApiResponse<ApiKey[]> | ApiKey[]): ApiKey[] => {
    const rawKeys = Array.isArray(payload) ? payload : payload.data;
    if (!Array.isArray(rawKeys)) return [];

    return rawKeys.map((key) => normalizeKey(key));
};

const normalizeKey = (key: ApiKey): ApiKey => ({
    ...key,
    prefix: key.prefix || key.maskedKey.split('_').slice(0, 2).join('_'),
    maskedKey: key.maskedKey || `${key.prefix}_...`,
    scopes: key.scopes || [],
    lastUsedAt: key.lastUsedAt ?? null,
    status: key.status || 'active',
    requestsToday: key.requestsToday ?? 0,
    errorRate: key.errorRate ?? 0,
});

const unwrapApiKey = (payload: ApiResponse<ApiKey & { secret?: string }> | (ApiKey & { secret?: string })) => {
    const key = 'data' in payload && payload.data ? payload.data : payload as ApiKey & { secret?: string };
    return { ...normalizeKey(key), secret: key.secret };
};

// Dark-mode-safe environment / status tints (no hardcoded hex).
const envTint: Record<ApiKeyEnvironment, string> = {
    live: 'bg-red-500/10 text-red-600 dark:text-red-400',
    test: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};
const statusTint: Record<ApiKeyStatus, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    revoked: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

export const DevPortalPage: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [mode, setMode] = useState<'api' | 'local-demo'>('api');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    // Per-key busy id so rotating one key doesn't disable actions on every row.
    const [pendingKeyId, setPendingKeyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [displayOnceSecret, setDisplayOnceSecret] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'rotate' | 'revoke'; key: ApiKey } | null>(null);
    const [newKeyName, setNewKeyName] = useState('Server integration');
    const [environment, setEnvironment] = useState<ApiKeyEnvironment>('test');
    const [selectedScopes, setSelectedScopes] = useState<string[]>(['listings:read', 'campaigns:read']);

    useEffect(() => {
        let isMounted = true;

        const loadApiKeys = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const payload = await apiGetAuth<ApiResponse<ApiKey[]> | ApiKey[]>('/developers/api-keys');
                if (!isMounted) return;
                const keys = normalizeKeys(payload);
                setApiKeys(keys);
                setMode('api');
            } catch (err) {
                if (!isMounted) return;
                setApiKeys(DEFAULT_KEYS);
                setMode('local-demo');
                setError(err instanceof Error ? err.message : 'Developer API endpoints are not available yet.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadApiKeys();
        return () => {
            isMounted = false;
        };
    }, []);

    // Never leave a live secret sitting in memory / DOM after the page unmounts.
    useEffect(() => () => setDisplayOnceSecret(null), []);

    const activeKeys = useMemo(() => apiKeys.filter((key) => key.status === 'active'), [apiKeys]);
    const totalRequests = useMemo(() => apiKeys.reduce((sum, key) => sum + key.requestsToday, 0), [apiKeys]);

    const handleCopy = async (value: string) => {
        try {
            if (!navigator.clipboard) throw new Error('no clipboard');
            await navigator.clipboard.writeText(value);
            setCopiedValue(value);
            setTimeout(() => setCopiedValue(null), 2000);
        } catch {
            setError('Clipboard access is unavailable in this browser context. Select the value and copy it manually.');
        }
    };

    const toggleScope = (scope: string) => {
        setSelectedScopes((current) =>
            current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
        );
    };

    const createLocalKey = (secret: string): ApiKey => ({
        id: `local-${crypto.randomUUID?.() ?? Math.round(performance.now())}`,
        name: newKeyName.trim() || `${environment === 'live' ? 'Production' : 'Staging'} key`,
        prefix: `mceo_${environment}`,
        maskedKey: `${secret.slice(0, 15)}...${secret.slice(-4)}`,
        environment,
        scopes: selectedScopes,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        status: 'active',
        requestsToday: 0,
        errorRate: 0,
    });

    const handleCreateKey = async () => {
        if (selectedScopes.length === 0) {
            setError('Select at least one scope before creating a key.');
            return;
        }

        setIsSaving(true);
        setError(null);
        setNotice(null);

        try {
            if (mode === 'api') {
                const payload = await apiPost<ApiResponse<ApiKey & { secret?: string }> | (ApiKey & { secret?: string })>('/developers/api-keys', {
                    name: newKeyName.trim(),
                    environment,
                    scopes: selectedScopes,
                });
                const created = unwrapApiKey(payload);
                setApiKeys((current) => [created, ...current]);
                // Only ever surface a secret the backend actually returned — never fabricate one.
                if (created.secret) {
                    setDisplayOnceSecret(created.secret);
                } else {
                    setNotice('Key created. The API did not return a secret to display; retrieve or regenerate it from your provider.');
                }
                setNewKeyName('');
            } else {
                // Explicit local demo mode: the secret is clearly non-persistent.
                const localSecret = buildSecret(environment);
                setApiKeys((current) => [createLocalKey(localSecret), ...current]);
                setDisplayOnceSecret(localSecret);
                setNewKeyName('');
            }
        } catch (err) {
            // In real API mode a failure means nothing was stored — do NOT invent a fake key/secret.
            setError(err instanceof Error ? err.message : 'Unable to create the API key. Nothing was saved — try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRotateKey = async (key: ApiKey) => {
        setPendingKeyId(key.id);
        setError(null);
        setNotice(null);

        try {
            if (mode === 'api') {
                const payload = await apiPost<ApiResponse<ApiKey & { secret?: string }> | (ApiKey & { secret?: string })>(`/developers/api-keys/${key.id}/rotate`, {});
                const rotated = unwrapApiKey(payload);
                setApiKeys((current) => current.map((item) => (item.id === key.id ? rotated : item)));
                if (rotated.secret) {
                    setDisplayOnceSecret(rotated.secret);
                } else {
                    setNotice('Key rotated. The API did not return the new secret to display.');
                }
            } else {
                const localSecret = buildSecret(key.environment);
                setApiKeys((current) =>
                    current.map((item) =>
                        item.id === key.id
                            ? { ...item, maskedKey: `${localSecret.slice(0, 15)}...${localSecret.slice(-4)}`, createdAt: new Date().toISOString() }
                            : item
                    )
                );
                setDisplayOnceSecret(localSecret);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to rotate this key.');
        } finally {
            setPendingKeyId(null);
        }
    };

    const handleRevokeKey = async (key: ApiKey) => {
        setPendingKeyId(key.id);
        setError(null);
        setNotice(null);

        try {
            if (mode === 'api') {
                await apiDelete(`/developers/api-keys/${key.id}`);
            }
            setApiKeys((current) => current.map((item) => (item.id === key.id ? { ...item, status: 'revoked' } : item)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to revoke this key.');
        } finally {
            setPendingKeyId(null);
        }
    };

    const confirmMeta = confirmAction?.type === 'revoke'
        ? {
            title: 'Revoke this API key?',
            description: `“${confirmAction.key.name}” will stop working immediately. Any integration using it will start receiving 401 responses. This cannot be undone.`,
            confirmLabel: 'Revoke key',
            tone: 'danger' as const,
        }
        : confirmAction
            ? {
                title: 'Rotate this API key?',
                description: `A new secret is generated for “${confirmAction.key.name}” and the current one stops working immediately. Update your integration with the new secret right away.`,
                confirmLabel: 'Rotate key',
                tone: 'primary' as const,
            }
            : null;

    return (
        <Layout>
            <div className="space-y-10 pb-20">
                {/* Navy hero — intentionally dark in both themes. */}
                <header className="rounded-3xl bg-[#0f172a] px-6 py-10 text-white sm:px-10">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-sky-300">
                                <Terminal size={15} /> Developer Portal
                            </div>
                            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">API access for marketplace operations</h1>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                                Create scoped keys, rotate secrets, review usage, and connect backend systems to listings, campaigns, escrow, and webhooks.
                            </p>
                        </div>

                        <div className="grid min-w-[260px] grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                            <div>
                                <p className="text-xs text-slate-400">Active keys</p>
                                <p className="mt-1 text-2xl font-black">{formatNumber(activeKeys.length)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Requests today</p>
                                <p className="mt-1 text-2xl font-black">{formatNumber(totalRequests)}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {mode === 'local-demo' && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-800 dark:text-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold">Developer API endpoints are not connected in this environment.</p>
                                <p className="mt-1 text-sm leading-6">
                                    This page is running in explicit local demo mode. Keys created here demonstrate the display-once secret, scope, rotation, revocation, and usage states without persisting secrets to the backend.
                                </p>
                                {error && <p className="mt-2 text-xs font-semibold">Last API error: {error}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'api' && error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/10 p-5 text-error" role="alert">
                        <AlertCircle size={20} className="mt-0.5 shrink-0" />
                        <p className="text-sm font-semibold leading-6">{error}</p>
                    </div>
                )}

                {notice && (
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-5 text-foreground" role="status">
                        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary" />
                        <p className="text-sm font-semibold leading-6">{notice}</p>
                    </div>
                )}

                {displayOnceSecret && (
                    <section
                        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5"
                        role="alert"
                        aria-live="assertive"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 size={18} /> Copy this secret now
                                </p>
                                <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-200/80">
                                    It will not be shown again after you dismiss this panel.
                                </p>
                                <code className="mt-4 block break-all rounded-xl bg-background px-4 py-3 text-sm font-bold text-foreground ring-1 ring-border">
                                    {displayOnceSecret}
                                </code>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleCopy(displayOnceSecret)}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {copiedValue === displayOnceSecret ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                    {copiedValue === displayOnceSecret ? 'Copied' : 'Copy'}
                                </Button>
                                <Button variant="outline" onClick={() => setDisplayOnceSecret(null)}>
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <main className="space-y-8">
                        <section className="rounded-2xl border border-border bg-card p-6">
                            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-foreground">Create API key</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">Use least-privilege scopes and separate test keys from live automation.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                                    <ShieldCheck size={14} /> Secrets display once
                                </span>
                            </div>

                            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_180px]">
                                <div className="space-y-2">
                                    <label htmlFor="api-key-name" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Key name</label>
                                    <input
                                        id="api-key-name"
                                        value={newKeyName}
                                        onChange={(event) => setNewKeyName(event.target.value)}
                                        placeholder="Production backend"
                                        className="h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm font-semibold text-foreground outline-none transition focus:ring-2 focus:ring-primary/25"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="api-key-environment" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Environment</label>
                                    <select
                                        id="api-key-environment"
                                        value={environment}
                                        onChange={(event) => setEnvironment(event.target.value as ApiKeyEnvironment)}
                                        className="h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm font-semibold text-foreground outline-none transition focus:ring-2 focus:ring-primary/25"
                                    >
                                        <option value="test">Test</option>
                                        <option value="live">Live</option>
                                    </select>
                                </div>
                            </div>

                            <fieldset className="mt-6">
                                <legend className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Scopes</legend>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {API_SCOPES.map((scope) => (
                                        <label key={scope.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/70">
                                            <input
                                                type="checkbox"
                                                checked={selectedScopes.includes(scope.id)}
                                                onChange={() => toggleScope(scope.id)}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            {scope.label}
                                        </label>
                                    ))}
                                </div>
                                {selectedScopes.length === 0 && (
                                    <p className="mt-2 text-xs font-semibold text-error">Select at least one scope.</p>
                                )}
                            </fieldset>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    size="lg"
                                    onClick={handleCreateKey}
                                    disabled={isSaving || selectedScopes.length === 0 || !newKeyName.trim()}
                                >
                                    {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Key size={17} />}
                                    Create key
                                </Button>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border bg-card p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-foreground">API keys</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">Rotate live keys on a schedule and revoke unused keys immediately.</p>
                                </div>
                                {isLoading && <Loader2 size={20} className="animate-spin text-muted-foreground" />}
                            </div>

                            <div className="mt-6 space-y-4">
                                {isLoading ? (
                                    <LoadingState title="Loading API keys" variant="skeleton" rows={2} />
                                ) : apiKeys.length === 0 ? (
                                    <EmptyState
                                        icon={Key}
                                        title="No API keys yet"
                                        description="Create your first scoped key above to start calling the marketplace API."
                                    />
                                ) : (
                                    apiKeys.map((key) => {
                                        const rowBusy = pendingKeyId === key.id;
                                        return (
                                            <div key={key.id} className="rounded-2xl border border-border bg-muted p-5">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="font-black text-foreground">{key.name}</h3>
                                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-black uppercase', envTint[key.environment])}>
                                                                {key.environment}
                                                            </span>
                                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-black uppercase', statusTint[key.status])}>
                                                                {key.status}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 break-all font-mono text-sm font-semibold text-muted-foreground">{key.maskedKey}</p>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {key.scopes.map((scope) => (
                                                                <span key={scope} className="rounded-lg bg-card px-2.5 py-1 text-xs font-bold text-muted-foreground">
                                                                    {scope}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setConfirmAction({ type: 'rotate', key })}
                                                            disabled={rowBusy || key.status !== 'active'}
                                                            aria-label={`Rotate ${key.name}`}
                                                            className="hover:text-primary"
                                                        >
                                                            {rowBusy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />} Rotate
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setConfirmAction({ type: 'revoke', key })}
                                                            disabled={rowBusy || key.status === 'revoked'}
                                                            aria-label={`Revoke ${key.name}`}
                                                        >
                                                            <Trash2 size={15} /> Revoke
                                                        </Button>
                                                    </div>
                                                </div>

                                                <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                                                    <div>
                                                        <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Created</dt>
                                                        <dd className="mt-1 font-bold text-foreground">{formatDate(key.createdAt)}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Last used</dt>
                                                        <dd className="mt-1 font-bold text-foreground">{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Usage</dt>
                                                        <dd className="mt-1 font-bold text-foreground">
                                                            {formatNumber(key.requestsToday)} today · {formatPercent(key.errorRate)} errors
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    </main>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-border bg-card p-6">
                            <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
                                <Code2 size={20} className="text-primary" /> API reference
                            </h3>
                            <div className="mt-4 space-y-2">
                                {[
                                    ['Listings API', `${DOCS_URL}/api-reference/listings/create`, true],
                                    ['Campaigns API', `${DOCS_URL}/api-reference/campaigns/create`, true],
                                    ['Escrow API', `${DOCS_URL}/api-reference/escrow/create`, true],
                                    ['In-app docs', '/documentation', false],
                                ].map(([label, href, external]) =>
                                    external ? (
                                        <a
                                            key={href as string}
                                            href={href as string}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground transition hover:text-primary"
                                        >
                                            {label}
                                            <ExternalLink size={15} />
                                        </a>
                                    ) : (
                                        <Link
                                            key={href as string}
                                            to={href as string}
                                            className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground transition hover:text-primary"
                                        >
                                            {label}
                                            <ExternalLink size={15} />
                                        </Link>
                                    )
                                )}
                            </div>
                        </section>

                        {/* Terminal panel — intentionally dark in both themes. */}
                        <section className="rounded-2xl bg-slate-900 p-6 text-white">
                            <h3 className="flex items-center gap-2 text-lg font-black">
                                <Package size={20} className="text-sky-300" /> SDK quick start
                            </h3>
                            <div className="mt-5 space-y-4">
                                {[
                                    'npm install @myappceo/sdk',
                                    `MYAPPCEO_API_URL=${API_BASE_URL}`,
                                    'MYAPPCEO_API_KEY=mceo_test_...',
                                ].map((snippet) => (
                                    <button
                                        key={snippet}
                                        type="button"
                                        onClick={() => handleCopy(snippet)}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-left font-mono text-xs text-slate-200 transition hover:bg-black/50"
                                    >
                                        <code className="truncate">{snippet}</code>
                                        {copiedValue === snippet ? <CheckCircle2 size={14} className="text-emerald-300" /> : <Copy size={14} className="text-slate-500" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border bg-card p-6">
                            <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
                                <Webhook size={20} className="text-primary" /> Webhook events
                            </h3>
                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                {['listing.created', 'listing.sold', 'campaign.funded', 'investment.created', 'escrow.released'].map((event) => (
                                    <div key={event} className="rounded-xl bg-muted px-4 py-3 font-mono font-semibold">
                                        {event}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border bg-card p-6">
                            <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
                                <Activity size={20} className="text-primary" /> Release note
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Production release requires backend persistence for key hashes, display-once secret generation, audit events, and rate-limit counters.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>

            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => !open && setConfirmAction(null)}
                title={confirmMeta?.title ?? ''}
                description={confirmMeta?.description}
                confirmLabel={confirmMeta?.confirmLabel}
                tone={confirmMeta?.tone}
                loading={pendingKeyId !== null}
                onConfirm={() => {
                    if (!confirmAction) return;
                    const { type, key } = confirmAction;
                    setConfirmAction(null);
                    if (type === 'revoke') handleRevokeKey(key);
                    else handleRotateKey(key);
                }}
            />
        </Layout>
    );
};
