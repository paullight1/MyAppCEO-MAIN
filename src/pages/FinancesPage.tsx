import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    Download,
    Calendar,
    Wallet,
    Loader2,
    CheckCircle2,
    Circle,
    AlertTriangle,
    CreditCard,
    ExternalLink,
    RefreshCw,
    ShieldCheck,
    FileText,
    Percent,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFinances, FinanceData } from '../hooks/useFinances';
import {
    usePayments,
    StripeConnectAccount,
    PayoutReadiness,
    RevenueVerificationResult,
    RevenueEvidenceInput,
} from '../hooks/usePayments';
import { formatCurrency, formatPercent } from '../utils/format';
import { downloadCsv } from '../utils/exportCsv';
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    ChartCard,
    BreakdownList,
    ThemedTooltip,
    seriesColor,
    chartTheme,
    LoadingState,
    ErrorState,
    EmptyState,
    StatTile,
    ConfirmDialog,
    FormField,
    Select,
} from '../components/ui';

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'YTD', '12M'] as const;
const CURRENCIES = ['NGN', 'USD', 'EUR'] as const;

/** Platform take-rate on marketplace payouts. */
const PLATFORM_FEE_PCT = 10;

const EMPTY_FINANCE_DATA: FinanceData = {
    summary: [],
    stakes: [],
    currency: 'NGN',
    metrics: {
        totalRevenue: 0,
        totalRevenueChange: 0,
        portfolioValue: 0,
        portfolioValueChange: 0,
        netProfit: 0,
        netProfitChange: 0,
        dividendsEarned: 0,
        dividendsEarnedChange: 0,
    },
    revenueBySource: [],
};

