import React, { useEffect, useRef, useState } from 'react';
import {
    Apple,
    Loader2,
    UploadCloud,
    FileCheck2,
    AlertTriangle,
    Lock,
    ExternalLink,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button,
} from '../ui';
import { AppStoreConnection, AppStoreCredentials, useAppStoreConnect } from '../../hooks/useAppStoreConnect';

interface AppStoreConnectModalProps {
    open: boolean;
    appId: string;
    appName?: string;
    /** Existing connection, when re-configuring rather than connecting fresh. */
    existing?: AppStoreConnection | null;
    onClose: () => void;
    onConnected: (connection: AppStoreConnection) => void;
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const KEY_ID_RE = /^[A-Z0-9]{10}$/i;
const PEM_MARKER = 'BEGIN PRIVATE KEY';
const KEYS_URL = 'https://appstoreconnect.apple.com/access/integrations/api';

const fieldClass =
    'w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

type FieldErrors = Partial<Record<'issuerId' | 'keyId' | 'privateKey' | 'vendorNumber', string>>;

export const AppStoreConnectModal: React.FC<AppStoreConnectModalProps> = ({
    open,
    appId,
    appName,
    existing,
    onClose,
    onConnected,
}) => {
    const { connect } = useAppStoreConnect();

    const [issuerId, setIssuerId] = useState('');
    const [keyId, setKeyId] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [keyFileName, setKeyFileName] = useState<string | null>(null);
    const [vendorNumber, setVendorNumber] = useState('');

    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const firstFieldRef = useRef<HTMLInputElement>(null);

    // Reset the form each time the modal opens; prefill non-secret fields when
    // re-configuring (the private key is never returned, so it stays blank).
    useEffect(() => {
        if (!open) return;
        setIssuerId(existing?.issuerId ?? '');
        setKeyId(existing?.keyId ?? '');
        setVendorNumber(existing?.vendorNumber ?? '');
        setPrivateKey('');
        setKeyFileName(null);
        setErrors({});
        setFormError(null);
        setSubmitting(false);
        const t = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
        return () => window.clearTimeout(t);
    }, [open, existing]);

    const readKeyFile = async (file: File) => {
        if (!/\.p8$/i.test(file.name)) {
            setErrors((e) => ({ ...e, privateKey: 'Select the .p8 key file you downloaded from Apple.' }));
            return;
        }
        try {
            const text = await file.text();
            if (!text.includes(PEM_MARKER)) {
                setErrors((e) => ({ ...e, privateKey: "That file doesn't look like a valid .p8 private key." }));
                return;
            }
            setPrivateKey(text);
            setKeyFileName(file.name);
            setErrors((e) => ({ ...e, privateKey: undefined }));
        } catch {
            setErrors((e) => ({ ...e, privateKey: 'Could not read that file. Try again.' }));
        }
    };

    const validate = (): boolean => {
        const next: FieldErrors = {};
        if (!UUID_RE.test(issuerId.trim())) next.issuerId = 'Issuer ID must be a UUID (from Users and Access → Integrations).';
        if (!KEY_ID_RE.test(keyId.trim())) next.keyId = 'Key ID is the 10-character ID next to your API key.';
        if (!privateKey.includes(PEM_MARKER)) next.privateKey = 'Upload the .p8 private key file for this API key.';
        if (vendorNumber.trim() && !/^\d{5,}$/.test(vendorNumber.trim())) next.vendorNumber = 'Vendor number is numeric (optional).';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!validate()) return;

        setSubmitting(true);
        const credentials: AppStoreCredentials = { issuerId, keyId, privateKey, vendorNumber };
        const res = await connect(appId, credentials);
        setSubmitting(false);

        // `res` is the ApiResponse envelope (or null if the request threw).
        if (res?.success && res.data) {
            onConnected(res.data);
        } else if (res && !('success' in res) && (res as AppStoreConnection).id) {
            // Backend returned the connection object directly (no envelope).
            onConnected(res as unknown as AppStoreConnection);
        } else {
            // The typed envelope only models the success case; a failed response
            // may still carry an error/message at runtime, so read them defensively.
            const failure = res as { error?: string; message?: string } | null;
            setFormError(
                failure?.error ||
                    failure?.message ||
                    'Apple rejected these credentials. Double-check the Issuer ID, Key ID, and that the .p8 matches.',
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <X size={16} className="text-muted-foreground" />
                </button>

                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-foreground/5 flex items-center justify-center">
                            <Apple size={22} className="text-foreground" />
                        </div>
                        <div>
                            <DialogTitle>Connect App Store Connect</DialogTitle>
                            <DialogDescription>
                                {appName ? `Import iOS metrics into ${appName}.` : 'Import iOS downloads, ratings, and reviews.'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* How-to */}
                <div className="mt-5 rounded-xl bg-primary/5 border border-primary/10 p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">Where do I find these?</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
                        <li>In App Store Connect, open <span className="font-medium text-foreground">Users and Access → Integrations → App Store Connect API</span>.</li>
                        <li>Copy the <span className="font-medium text-foreground">Issuer ID</span>, generate a key (Admin or App Manager role), and copy its <span className="font-medium text-foreground">Key ID</span>.</li>
                        <li>Download the <span className="font-medium text-foreground">.p8</span> key file — Apple lets you download it once.</li>
                    </ol>
                    <a
                        href={KEYS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                        Open App Store Connect keys <ExternalLink size={12} />
                    </a>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                    {/* Issuer ID */}
                    <div>
                        <label htmlFor="asc-issuer" className="block text-xs font-bold text-foreground mb-1.5">Issuer ID</label>
                        <input
                            id="asc-issuer"
                            ref={firstFieldRef}
                            value={issuerId}
                            onChange={(e) => setIssuerId(e.target.value)}
                            placeholder="57246542-96fe-1a63-e053-0824d011072a"
                            className={fieldClass}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={!!errors.issuerId}
                        />
                        {errors.issuerId && <p className="mt-1 text-xs text-error">{errors.issuerId}</p>}
                    </div>

                    {/* Key ID + Vendor number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="asc-keyid" className="block text-xs font-bold text-foreground mb-1.5">Key ID</label>
                            <input
                                id="asc-keyid"
                                value={keyId}
                                onChange={(e) => setKeyId(e.target.value.toUpperCase())}
                                placeholder="2X9R4HXF34"
                                maxLength={10}
                                className={`${fieldClass} font-mono tracking-wide`}
                                autoComplete="off"
                                spellCheck={false}
                                aria-invalid={!!errors.keyId}
                            />
                            {errors.keyId && <p className="mt-1 text-xs text-error">{errors.keyId}</p>}
                        </div>
                        <div>
                            <label htmlFor="asc-vendor" className="block text-xs font-bold text-foreground mb-1.5">
                                Vendor No. <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <input
                                id="asc-vendor"
                                value={vendorNumber}
                                onChange={(e) => setVendorNumber(e.target.value.replace(/[^\d]/g, ''))}
                                placeholder="88123456"
                                inputMode="numeric"
                                className={`${fieldClass} font-mono tracking-wide`}
                                autoComplete="off"
                                aria-invalid={!!errors.vendorNumber}
                            />
                            {errors.vendorNumber && <p className="mt-1 text-xs text-error">{errors.vendorNumber}</p>}
                        </div>
                    </div>

                    {/* Private key upload */}
                    <div>
                        <label className="block text-xs font-bold text-foreground mb-1.5">Private key (.p8)</label>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full rounded-xl border border-dashed px-4 py-4 flex items-center gap-3 text-left transition-all ${
                                keyFileName
                                    ? 'border-emerald-500/40 bg-emerald-500/5'
                                    : errors.privateKey
                                        ? 'border-error/50 bg-error/5'
                                        : 'border-border bg-muted/30 hover:bg-muted/50'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${keyFileName ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                                {keyFileName ? <FileCheck2 size={18} className="text-emerald-600 dark:text-emerald-400" /> : <UploadCloud size={18} className="text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                                {keyFileName ? (
                                    <>
                                        <p className="text-sm font-semibold text-foreground truncate">{keyFileName}</p>
                                        <p className="text-xs text-muted-foreground">Key loaded — ready to connect.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-foreground">Upload AuthKey_XXXXXXXXXX.p8</p>
                                        <p className="text-xs text-muted-foreground">The key file you downloaded from Apple.</p>
                                    </>
                                )}
                            </div>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".p8"
                            className="sr-only"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) readKeyFile(file);
                                e.target.value = '';
                            }}
                        />
                        {errors.privateKey && <p className="mt-1 text-xs text-error">{errors.privateKey}</p>}
                    </div>

                    {/* Security note */}
                    <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                        <Lock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Your key is sent once over an encrypted connection, stored encrypted on our servers, and never exposed to the browser again. Revoke it any time in App Store Connect.
                        </p>
                    </div>

                    {formError && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-error/10 text-error rounded-xl text-xs font-medium" role="alert">
                            <AlertTriangle size={14} className="shrink-0" /> {formError}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="rounded-xl font-bold inline-flex items-center gap-2">
                            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Apple size={15} />}
                            {existing ? 'Update connection' : 'Connect'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
