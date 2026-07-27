import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Upload, Sparkles, DollarSign, TrendingUp, ShieldCheck,
    Loader2, AlertCircle, Trash2, Image as ImageIcon, X,
} from 'lucide-react';
import { ListingCard } from '../components/ListingCard';
import { useMarketplace } from '../hooks/useMarketplace';
import { useAI } from '../hooks/useAI';
import { FormField, Select, Skeleton, ErrorState } from '../components/ui';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency } from '../utils/format';

const CATEGORIES = ['SaaS', 'AI Tool', 'Game', 'Mobile App'];

const TECH_STACK_OPTIONS = [
    'React', 'Vue', 'Next.js', 'Node.js', 'Python', 'Django', 'FastAPI', 'Go',
    'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'GCP', 'Azure', 'Docker',
    'Kubernetes', 'Supabase', 'Firebase',
];

const LISTING_TYPE_OPTIONS = [
    { value: 'sale', title: 'For Sale', body: 'Sell 100% of ownership.', icon: DollarSign },
    { value: 'investment', title: 'Investment', body: 'Raise capital for equity.', icon: TrendingUp },
    { value: 'both', title: 'Sale + Investment', body: 'Accept acquisition and investment offers.', icon: ShieldCheck },
];

const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20';

export const EditListingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'SaaS',
        shortDescription: '',
        description: '',
        imageUrl: '',
        screenshots: [] as string[],
        demoVideoUrl: '',
        appStoreUrl: '',
        playStoreUrl: '',
        storeMetadata: {} as Record<string, any>,
        techStack: [] as string[],
        repositoryUrl: '',
        documentationUrl: '',
        listingType: 'sale' as 'sale' | 'investment' | 'both',
        askingPrice: '',
        minimumOffer: '',
        targetRaise: '',
        equityAvailable: '',
        monthlyRevenue: '',
        ageMonths: '12',
        totalUsers: '1000',
        revenueVerified: false,
        trafficMetrics: { monthlyVisitors: '', bounceRate: '', avgSessionDuration: '' },
        unitEconomics: { cac: '', ltv: '', mrrChurn: '' },
        handoverReadiness: { hostingProvider: '', domainRegistrar: '', hasDbSchema: false, hasSop: false },
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const navigate = useNavigate();
    const { getListingById, updateListing, deleteListing, uploadImage, error: apiError } = useMarketplace();
    const { getValuationSuggestion, isLoading: aiLoading } = useAI();

    useEffect(() => {
        fetchListing();
    }, [id]);

    const fetchListing = async () => {
        if (!id) return;
        setLoading(true);
        setLoadError(false);
        const result = await getListingById(id);
        if (result.success && result.data) {
            const listing = result.data.data;
            const tech = Array.isArray(listing.techStack)
                ? listing.techStack
                : typeof listing.techStack === 'string' && listing.techStack
                    ? listing.techStack.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : [];
            setFormData({
                name: listing.name || '',
                category: listing.category || 'SaaS',
                shortDescription: listing.shortDescription || '',
                description: listing.longDescription || '',
                imageUrl: listing.imageUrl || '',
                screenshots: listing.screenshots || [],
                demoVideoUrl: listing.demoVideoUrl || '',
                appStoreUrl: listing.appStoreUrl || '',
                playStoreUrl: listing.playStoreUrl || '',
                storeMetadata: listing.storeMetadata || {},
                techStack: tech,
                repositoryUrl: listing.repositoryUrl || '',
                documentationUrl: listing.documentationUrl || '',
                listingType: (listing.listingType as 'sale' | 'investment' | 'both') || 'sale',
                askingPrice: listing.askingPrice?.toString() || '',
                minimumOffer: (listing as any).minimumOffer?.toString() || '',
                targetRaise: listing.targetRaise?.toString() || '',
                equityAvailable: listing.equityAvailable?.toString() || '',
                monthlyRevenue: listing.monthlyRevenue?.toString() || '',
                ageMonths: (listing.ageMonths ?? 12).toString(),
                totalUsers: (listing.totalUsers ?? 1000).toString(),
                revenueVerified: listing.revenueVerified || false,
                trafficMetrics: {
                    monthlyVisitors: listing.trafficMetrics?.monthlyVisitors?.toString() || '',
                    bounceRate: listing.trafficMetrics?.bounceRate?.toString() || '',
                    avgSessionDuration: listing.trafficMetrics?.avgSessionDuration?.toString() || '',
                },
                unitEconomics: {
                    cac: listing.unitEconomics?.cac?.toString() || '',
                    ltv: listing.unitEconomics?.ltv?.toString() || '',
                    mrrChurn: listing.unitEconomics?.mrrChurn?.toString() || '',
                },
                handoverReadiness: {
                    hostingProvider: listing.handoverReadiness?.hostingProvider || '',
                    domainRegistrar: listing.handoverReadiness?.domainRegistrar || '',
                    hasDbSchema: listing.handoverReadiness?.hasDbSchema || false,
                    hasSop: listing.handoverReadiness?.hasSop || false,
                },
            });
        } else {
            setLoadError(true);
        }
        setLoading(false);
    };

    const updateForm = (key: string, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

    const updateNestedForm = (parent: string, key: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [parent]: { ...(prev[parent as keyof typeof prev] as Record<string, any>), [key]: value },
        }));
    };

    const toggleTechStack = (tech: string) => {
        setFormData((prev) => ({
            ...prev,
            techStack: prev.techStack.includes(tech)
                ? prev.techStack.filter((t) => t !== tech)
                : [...prev.techStack, tech],
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingImage(true);
            const result = await uploadImage(file);
            if (result.success && result.data) {
                updateForm('imageUrl', result.data.data.url);
            }
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        try {
            setUploadingScreenshots(true);
            const selected = Array.from(files);
            if (formData.screenshots.length + selected.length > 8) {
                setFormError('Listings support up to 8 screenshots.');
                return;
            }
            const results = await Promise.all(selected.map((file) => uploadImage(file)));
            const urls = results.filter((r) => r.success && r.data?.data).map((r) => r.data!.data.url);
            setFormData((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...urls] }));
        } catch (err) {
            console.error('Screenshot upload failed', err);
        } finally {
            setUploadingScreenshots(false);
        }
    };

    const removeScreenshot = (index: number) => {
        setFormData((prev) => ({ ...prev, screenshots: prev.screenshots.filter((_, i) => i !== index) }));
    };

    const handleSuggestValuation = async () => {
        if (!formData.monthlyRevenue || !formData.name) return;
        const result = await getValuationSuggestion({
            name: formData.name,
            category: formData.category,
            monthlyRevenue: parseFloat(formData.monthlyRevenue),
            description: formData.description,
        });
        if (result?.success && result.data) {
            updateForm('askingPrice', result.data.suggestedPrice.toString());
            setAiInsight(result.data.insight);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        const wantsSale = formData.listingType === 'sale' || formData.listingType === 'both';
        if (wantsSale && formData.minimumOffer && Number(formData.minimumOffer) > Number(formData.askingPrice || 0)) {
            setFormError('Minimum offer cannot be greater than the asking price.');
            return;
        }
        setIsSubmitting(true);
        // Round-trip the FULL field set — correct short vs long description mapping.
        const payload = {
            ...formData,
            shortDescription: formData.shortDescription,
            longDescription: formData.description,
            screenshots: formData.screenshots.slice(0, 8),
        };
        delete (payload as any).description;
        const result = await updateListing(id!, payload as any);
        setIsSubmitting(false);
        if (result.success) {
            navigate('/manage-listings');
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        const result = await deleteListing(id);
        setDeleting(false);
        if (result.success) {
            navigate('/manage-listings');
        }
    };

    const previewListing = {
        id: id || 'preview',
        sellerId: 'you',
        name: formData.name || 'Your App Name',
        category: formData.category,
        shortDescription: formData.shortDescription || (formData.description ? formData.description.slice(0, 100) : 'A compelling summary...'),
        longDescription: formData.description,
        imageUrl: formData.imageUrl,
        listingType: formData.listingType,
        askingPrice: formData.askingPrice ? parseInt(formData.askingPrice) : null,
        targetRaise: formData.targetRaise ? parseInt(formData.targetRaise) : null,
        equityAvailable: formData.listingType !== 'sale' ? (formData.equityAvailable ? parseInt(formData.equityAvailable) : 15) : null,
        monthlyRevenue: formData.monthlyRevenue ? parseInt(formData.monthlyRevenue) : 0,
        revenueVerified: formData.revenueVerified,
        ageMonths: parseInt(formData.ageMonths) || 0,
        totalUsers: parseInt(formData.totalUsers) || 0,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
    };

    const wantsSale = formData.listingType === 'sale' || formData.listingType === 'both';
    const wantsInvestment = formData.listingType === 'investment' || formData.listingType === 'both';

    if (loading) {
        return (
            <Layout>
                <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-20 pt-12">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <div className="flex flex-col gap-12 lg:flex-row">
                        <div className="flex-1 space-y-4">
                            <Skeleton className="h-80 w-full rounded-2xl" />
                            <Skeleton className="h-96 w-full rounded-2xl" />
                        </div>
                        <Skeleton className="h-96 w-full rounded-2xl lg:w-[400px]" />
                    </div>
                </div>
            </Layout>
        );
    }

    if (loadError) {
        return (
            <Layout>
                <div className="mx-auto max-w-2xl px-4 py-20">
                    <ErrorState
                        title="Listing not found"
                        description="We couldn't load this listing. It may have been removed."
                        action={{ label: 'Retry', onClick: () => fetchListing() }}
                        secondaryAction={{ label: 'Back to Listings', href: '/manage-listings' }}
                    />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mx-auto max-w-[1280px] px-4 pb-20 pt-12">
                <div className="flex flex-col gap-12 lg:flex-row">
                    <div className="flex-1 space-y-8">
                        <header className="space-y-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-2">
                                    <Link to="/manage-listings" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
                                        <ArrowLeft size={14} /> Back to Listings
                                    </Link>
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Edit Listing</h1>
                                    <p className="font-medium text-muted-foreground">Update your listing details. Changes will be reviewed before going live.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDeleteOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </header>

                        {apiError && (
                            <div className="flex gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-medium text-error" role="alert">
                                <AlertCircle size={18} className="shrink-0" />
                                <p>{apiError}</p>
                            </div>
                        )}
                        {formError && (
                            <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm font-medium text-warning" role="alert">
                                <AlertCircle size={18} className="shrink-0" />
                                <p>{formError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Identity */}
                            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                                <h2 className="text-xl font-bold text-foreground">Basic Identity</h2>
                                <FormField label="App name" required>
                                    {({ id: fid }) => (
                                        <input id={fid} required type="text" value={formData.name} onChange={(e) => updateForm('name', e.target.value)} className={inputClass} />
                                    )}
                                </FormField>
                                <Select
                                    label="Category"
                                    value={formData.category}
                                    onValueChange={(v) => updateForm('category', v)}
                                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                                    placeholder="Select a category"
                                />
                                <FormField label="Short summary" description="One-line summary shown on marketplace cards.">
                                    {({ id: fid }) => (
                                        <input id={fid} type="text" value={formData.shortDescription} onChange={(e) => updateForm('shortDescription', e.target.value)} placeholder="One-line store summary" className={inputClass} />
                                    )}
                                </FormField>
                                <FormField label="Full description" required>
                                    {({ id: fid }) => (
                                        <textarea id={fid} required rows={4} value={formData.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Describe what your project does..." className={`${inputClass} resize-none`} />
                                    )}
                                </FormField>
                            </section>

                            {/* Media & Tech */}
                            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                                <h2 className="text-xl font-bold text-foreground">Media & Tech</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <span className="block text-sm font-semibold text-foreground">Cover image</span>
                                        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                                            {formData.imageUrl ? (
                                                <img src={formData.imageUrl} alt="Cover" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                                    <ImageIcon size={28} />
                                                    <span className="text-sm">Upload cover image</span>
                                                </div>
                                            )}
                                            {uploadingImage && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                                                    <Loader2 size={24} className="animate-spin text-primary" />
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleFileChange} aria-label="Upload cover image" className="absolute inset-0 cursor-pointer opacity-0" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <FormField label="Demo video URL">
                                            {({ id: fid }) => (
                                                <input id={fid} type="url" value={formData.demoVideoUrl} onChange={(e) => updateForm('demoVideoUrl', e.target.value)} placeholder="https://youtube.com/..." className={inputClass} />
                                            )}
                                        </FormField>
                                        <FormField label="App Store URL">
                                            {({ id: fid }) => (
                                                <input id={fid} type="url" value={formData.appStoreUrl} onChange={(e) => updateForm('appStoreUrl', e.target.value)} placeholder="https://apps.apple.com/..." className={inputClass} />
                                            )}
                                        </FormField>
                                        <FormField label="Play Store URL">
                                            {({ id: fid }) => (
                                                <input id={fid} type="url" value={formData.playStoreUrl} onChange={(e) => updateForm('playStoreUrl', e.target.value)} placeholder="https://play.google.com/..." className={inputClass} />
                                            )}
                                        </FormField>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="block text-sm font-semibold text-foreground">Screenshots ({formData.screenshots.length}/8)</span>
                                    <div className="flex flex-wrap gap-3">
                                        {formData.screenshots.map((url, i) => (
                                            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                                                <img src={url} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeScreenshot(i)}
                                                    aria-label={`Remove screenshot ${i + 1}`}
                                                    className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-foreground shadow hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                                            {uploadingScreenshots ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                            <input type="file" accept="image/*" multiple onChange={handleScreenshotChange} aria-label="Upload screenshots" className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="block text-sm font-semibold text-foreground">Tech stack</span>
                                    <div className="flex flex-wrap gap-2">
                                        {TECH_STACK_OPTIONS.map((tech) => (
                                            <button
                                                key={tech}
                                                type="button"
                                                onClick={() => toggleTechStack(tech)}
                                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                                    formData.techStack.includes(tech) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {tech}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <FormField label="Repository URL">
                                        {({ id: fid }) => (
                                            <input id={fid} type="url" value={formData.repositoryUrl} onChange={(e) => updateForm('repositoryUrl', e.target.value)} placeholder="https://github.com/..." className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="Documentation URL">
                                        {({ id: fid }) => (
                                            <input id={fid} type="url" value={formData.documentationUrl} onChange={(e) => updateForm('documentationUrl', e.target.value)} placeholder="https://docs..." className={inputClass} />
                                        )}
                                    </FormField>
                                </div>
                            </section>

                            {/* Financials */}
                            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                                <h2 className="text-xl font-bold text-foreground">Financials</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <FormField label="Monthly revenue (₦)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.monthlyRevenue} onChange={(e) => updateForm('monthlyRevenue', e.target.value)} placeholder="0" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="Total users">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.totalUsers} onChange={(e) => updateForm('totalUsers', e.target.value)} placeholder="1000" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="App age (months)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.ageMonths} onChange={(e) => updateForm('ageMonths', e.target.value)} placeholder="12" className={inputClass} />
                                        )}
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <FormField label="Monthly visitors">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.trafficMetrics.monthlyVisitors} onChange={(e) => updateNestedForm('trafficMetrics', 'monthlyVisitors', e.target.value)} placeholder="5000" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="Bounce rate (%)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.trafficMetrics.bounceRate} onChange={(e) => updateNestedForm('trafficMetrics', 'bounceRate', e.target.value)} placeholder="45" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="Avg session (min)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.trafficMetrics.avgSessionDuration} onChange={(e) => updateNestedForm('trafficMetrics', 'avgSessionDuration', e.target.value)} placeholder="3.5" className={inputClass} />
                                        )}
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <FormField label="CAC (₦)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.unitEconomics.cac} onChange={(e) => updateNestedForm('unitEconomics', 'cac', e.target.value)} placeholder="25" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="LTV (₦)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.unitEconomics.ltv} onChange={(e) => updateNestedForm('unitEconomics', 'ltv', e.target.value)} placeholder="150" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="MRR churn (%)">
                                        {({ id: fid }) => (
                                            <input id={fid} type="number" value={formData.unitEconomics.mrrChurn} onChange={(e) => updateNestedForm('unitEconomics', 'mrrChurn', e.target.value)} placeholder="2.5" className={inputClass} />
                                        )}
                                    </FormField>
                                </div>
                            </section>

                            {/* Handover readiness */}
                            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                                <h2 className="text-xl font-bold text-foreground">Handover Readiness</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <FormField label="Hosting provider">
                                        {({ id: fid }) => (
                                            <input id={fid} type="text" value={formData.handoverReadiness.hostingProvider} onChange={(e) => updateNestedForm('handoverReadiness', 'hostingProvider', e.target.value)} placeholder="e.g. Vercel, AWS" className={inputClass} />
                                        )}
                                    </FormField>
                                    <FormField label="Domain registrar">
                                        {({ id: fid }) => (
                                            <input id={fid} type="text" value={formData.handoverReadiness.domainRegistrar} onChange={(e) => updateNestedForm('handoverReadiness', 'domainRegistrar', e.target.value)} placeholder="e.g. Namecheap" className={inputClass} />
                                        )}
                                    </FormField>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                                        <input type="checkbox" checked={formData.handoverReadiness.hasDbSchema} onChange={(e) => updateNestedForm('handoverReadiness', 'hasDbSchema', e.target.checked)} className="h-4 w-4 accent-primary" />
                                        Database schema documented
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                                        <input type="checkbox" checked={formData.handoverReadiness.hasSop} onChange={(e) => updateNestedForm('handoverReadiness', 'hasSop', e.target.checked)} className="h-4 w-4 accent-primary" />
                                        Standard operating procedures ready
                                    </label>
                                </div>
                            </section>

                            {/* Deal terms */}
                            <section className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                                <h2 className="text-xl font-bold text-foreground">Deal Terms</h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {LISTING_TYPE_OPTIONS.map((option) => {
                                        const Icon = option.icon;
                                        const selected = formData.listingType === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateForm('listingType', option.value)}
                                                className={`rounded-2xl border p-5 text-left transition-all ${
                                                    selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'
                                                }`}
                                            >
                                                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <p className="font-semibold text-foreground">{option.title}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{option.body}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {wantsSale && (
                                        <>
                                            <FormField label="Asking price (₦)">
                                                {({ id: fid }) => (
                                                    <div className="space-y-2">
                                                        <input id={fid} type="number" value={formData.askingPrice} onChange={(e) => updateForm('askingPrice', e.target.value)} placeholder="50000" className={inputClass} />
                                                        {formData.monthlyRevenue && (
                                                            <button type="button" onClick={handleSuggestValuation} disabled={aiLoading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50">
                                                                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Suggest
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </FormField>
                                            <FormField label="Minimum offer (₦)" description="Must be at or below the asking price.">
                                                {({ id: fid }) => (
                                                    <input id={fid} type="number" value={formData.minimumOffer} onChange={(e) => updateForm('minimumOffer', e.target.value)} placeholder="25000" className={inputClass} />
                                                )}
                                            </FormField>
                                        </>
                                    )}
                                    {wantsInvestment && (
                                        <>
                                            <FormField label="Target raise (₦)">
                                                {({ id: fid }) => (
                                                    <input id={fid} type="number" value={formData.targetRaise} onChange={(e) => updateForm('targetRaise', e.target.value)} placeholder="100000" className={inputClass} />
                                                )}
                                            </FormField>
                                            <FormField label="Equity available (%)">
                                                {({ id: fid }) => (
                                                    <input id={fid} type="number" value={formData.equityAvailable} onChange={(e) => updateForm('equityAvailable', e.target.value)} placeholder="15" className={inputClass} />
                                                )}
                                            </FormField>
                                        </>
                                    )}
                                </div>

                                {aiInsight && (
                                    <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">
                                        <Sparkles size={18} className="shrink-0 text-primary" />
                                        <p>{aiInsight}</p>
                                    </div>
                                )}
                            </section>

                            <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
                                <button type="button" onClick={() => navigate('/manage-listings')} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                                    <ArrowLeft size={16} /> Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="shrink-0 lg:w-[400px]">
                        <div className="sticky top-28 space-y-4">
                            <h3 className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Preview</h3>
                            <ListingCard listing={previewListing as any} href="#" showWatchlist={false} />
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete listing?"
                description="This listing will be permanently removed from the marketplace. Any pending offers will be automatically declined. This action cannot be undone."
                confirmLabel="Delete Listing"
                tone="danger"
                loading={deleting}
                onConfirm={handleDelete}
            />
        </Layout>
    );
};