function StatusBadge({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <span
            className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ' +
                (enabled
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground')
            }
        >
            {enabled ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
                <Circle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {label}
        </span>
    );
}

export const FinancesPage: React.FC = () => {
    const [data, setData] = useState<FinanceData | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('Q1');
    const [currency, setCurrency] = useState<string>('NGN');
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const { getFinancesDashboard, isLoading, error } = useFinances();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Stripe Connect / payouts — handled locally so it never blocks the page.
    const {
        connectStripe,
        getStripeConnectStatus,
        refreshStripeAccount,
        getPayoutReadiness,
        verifyRevenue,
        submitRevenueEvidence,
        getRevenueVerification,
        isLoading: paymentsLoading,
        error: paymentsError,
    } = usePayments();
    const [stripeStatus, setStripeStatus] = useState<StripeConnectAccount | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Payout readiness + revenue verification are keyed by a listing. Drive the
    // selector off the stakes the page already loads.
    const [selectedListingId, setSelectedListingId] = useState('');
    const [payoutReadiness, setPayoutReadiness] = useState<PayoutReadiness | null>(null);
    const [revenueVerification, setRevenueVerification] = useState<RevenueVerificationResult | null>(null);
    const [verifying, setVerifying] = useState(false);

    // Evidence submission dialog.
    const [evidenceOpen, setEvidenceOpen] = useState(false);
    const [submittingEvidence, setSubmittingEvidence] = useState(false);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);
    const [evidenceForm, setEvidenceForm] = useState<{
        evidenceUrl: string;
        provider: NonNullable<RevenueEvidenceInput['provider']>;
        notes: string;
    }>({ evidenceUrl: '', provider: 'manual', notes: '' });

    useEffect(() => {
        fetchData();
    }, [selectedPeriod, currency]);

    useEffect(() => {
        let active = true;
        getStripeConnectStatus().then((res) => {
            if (active && res?.success) setStripeStatus(res.data);
        });
        return () => {
            active = false;
        };
    }, []);

    // Default the payout-tools listing selector to the first holding.
    useEffect(() => {
        if (!selectedListingId && data?.stakes.length) {
            setSelectedListingId(data.stakes[0].listingId);
        }
    }, [data, selectedListingId]);

    // Load payout readiness + revenue verification for the selected listing.
    useEffect(() => {
        if (!selectedListingId) {
            setPayoutReadiness(null);
            setRevenueVerification(null);
            return;
        }
        let active = true;
        getPayoutReadiness(selectedListingId).then((res) => {
            if (active && res?.success) setPayoutReadiness(res.data);
        });
        getRevenueVerification(selectedListingId).then((res) => {
            if (active && res?.success) setRevenueVerification(res.data);
        });
        return () => {
            active = false;
        };
    }, [selectedListingId]);

    const fetchData = async () => {
        setLoadFailed(false);
        const result = await getFinancesDashboard(getPeriodRange(selectedPeriod, currency));
        if (result.success && result.data?.data) {
            setData({ ...result.data.data, currency: result.data.data.currency || currency });
        } else {
            setData({ ...EMPTY_FINANCE_DATA, currency });
            setLoadFailed(true);
        }
    };

    const getPeriodRange = (period: string, selectedCurrency: string) => {
        const now = new Date();
        const year = now.getFullYear();
        const ranges: Record<string, [Date, Date]> = {
            Q1: [new Date(year, 0, 1), new Date(year, 2, 31)],
            Q2: [new Date(year, 3, 1), new Date(year, 5, 30)],
            Q3: [new Date(year, 6, 1), new Date(year, 8, 30)],
            Q4: [new Date(year, 9, 1), new Date(year, 11, 31)],
            YTD: [new Date(year, 0, 1), now],
            '12M': [new Date(year - 1, now.getMonth(), now.getDate()), now],
        };
        const [startDate, endDate] = ranges[period] || ranges.YTD;
        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            currency: selectedCurrency,
        };
    };

    if (isLoading && !data) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-md py-24">
                    <LoadingState title="Loading finances" description="Consolidating your P&L, stakes and revenue streams." />
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-md py-24">
                    <ErrorState
                        title="Failed to load finances"
                        description="We couldn't reach the finance service. Please try again."
                        detail={error ?? undefined}
                        action={{ label: 'Try again', onClick: fetchData }}
                    />
                </div>
            </DashboardLayout>
        );
    }

    const activeCurrency = data.currency || currency;
    const fmtMoney = (val: number) => formatCurrency(val, { currency: activeCurrency, maximumFractionDigits: 0 });

    // Platform take-rate applied to the settleable revenue. Prefer a verified
    // revenue figure when we have one; otherwise fall back to reported revenue.
    const grossRevenue = revenueVerification?.revenue ?? data.metrics.totalRevenue;
    const platformFee = (grossRevenue * PLATFORM_FEE_PCT) / 100;
    const netPayout = grossRevenue - platformFee;

    type FinanceCsvRow = { section: string; label: string; amount: number; currency: string };

    const exportSummary = () => {
        const rows: FinanceCsvRow[] = [
            { section: 'Summary', label: 'Total Revenue', amount: data.metrics.totalRevenue, currency: activeCurrency },
            { section: 'Summary', label: 'Portfolio Value', amount: data.metrics.portfolioValue, currency: activeCurrency },
            { section: 'Summary', label: 'Net Profit', amount: data.metrics.netProfit, currency: activeCurrency },
            { section: 'Summary', label: 'Dividends Earned', amount: data.metrics.dividendsEarned, currency: activeCurrency },
            { section: 'Payout', label: 'Gross Revenue', amount: grossRevenue, currency: activeCurrency },
            { section: 'Payout', label: `Platform Fee (${PLATFORM_FEE_PCT}%)`, amount: platformFee, currency: activeCurrency },
            { section: 'Payout', label: 'Net Payout', amount: netPayout, currency: activeCurrency },
            ...data.summary.flatMap((row): FinanceCsvRow[] => [
                { section: 'Cash Flow', label: `${row.month} Revenue`, amount: row.revenue, currency: activeCurrency },
                { section: 'Cash Flow', label: `${row.month} Expenses`, amount: row.expenses, currency: activeCurrency },
            ]),
        ];
        downloadCsv(`finance-summary-${selectedPeriod.toLowerCase()}`, rows, [
            { header: 'Section', accessor: (r) => r.section },
            { header: 'Metric', accessor: (r) => r.label },
            { header: 'Amount', accessor: (r) => r.amount },
            { header: 'Currency', accessor: (r) => r.currency },
        ]);
    };

    const STAT_CARDS = [
        {
            label: 'Total Revenue',
            value: fmtMoney(data.metrics.totalRevenue),
            change: data.metrics.totalRevenueChange,
            icon: DollarSign,
        },
        {
            label: 'Portfolio Value',
            value: fmtMoney(data.metrics.portfolioValue),
            change: data.metrics.portfolioValueChange,
            icon: Wallet,
        },
        {
            label: 'Net Profit',
            value: fmtMoney(data.metrics.netProfit),
            change: data.metrics.netProfitChange,
            icon: ArrowUpRight,
        },
        {
            label: 'Dividends Earned',
            value: fmtMoney(data.metrics.dividendsEarned),
            change: data.metrics.dividendsEarnedChange,
            icon: DollarSign,
        },
    ];

    const payoutsEnabled = Boolean(stripeStatus?.payoutsEnabled);
    const hasAccount = Boolean(stripeStatus?.accountId);
    const showConnect = !payoutsEnabled || !hasAccount;

    const appId = user?.defaultAppId ?? '';
    const stripeAccountId = stripeStatus?.accountId ?? '';
    const canVerifyRevenue = Boolean(appId && stripeAccountId);
    const needsAttention = Boolean(
        stripeStatus?.disabledReason || (stripeStatus?.requirementsDue && stripeStatus.requirementsDue.length > 0),
    );

    const handleConnectStripe = async () => {
        setConnecting(true);
        const res = await connectStripe(window.location.href);
        setConnecting(false);
        const url = res?.data?.url;
        if (url) window.location.assign(url);
    };

    const handleRefreshStatus = async () => {
        setRefreshing(true);
        const res = await refreshStripeAccount();
        setRefreshing(false);
        if (res?.success) setStripeStatus(res.data);
    };

    const handleVerifyRevenue = async () => {
        if (!canVerifyRevenue) return;
        setVerifying(true);
        const res = await verifyRevenue(appId, stripeAccountId);
        setVerifying(false);
        if (res?.success) setRevenueVerification(res.data);
    };

    const handleSubmitEvidence = async () => {
        if (!selectedListingId) return;
        setSubmittingEvidence(true);
        setEvidenceError(null);
        const res = await submitRevenueEvidence({
            listingId: selectedListingId,
            evidenceUrl: evidenceForm.evidenceUrl.trim() || undefined,
            provider: evidenceForm.provider,
            notes: evidenceForm.notes.trim() || undefined,
        });
        setSubmittingEvidence(false);
        if (res?.success) {
            setRevenueVerification(res.data);
            setEvidenceOpen(false);
            setEvidenceForm({ evidenceUrl: '', provider: 'manual', notes: '' });
        } else {
            setEvidenceError('Could not submit evidence. Please try again.');
        }
    };

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
                {loadFailed && (
                    <ErrorState
                        severity="warning"
                        title="Finance API is unavailable"
                        description="Showing an empty finance workspace instead of blocking the page. Connect the finance endpoint to populate live data."
                        detail={error ?? undefined}
                        action={{ label: 'Retry', onClick: fetchData }}
                    />
                )}

                {/* Header + controls */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Financial Command Center</h1>
                        <p className="font-medium text-muted-foreground">
                            Consolidated P&amp;L, revenue streams, and automated tax reports.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div>
                            <label htmlFor="finance-currency" className="sr-only">
                                Display currency
                            </label>
                            <select
                                id="finance-currency"
                                value={currency}
                                onChange={(event) => setCurrency(event.target.value)}
                                className="h-10 rounded-lg border border-border bg-muted px-3 font-medium text-foreground outline-none focus:ring-2 focus:ring-accent/30"
                            >
                                {CURRENCIES.map((code) => (
                                    <option key={code} value={code}>
                                        {code}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button variant="secondary" onClick={exportSummary}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Export CSV
                        </Button>
                        <div className="relative">
                            <Button
                                onClick={() => setShowPeriodPicker((prev) => !prev)}
                                aria-haspopup="menu"
                                aria-expanded={showPeriodPicker}
                            >
                                <Calendar className="h-4 w-4" aria-hidden="true" /> Period: {selectedPeriod}
                            </Button>
                            {showPeriodPicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowPeriodPicker(false)} />
                                    <div
                                        role="menu"
                                        className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
                                    >
                                        {PERIODS.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                role="menuitemradio"
                                                aria-checked={selectedPeriod === p}
                                                onClick={() => {
                                                    setSelectedPeriod(p);
                                                    setShowPeriodPicker(false);
                                                }}
                                                className={
                                                    'w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ' +
                                                    (selectedPeriod === p
                                                        ? 'bg-accent/10 text-accent'
                                                        : 'text-foreground hover:bg-muted')
                                                }
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    {STAT_CARDS.map((stat, i) => {
                        const Icon = stat.icon;
                        const positive = stat.change >= 0;
                        const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="rounded-2xl border border-border bg-card p-6"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {stat.label}
                                    </p>
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                                        style={{ backgroundColor: `${seriesColor(i)}20`, color: seriesColor(i) }}
                                    >
                                        <Icon size={20} aria-hidden="true" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                <div
                                    className={
                                        'mt-2 flex items-center gap-1 text-xs font-semibold ' +
                                        (positive ? 'text-success' : 'text-error')
                                    }
                                >
                                    <ChangeIcon size={12} aria-hidden="true" />
                                    {formatPercent(stat.change, { signed: true })}
                                    <span className="font-medium text-muted-foreground">vs last period</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Payouts & Stripe Connect */}
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <CreditCard className="h-5 w-5 text-accent" aria-hidden="true" />
                                Payouts &amp; Stripe Connect
                            </CardTitle>
                            <CardDescription>
                                Connect Stripe to receive marketplace payouts directly to your bank.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge label="Onboarding" enabled={Boolean(stripeStatus?.onboardingComplete)} />
                            <StatusBadge label="Charges" enabled={Boolean(stripeStatus?.chargesEnabled)} />
                            <StatusBadge label="Payouts" enabled={payoutsEnabled} />
                            {paymentsLoading && !stripeStatus && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                            )}
                        </div>

                        {needsAttention && (
                            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
                                <p className="flex items-center gap-2 font-semibold text-warning">
                                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                    Action required before payouts can be enabled
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                                    {stripeStatus?.disabledReason && <li>{stripeStatus.disabledReason}</li>}
                                    {stripeStatus?.requirementsDue?.map((req) => (
                                        <li key={req}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            {showConnect ? (
                                <Button onClick={handleConnectStripe} disabled={connecting}>
                                    {connecting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                    {connecting ? 'Connecting…' : 'Connect Stripe'}
                                </Button>
                            ) : (
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                    Payouts active
                                </span>
                            )}
                            {!showConnect && stripeStatus?.dashboardUrl && (
                                <a
                                    href={stripeStatus.dashboardUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    Open Stripe dashboard
                                </a>
                            )}
                            {hasAccount && (
                                <Button
                                    variant="outline"
                                    onClick={handleRefreshStatus}
                                    disabled={refreshing}
                                    aria-label="Refresh Stripe account status"
                                >
                                    <RefreshCw
                                        className={'h-4 w-4' + (refreshing ? ' animate-spin' : '')}
                                        aria-hidden="true"
                                    />
                                    {refreshing ? 'Refreshing…' : 'Refresh status'}
                                </Button>
                            )}
                        </div>

                        {paymentsError && (
                            <p className="text-xs font-medium text-error">
                                Couldn&apos;t reach Stripe: {paymentsError}
                            </p>
                        )}

                        {/* Platform fee math — gross → fee → net */}
                        <div className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-accent" aria-hidden="true" />
                                <h3 className="text-sm font-semibold text-foreground">
                                    Payout breakdown ({formatPercent(PLATFORM_FEE_PCT)} platform fee)
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <StatTile label="Gross revenue" value={fmtMoney(grossRevenue)} icon={DollarSign} />
                                <StatTile
                                    label={`Platform fee (${formatPercent(PLATFORM_FEE_PCT)})`}
                                    value={`− ${fmtMoney(platformFee)}`}
                                    icon={Percent}
                                />
                                <StatTile label="Net payout" value={fmtMoney(netPayout)} icon={Wallet} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Based on {revenueVerification?.revenue != null ? 'verified' : 'reported'} revenue; the
                                remainder settles to your connected account.
                            </p>
                        </div>

                        {/* Payout readiness + revenue verification */}
                        {data.stakes.length > 0 ? (
                            <div className="space-y-4 border-t border-border pt-4">
                                <div className="w-full sm:max-w-xs">
                                    <Select
                                        label="Listing"
                                        size="sm"
                                        placeholder=""
                                        value={selectedListingId}
                                        onValueChange={setSelectedListingId}
                                        options={data.stakes.map((stake) => ({
                                            value: stake.listingId,
                                            label: stake.listing?.name ?? stake.listingId,
                                        }))}
                                    />
                                </div>

                                {payoutReadiness && (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <StatTile
                                            label="Payout readiness"
                                            value={payoutReadiness.ready ? 'Ready' : 'Action needed'}
                                            icon={ShieldCheck}
                                            hint={
                                                payoutReadiness.requiredBeforeActivation
                                                    ? 'Required before this listing can activate.'
                                                    : 'Not blocking activation.'
                                            }
                                        />
                                        <StatTile
                                            label="Revenue verification"
                                            value={revenueVerification?.verified ? 'Verified' : 'Unverified'}
                                            icon={FileText}
                                            hint={
                                                revenueVerification?.status
                                                    ? `Status: ${revenueVerification.status.replace(/_/g, ' ')}`
                                                    : undefined
                                            }
                                        />
                                    </div>
                                )}

                                {payoutReadiness && payoutReadiness.blockers.length > 0 && (
                                    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                                        <p className="flex items-center gap-2 font-semibold text-warning">
                                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                            Payout blockers
                                        </p>
                                        <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                                            {payoutReadiness.blockers.map((blocker) => (
                                                <li key={blocker}>{blocker}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {revenueVerification?.reviewerNote && (
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">Reviewer note:</span>{' '}
                                        {revenueVerification.reviewerNote}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleVerifyRevenue}
                                        disabled={!canVerifyRevenue || verifying}
                                    >
                                        {verifying ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        {verifying ? 'Verifying…' : 'Verify revenue'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setEvidenceError(null);
                                            setEvidenceOpen(true);
                                        }}
                                        disabled={!selectedListingId}
                                    >
                                        <FileText className="h-4 w-4" aria-hidden="true" />
                                        Submit evidence
                                    </Button>
                                    {paymentsLoading && (
                                        <Loader2
                                            className="h-4 w-4 animate-spin text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    )}
                                </div>
                                {!canVerifyRevenue && (
                                    <p className="text-xs text-muted-foreground">
                                        Connect Stripe and set a default app to run automatic revenue verification.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                                Acquire a holding to unlock payout-readiness checks and revenue verification.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Revenue evidence submission */}
                <ConfirmDialog
                    open={evidenceOpen}
                    onOpenChange={setEvidenceOpen}
                    title="Submit revenue evidence"
                    description="Provide documentation to verify revenue for the selected listing."
                    confirmLabel="Submit evidence"
                    loading={submittingEvidence}
                    confirmDisabled={!selectedListingId}
                    onConfirm={handleSubmitEvidence}
                >
                    <div className="space-y-4">
                        <FormField label="Provider">
                            {(field) => (
                                <Select
                                    {...field}
                                    placeholder=""
                                    value={evidenceForm.provider}
                                    onValueChange={(value) =>
                                        setEvidenceForm((prev) => ({
                                            ...prev,
                                            provider: value as NonNullable<RevenueEvidenceInput['provider']>,
                                        }))
                                    }
                                    options={[
                                        { value: 'manual', label: 'Manual' },
                                        { value: 'stripe', label: 'Stripe' },
                                        { value: 'app_store', label: 'App Store' },
                                        { value: 'play_store', label: 'Play Store' },
                                    ]}
                                />
                            )}
                        </FormField>
                        <FormField
                            label="Evidence URL"
                            helperText="Link to a dashboard export, invoice, or statement."
                        >
                            {(field) => (
                                <input
                                    {...field}
                                    type="url"
                                    value={evidenceForm.evidenceUrl}
                                    onChange={(event) =>
                                        setEvidenceForm((prev) => ({ ...prev, evidenceUrl: event.target.value }))
                                    }
                                    placeholder="https://…"
                                    className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                                />
                            )}
                        </FormField>
                        <FormField label="Notes">
                            {(field) => (
                                <textarea
                                    {...field}
                                    rows={3}
                                    value={evidenceForm.notes}
                                    onChange={(event) =>
                                        setEvidenceForm((prev) => ({ ...prev, notes: event.target.value }))
                                    }
                                    placeholder="Anything the reviewer should know…"
                                    className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                                />
                            )}
                        </FormField>
                        {evidenceError && <p className="text-sm font-medium text-error">{evidenceError}</p>}
                    </div>
                </ConfirmDialog>

                {/* Portfolio Holdings */}
                <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">Portfolio Holdings (Stakes)</CardTitle>
                            <CardDescription>Real-time valuation of your fractional assets.</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-accent"
                            onClick={() => navigate('/portfolio')}
                        >
                            View All Assets
                        </Button>
                    </CardHeader>
                    {data.stakes.length === 0 ? (
                        <div className="p-6 pt-0">
                            <EmptyState
                                icon={Wallet}
                                title="No holdings yet"
                                description="Fractional assets you acquire will appear here with live valuation and ROI."
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-4">Asset</th>
                                        <th className="px-6 py-4">Ownership</th>
                                        <th className="px-6 py-4">Initial Invest</th>
                                        <th className="px-6 py-4">Current Value</th>
                                        <th className="px-6 py-4">Dividends</th>
                                        <th className="px-6 py-4">ROI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.stakes.map((stake) => {
                                        const roi =
                                            stake.amountInvested > 0
                                                ? ((stake.currentValue + stake.totalDividends - stake.amountInvested) /
                                                      stake.amountInvested) *
                                                  100
                                                : 0;
                                        const roiPositive = roi >= 0;
                                        const RoiIcon = roiPositive ? ArrowUpRight : ArrowDownRight;
                                        return (
                                            <tr key={stake.id} className="group transition-colors hover:bg-muted/30">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground">
                                                            {stake.listing?.name?.[0] || 'A'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground">
                                                                {stake.listing?.name}
                                                            </p>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                                {stake.listing?.category}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-foreground">
                                                    {formatPercent(stake.ownershipPercentage)}
                                                </td>
                                                <td className="px-6 py-5 font-bold text-muted-foreground">
                                                    {fmtMoney(stake.amountInvested)}
                                                </td>
                                                <td className="px-6 py-5 font-bold text-foreground">
                                                    {fmtMoney(stake.currentValue)}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="rounded-full bg-success/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-success">
                                                        +{fmtMoney(stake.totalDividends)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div
                                                        className={
                                                            'flex items-center gap-1 font-black ' +
                                                            (roiPositive ? 'text-success' : 'text-error')
                                                        }
                                                    >
                                                        <RoiIcon size={14} aria-hidden="true" />
                                                        {formatPercent(roi, { signed: true })}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Cash flow + revenue by source */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <ChartCard
                            title={
                                <span className="flex items-center gap-2">
                                    <BarChart3 size={20} className="text-accent" aria-hidden="true" />
                                    Cash Flow Analysis
                                </span>
                            }
                            height={340}
                            isEmpty={data.summary.length === 0}
                            emptyLabel="No cash-flow transactions for this period."
                            action={
                                <div className="flex gap-4 text-xs font-bold">
                                    <span className="flex items-center gap-2">
                                        <span
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: seriesColor(2) }}
                                            aria-hidden="true"
                                        />
                                        Revenue
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: seriesColor(4) }}
                                            aria-hidden="true"
                                        />
                                        Expenses
                                    </span>
                                </div>
                            }
                        >
                            <AreaChart data={data.summary}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: chartTheme.axisFontSize, fill: chartTheme.axis }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: chartTheme.axisFontSize, fill: chartTheme.axis }}
                                />
                                <ThemedTooltip valueFormatter={(value) => fmtMoney(Number(value))} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke={seriesColor(2)}
                                    strokeWidth={3}
                                    fill={seriesColor(2)}
                                    fillOpacity={0.15}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expenses"
                                    stroke={seriesColor(4)}
                                    strokeWidth={3}
                                    fill={seriesColor(4)}
                                    fillOpacity={0.15}
                                />
                            </AreaChart>
                        </ChartCard>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Wallet size={20} className="text-accent" aria-hidden="true" />
                                Revenue by Source
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BreakdownList
                                items={data.revenueBySource.map((s) => ({
                                    label: s.source,
                                    value: s.value,
                                    percentage: s.pct,
                                }))}
                                valueFormatter={(v) => fmtMoney(v)}
                                emptyLabel="No revenue sources yet."
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};
