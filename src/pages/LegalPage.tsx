import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useLegalLicenses, LicenseType, UserLicenseApplication } from '../hooks/useLegalLicenses';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scale,
    Globe,
    Star,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileText,
    Shield,
    CreditCard,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Send,
    X,
    Info,
    Calendar,
    DollarSign,
    CheckCircle,
    ArrowRight,
    Plus,
    ChevronDown,
    ChevronRight,
    Grid3X3,
    List,
    ExternalLink
} from 'lucide-react';
import { LicenseApplicationModal } from '../components/modals/LicenseApplicationModal';
import { getLicenseApplicationProfile } from '../utils/legalLicenseProfiles';
import { validateUrl } from '../utils/security';

const COUNTRIES = [
    { code: 'NG', name: 'Nigeria' },
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'EU', name: 'European Union' },
    { code: 'GLOBAL', name: 'Global' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The in-app application flow inserts against `license_types.id` (a UUID). Static
// catalog cards carry slug ids (e.g. "ng-cac-company-registration") which have no
// DB row, so only DB-backed licenses can be applied for in-app; the rest link out.
const canApplyInApp = (id?: string) => Boolean(id && UUID_RE.test(id));

// ─── Organization Logo Component ─────────────────────────────────────────────

type CatalogLicense = LicenseType & {
    regulatorCode: string;
    appliesTo: string;
    priority: 'Core' | 'Conditional' | 'Specialized';
    official_url: string;
    logoTone: string;
    logoDomain?: string;
    regulatorSummary?: string;
};

const NIGERIA_MOBILE_APP_LICENSES: CatalogLicense[] = [
    {
        id: 'ng-cac-company-registration',
        code: 'CAC_COMPANY_REGISTRATION',
        name: 'CAC Company / Business Registration',
        description: 'Legal entity registration for Nigerian app businesses, founders, and operators.',
        category: 'Corporate',
        country: 'NG',
        issuing_authority: 'Corporate Affairs Commission',
        is_featured: true,
        requirements: 'Proposed business name, Directors or proprietor details, Registered address, Share structure where applicable, Identification documents',
        estimated_duration: '3-10 business days',
        estimated_cost: 'Varies by entity type',
        is_active: true,
        regulatorCode: 'CAC',
        appliesTo: 'Every serious mobile app business before contracts, banking, and tax setup.',
        priority: 'Core',
        official_url: 'https://www.cac.gov.ng/companies/',
        logoTone: 'from-emerald-600 to-green-800',
    },
    {
        id: 'ng-ndpc-data-protection',
        code: 'NDPC_DATA_PROTECTION',
        name: 'NDPA / NDPR Data Protection Compliance',
        description: 'Privacy governance, lawful processing, and audit compliance for apps handling personal data.',
        category: 'Data Protection',
        country: 'NG',
        issuing_authority: 'Nigeria Data Protection Commission',
        is_featured: true,
        requirements: 'Privacy notice, Data processing inventory, Lawful basis assessment, Consent records, Security controls, Audit return where applicable',
        estimated_duration: '2-6 weeks',
        estimated_cost: 'Depends on audit scope',
        is_active: true,
        regulatorCode: 'NDPC',
        appliesTo: 'Apps collecting user profiles, location, device IDs, payments, health, education, or behavioral data.',
        priority: 'Core',
        official_url: 'https://services.ndpc.gov.ng/',
        logoTone: 'from-sky-600 to-blue-800',
    },
    {
        id: 'ng-firs-tax-registration',
        code: 'FIRS_TIN_VAT',
        name: 'TIN / VAT Tax Registration',
        description: 'Tax identity and VAT readiness for invoicing, platform fees, subscriptions, and business banking.',
        category: 'Tax',
        country: 'NG',
        issuing_authority: 'Federal Inland Revenue Service',
        is_featured: true,
        requirements: 'CAC registration, Company details, Director or owner tax details, Business address, Bank information where applicable',
        estimated_duration: '1-3 weeks',
        estimated_cost: 'Government fees vary',
        is_active: true,
        regulatorCode: 'FIRS',
        appliesTo: 'Revenue-generating apps, SaaS subscriptions, marketplaces, and paid services.',
        priority: 'Core',
        official_url: 'https://ecitizen.firs.gov.ng/en/signup',
        logoTone: 'from-amber-500 to-orange-700',
    },
    {
        id: 'ng-cbn-pssp',
        code: 'CBN_PSSP',
        name: 'CBN Payment Solution Service Provider',
        description: 'Authorization path for apps providing payment gateways, switching-adjacent payment solutions, or merchant payment infrastructure.',
        category: 'Payments',
        country: 'NG',
        issuing_authority: 'Central Bank of Nigeria',
        is_featured: true,
        requirements: 'CAC documents, Business plan, Governance documents, Technical architecture, Risk and compliance framework, Capital and financial evidence',
        estimated_duration: '8-24 weeks',
        estimated_cost: 'CBN schedule applies',
        is_active: true,
        regulatorCode: 'CBN',
        appliesTo: 'Fintech apps processing payments directly or operating payment infrastructure.',
        priority: 'Conditional',
        official_url: 'https://www.cbn.gov.ng/PaymentsSystem/PSPs.html',
        logoTone: 'from-emerald-700 to-teal-900',
    },
    {
        id: 'ng-cbn-mobile-money',
        code: 'CBN_MMO',
        name: 'CBN Mobile Money Operator',
        description: 'License track for mobile wallets, stored value, agent networks, and mobile money services.',
        category: 'Payments',
        country: 'NG',
        issuing_authority: 'Central Bank of Nigeria',
        is_featured: false,
        requirements: 'CAC documents, Capital evidence, AML/CFT policy, Technology risk controls, Consumer protection process, Agent and wallet operations plan',
        estimated_duration: '12-32 weeks',
        estimated_cost: 'CBN schedule applies',
        is_active: true,
        regulatorCode: 'CBN',
        appliesTo: 'Wallet, transfer, stored-value, mobile money, or agent banking products.',
        priority: 'Specialized',
        official_url: 'https://www.cbn.gov.ng/PaymentsSystem/PSPs.html',
        logoTone: 'from-emerald-700 to-teal-900',
    },
    {
        id: 'ng-cbn-ptsp',
        code: 'CBN_PTSP',
        name: 'CBN Payment Terminal Service Provider',
        description: 'Authorization path for POS terminal deployment, payment terminal support, and merchant acquiring support operations.',
        category: 'Payments',
        country: 'NG',
        issuing_authority: 'Central Bank of Nigeria',
        is_featured: false,
        requirements: 'CAC documents, Terminal management process, Technical certification, Risk controls, Operational support plan',
        estimated_duration: '8-20 weeks',
        estimated_cost: 'CBN schedule applies',
        is_active: true,
        regulatorCode: 'CBN',
        appliesTo: 'Apps linked to POS fleets, merchant terminals, payment devices, or terminal services.',
        priority: 'Specialized',
        official_url: 'https://www.cbn.gov.ng/PaymentsSystem/PSPs.html',
        logoTone: 'from-emerald-700 to-teal-900',
    },
    {
        id: 'ng-ncc-vas',
        code: 'NCC_VAS',
        name: 'NCC Value Added Service / Mobile Content',
        description: 'Telecom-facing license path for apps delivering billable content, SMS/USSD, subscriptions, or operator-integrated mobile services.',
        category: 'Telecom',
        country: 'NG',
        issuing_authority: 'Nigerian Communications Commission',
        is_featured: false,
        requirements: 'CAC documents, Service description, Technical integration details, Consumer billing flow, Telecom partner documentation where applicable',
        estimated_duration: '4-12 weeks',
        estimated_cost: 'NCC fee schedule applies',
        is_active: true,
        regulatorCode: 'NCC',
        appliesTo: 'Apps using SMS, USSD, carrier billing, telco APIs, or regulated mobile content services.',
        priority: 'Conditional',
        official_url: 'https://ncc.gov.ng/sites/default/files/2024-11/Documents/Technical%20Standard-Short%20Code_Application%20Form221214.pdf',
        logoTone: 'from-blue-600 to-indigo-800',
    },
    {
        id: 'ng-fccpc-digital-lending',
        code: 'FCCPC_DML',
        name: 'FCCPC Digital Lending Registration',
        description: 'Consumer protection and registration requirement for online, electronic, and non-traditional lending products.',
        category: 'Consumer Lending',
        country: 'NG',
        issuing_authority: 'Federal Competition and Consumer Protection Commission',
        is_featured: false,
        requirements: 'CAC documents, Lending terms, Privacy policy, Recovery process, Data protection compliance, Responsible lending disclosures',
        estimated_duration: '4-16 weeks',
        estimated_cost: 'FCCPC schedule applies',
        is_active: true,
        regulatorCode: 'FCCPC',
        appliesTo: 'Loan apps, buy-now-pay-later products, salary advance, and consumer credit apps.',
        priority: 'Specialized',
        official_url: 'https://fccpc.gov.ng/wp-content/uploads/2025/12/DEON-Consumer-Lending-Application-Forms.pdf',
        logoTone: 'from-violet-600 to-purple-800',
    },
    {
        id: 'ng-sec-crowdfunding-fintech',
        code: 'SEC_CROWDFUNDING',
        name: 'SEC Crowdfunding / Capital Market Fintech',
        description: 'Registration path for investment crowdfunding portals, securities products, digital sub-brokers, and capital-market fintech services.',
        category: 'Capital Markets',
        country: 'NG',
        issuing_authority: 'Securities and Exchange Commission Nigeria',
        is_featured: false,
        requirements: 'CAC documents, Portal rules, Investor risk disclosures, Governance framework, AML/CFT controls, Technology and custody controls',
        estimated_duration: '12-32 weeks',
        estimated_cost: 'SEC schedule applies',
        is_active: true,
        regulatorCode: 'SEC',
        appliesTo: 'Investment, crowdfunding, securities, tokenized investment, or capital-market apps.',
        priority: 'Specialized',
        official_url: 'https://sec.gov.ng/about/resources/checklists/individual-registration-requirements-for-each-cmo/crowdfunding-intermediary-registration-requirements/',
        logoTone: 'from-rose-600 to-red-800',
    },
    {
        id: 'ng-ndic-deposit-insurance',
        code: 'NDIC_DEPOSIT_INSURANCE',
        name: 'NDIC Deposit Insurance Compliance',
        description: 'Deposit insurance and bank-resolution compliance relevant to licensed deposit-taking financial institutions.',
        category: 'Banking',
        country: 'NG',
        issuing_authority: 'Nigeria Deposit Insurance Corporation',
        is_featured: false,
        requirements: 'CBN banking or MFB license pathway, Deposit-taking approval, Regulatory returns, Customer deposit records, Resolution and reporting controls',
        estimated_duration: 'Depends on CBN licensing',
        estimated_cost: 'Regulator schedule applies',
        is_active: true,
        regulatorCode: 'NDIC',
        appliesTo: 'Only apps operated by licensed banks, microfinance banks, or deposit-taking institutions.',
        priority: 'Specialized',
        official_url: 'https://ndic.gov.ng/project/deposit-insurance/',
        logoTone: 'from-cyan-600 to-blue-800',
    },
    {
        id: 'ng-naicom-insurtech',
        code: 'NAICOM_INSURANCE',
        name: 'NAICOM Insurance / Web Aggregator Approval',
        description: 'Insurance-sector approval for apps selling, comparing, aggregating, or distributing insurance products.',
        category: 'Insurance',
        country: 'NG',
        issuing_authority: 'National Insurance Commission',
        is_featured: false,
        requirements: 'CAC documents, Insurance partner details, Product disclosures, Consumer complaint process, Data protection controls',
        estimated_duration: '6-20 weeks',
        estimated_cost: 'NAICOM schedule applies',
        is_active: true,
        regulatorCode: 'NAICOM',
        appliesTo: 'Insurtech apps, insurance aggregators, policy comparison, and embedded insurance products.',
        priority: 'Conditional',
        official_url: 'https://naicom.gov.ng/wp-content/uploads/2025/07/Guidelines-for-Insurtech-Operations-in-Nigeria.pdf',
        logoTone: 'from-pink-600 to-rose-800',
    },
    {
        id: 'ng-notap-tech-transfer',
        code: 'NOTAP_TECH_TRANSFER',
        name: 'NOTAP Technology Transfer Registration',
        description: 'Registration support for qualifying foreign software, IP licensing, technical service, and technology transfer agreements.',
        category: 'Technology Transfer',
        country: 'NG',
        issuing_authority: 'National Office for Technology Acquisition and Promotion',
        is_featured: false,
        requirements: 'Technology agreement, CAC documents, Scope of services, Fees and royalty terms, IP ownership documents',
        estimated_duration: '4-16 weeks',
        estimated_cost: 'NOTAP schedule applies',
        is_active: true,
        regulatorCode: 'NOTAP',
        appliesTo: 'Apps licensing foreign software/IP into Nigeria or paying offshore technical service fees.',
        priority: 'Conditional',
        official_url: 'https://notap.gov.ng/services/ttr.html',
        logoTone: 'from-slate-700 to-zinc-900',
    },
];

const OrgLogo: React.FC<{ code: string; className?: string; logoDomain?: string }> = ({ code, className = '', logoDomain }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const logoMap: Record<string, { initials: string; textClass: string }> = {
        CBN: { initials: 'CBN', textClass: 'text-emerald-700 dark:text-emerald-300' },
        NDIC: { initials: 'NDIC', textClass: 'text-sky-700 dark:text-sky-300' },
        CAC: { initials: 'CAC', textClass: 'text-emerald-800 dark:text-emerald-300' },
        NDPC: { initials: 'NDPA', textClass: 'text-blue-700 dark:text-blue-300' },
        NITDA: { initials: 'NITDA', textClass: 'text-orange-700 dark:text-orange-300' },
        NOTAP: { initials: 'NOTAP', textClass: 'text-slate-800 dark:text-slate-200' },
        SEC: { initials: 'SEC', textClass: 'text-red-700 dark:text-red-300' },
        FCCPC: { initials: 'FCCPC', textClass: 'text-violet-700 dark:text-violet-300' },
        NCC: { initials: 'NCC', textClass: 'text-indigo-700 dark:text-indigo-300' },
        NAFDAC: { initials: 'NAFDAC', textClass: 'text-teal-700 dark:text-teal-300' },
        SON: { initials: 'SON', textClass: 'text-blue-800 dark:text-blue-300' },
        FIRS: { initials: 'FIRS', textClass: 'text-orange-700 dark:text-orange-300' },
        PENCOM: { initials: 'PENCOM', textClass: 'text-cyan-700 dark:text-cyan-300' },
        NAICOM: { initials: 'NAICOM', textClass: 'text-rose-700 dark:text-rose-300' },
    };

    const config = logoMap[code] || { initials: code.slice(0, 6), textClass: 'text-[#0071e3]' };
    const logoSrc = logoDomain ? `https://www.google.com/s2/favicons?domain=${logoDomain}&sz=256` : '';

    return (
        <div
            className={`flex items-center justify-center bg-transparent font-black tracking-tight ${imageFailed || !logoSrc ? config.textClass : ''} ${className}`}
            aria-label={`${config.initials} logo`}
        >
            {logoSrc && !imageFailed ? (
                <img
                    src={logoSrc}
                    alt={`${config.initials} logo`}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span className="leading-none">{config.initials}</span>
            )}
        </div>
    );
};

// ─── Main Legal Page ─────────────────────────────────────────────────────────

export const LegalPage: React.FC = () => {
    const { getAllLicenses, getMyApplications } = useLegalLicenses();
    const [licenses, setLicenses] = useState<CatalogLicense[]>(() =>
        NIGERIA_MOBILE_APP_LICENSES.map(license => {
            const profile = getLicenseApplicationProfile(license.code);
            return { ...license, logoDomain: profile.logoDomain, regulatorSummary: profile.regulatorSummary };
        })
    );
    const [myApplications, setMyApplications] = useState<UserLicenseApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('NG');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showMyApplications, setShowMyApplications] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [selectedLicense, setSelectedLicense] = useState<LicenseType | null>(null);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [showCountryPopup, setShowCountryPopup] = useState(false);

    const loadData = useCallback(async () => {
        const baseLicenses = selectedCountry === 'NG'
            ? NIGERIA_MOBILE_APP_LICENSES.map(license => {
                const profile = getLicenseApplicationProfile(license.code);
                return { ...license, logoDomain: profile.logoDomain, regulatorSummary: profile.regulatorSummary };
            })
            : [];
        setLicenses(baseLicenses);
        setLoading(selectedCountry !== 'NG');
        setError('');
        try {
            const [allResult, appsResult] = await Promise.all([
                getAllLicenses(selectedCountry),
                getMyApplications(),
            ]);
            if (!allResult.success && !appsResult.success) {
                setError(allResult.error || appsResult.error || 'Failed to load the licensing catalog.');
            }
            const licenseMap = new Map<string, CatalogLicense>();
            baseLicenses.forEach(license => licenseMap.set(license.code, license));
            if (allResult.success) {
                const remoteData = Array.isArray(allResult.data)
                    ? allResult.data
                    : Array.isArray((allResult.data as any)?.data)
                    ? (allResult.data as any).data
                    : [];
                (remoteData as LicenseType[]).forEach((license) => {
                    const code = license.code?.split('_')[0] || 'GEN';
                    const fallback = NIGERIA_MOBILE_APP_LICENSES.find(item => item.code === license.code);
                    const profile = getLicenseApplicationProfile(license.code);
                    licenseMap.set(license.code, {
                        ...license,
                        regulatorCode: fallback?.regulatorCode || code,
                        appliesTo: fallback?.appliesTo || 'Use when this regulator applies to your app model.',
                        priority: fallback?.priority || 'Conditional',
                        official_url: fallback?.official_url || profile.officialApplicationUrl,
                        logoTone: fallback?.logoTone || 'from-[#0071e3] to-[#005bb5]',
                        logoDomain: profile.logoDomain,
                        regulatorSummary: profile.regulatorSummary,
                    } as CatalogLicense);
                });
            }
            setLicenses(Array.from(licenseMap.values()));
            const appData = Array.isArray(appsResult.data)
                ? appsResult.data
                : Array.isArray((appsResult.data as any)?.data)
                ? (appsResult.data as any).data
                : [];
            if (appsResult.success) setMyApplications(appData);
        } catch (err) {
            console.error('Failed to load licenses:', err);
            setError(err instanceof Error ? err.message : 'Failed to load the licensing catalog.');
        } finally {
            setLoading(false);
        }
    }, [selectedCountry]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleApplyClick = (license: LicenseType) => {
        setSelectedLicense(license);
        setShowApplicationModal(true);
    };

    const handleApplicationSuccess = () => {
        loadData();
    };

    const pendingApps = useMemo(() =>
        myApplications.filter(a => a.status === 'draft' || a.status === 'submitted' || a.status === 'under_review'),
        [myApplications]
    );

    const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-3">
                            <Scale size={28} className="text-[#0071e3]" />
                            Legal & Licenses
                        </h1>
                        <p className="text-[#1d1d1f]/50 dark:text-white/50 font-medium mt-1">Apply for regulatory licenses and compliance certifications</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowMyApplications(!showMyApplications)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${showMyApplications ? 'bg-[#0071e3] text-white' : 'bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 text-[#1d1d1f] dark:text-white hover:border-[#0071e3]/30'}`}
                        >
                            <FileText size={16} />
                            My Applications ({pendingApps.length})
                        </button>
                        <button
                            onClick={() => setShowContact(!showContact)}
                            className="px-4 py-2.5 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all flex items-center gap-2"
                        >
                            <Mail size={16} />
                            Contact Us
                        </button>
                    </div>
                </div>

                {/* Contact Us Panel */}
                <AnimatePresence>
                    {showContact && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <ContactUsPanel onClose={() => setShowContact(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* My Applications Panel */}
                <AnimatePresence>
                    {showMyApplications && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <MyApplicationsPanel applications={myApplications} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start New Application Card */}
                    <button
                        onClick={() => setShowCountryPopup(true)}
                        className="bg-gradient-to-br from-[#0071e3] to-[#005bb5] rounded-2xl p-6 text-white relative overflow-hidden hover:from-[#0077ed] hover:to-[#005bb5] transition-all active:scale-[0.98] text-left"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
                        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Plus size={28} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">Start New Application</h3>
                                    <p className="text-sm text-white/70 mt-1">Choose your country to begin the license application process</p>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Continue Existing Application Card */}
                    <button
                        onClick={() => setShowMyApplications(!showMyApplications)}
                        className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white relative overflow-hidden hover:from-emerald-500 hover:to-emerald-600 transition-all active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
                        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <FileText size={24} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black">Continue Existing Application</h3>
                                    <p className="text-sm text-white/70">
                                        {pendingApps.length > 0
                                            ? `${pendingApps.length} application${pendingApps.length > 1 ? 's' : ''} in progress`
                                            : 'No active applications'
                                        }
                                    </p>
                                </div>
                            </div>

                            {pendingApps.length > 0 && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">{pendingApps[0].license_type?.name?.slice(0, 30) || 'Application'}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                            <span className="text-xs font-bold">{pendingApps[0].status === 'draft' ? 'Draft' : 'In Progress'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 flex items-center gap-2 text-sm font-bold">
                                View All Applications
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </button>
                </div>

                {error && (
                    <div role="alert" className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle size={18} className="text-red-500 shrink-0" />
                            <p className="text-sm text-red-500 font-medium truncate">{error}</p>
                        </div>
                        <button onClick={loadData} className="text-sm font-semibold text-red-500 hover:underline shrink-0">Retry</button>
                    </div>
                )}

                {/* All Licenses Grid */}
                <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                            <h3 className="text-base font-black text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                <Shield size={20} className="text-[#0071e3]" />
                                Available Licenses in {selectedCountryData.name}
                            </h3>
                            <p className="mt-1 text-xs font-medium text-[#1d1d1f]/45 dark:text-white/45">
                                Mobile app compliance cards grouped by regulator and use case.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-[#1d1d1f]/40 dark:text-white/40 font-bold">{licenses.length} licenses</span>
                            <div className="flex rounded-xl bg-white dark:bg-[#1e1e20] p-1 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-[#0071e3] text-white' : 'text-[#1d1d1f]/55 dark:text-white/55 hover:bg-[#f5f7fb] dark:hover:bg-[#111]'}`}
                                    aria-label="Grid view"
                                >
                                    <Grid3X3 size={14} />
                                    Grid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-[#0071e3] text-white' : 'text-[#1d1d1f]/55 dark:text-white/55 hover:bg-[#f5f7fb] dark:hover:bg-[#111]'}`}
                                    aria-label="List view"
                                >
                                    <List size={14} />
                                    List
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5 animate-pulse">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-[#fafafa] dark:bg-[#111]" />
                                        <div className="flex-1">
                                            <div className="h-4 bg-[#fafafa] dark:bg-[#111] rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-[#fafafa] dark:bg-[#111] rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="h-3 bg-[#fafafa] dark:bg-[#111] rounded w-full mb-2" />
                                    <div className="h-3 bg-[#fafafa] dark:bg-[#111] rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : licenses.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl">
                            <Scale size={48} className="mx-auto mb-4 text-[#1d1d1f]/15 dark:text-white/15" />
                            <p className="text-base font-bold text-[#1d1d1f]/40 dark:text-white/40">
                                {selectedCountry === 'NG' ? 'No licenses available yet' : `${selectedCountryData.name} catalog coming soon`}
                            </p>
                            <p className="text-sm text-[#1d1d1f]/30 dark:text-white/30 mt-1">
                                {selectedCountry === 'NG'
                                    ? 'The mobile app license catalog is being prepared. Please check back shortly.'
                                    : `We're still curating the compliance catalog for ${selectedCountryData.name}. Switch to Nigeria to explore the full mobile app license set today.`}
                            </p>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                            {licenses.map(license => (
                                <LicenseCard key={license.id} license={license} viewMode={viewMode} onApply={() => handleApplyClick(license)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Application Modal */}
            {showApplicationModal && selectedLicense && (
                <LicenseApplicationModal
                    license={selectedLicense}
                    onSuccess={handleApplicationSuccess}
                    onClose={() => { setShowApplicationModal(false); setSelectedLicense(null); }}
                />
            )}

            {/* Country Selection Popup */}
            <AnimatePresence>
                {showCountryPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCountryPopup(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="relative bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-2xl p-6 max-w-md w-full"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-[#1d1d1f] dark:text-white">Select Country</h3>
                                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50 mt-1">Choose your jurisdiction to view available licenses</p>
                                </div>
                                <button onClick={() => setShowCountryPopup(false)} className="p-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors">
                                    <X size={20} className="text-[#1d1d1f]/40 dark:text-white/40" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {COUNTRIES.map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => { setSelectedCountry(c.code); setShowCountryPopup(false); }}
                                        className={`w-full p-4 rounded-xl border-2 transition-all active:scale-[0.98] flex items-center justify-between ${selectedCountry === c.code
                                            ? 'border-[#0071e3] bg-[#0071e3]/5'
                                            : 'border-[#1d1d1f]/8 dark:border-white/8 hover:border-[#0071e3]/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${selectedCountry === c.code ? 'bg-[#0071e3]/10' : 'bg-[#fafafa] dark:bg-[#111]'}`}>
                                                <Globe size={24} className={selectedCountry === c.code ? 'text-[#0071e3]' : 'text-[#1d1d1f]/40 dark:text-white/40'} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-base font-bold text-[#1d1d1f] dark:text-white">{c.name}</p>
                                            </div>
                                        </div>
                                        {selectedCountry === c.code && (
                                            <CheckCircle2 size={20} className="text-[#0071e3]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

// ─── License Card Component ──────────────────────────────────────────────────

interface LicenseCardProps {
    license: CatalogLicense;
    viewMode: 'grid' | 'list';
    onApply: () => void;
}

const LicenseCard: React.FC<LicenseCardProps> = ({ license, viewMode, onApply }) => {
    const [expanded, setExpanded] = useState(false);
    const profile = getLicenseApplicationProfile(license.code);
    const officialApplicationUrl = profile.officialApplicationUrl;
    const officialRequirementsUrl = profile.officialRequirementsUrl || profile.officialApplicationUrl;
    const validOfficialApplicationUrl = officialApplicationUrl && validateUrl(officialApplicationUrl) ? officialApplicationUrl : '';
    const validOfficialRequirementsUrl = officialRequirementsUrl && validateUrl(officialRequirementsUrl) ? officialRequirementsUrl : '';
    const requirementItems = profile.requiredDocuments.length > 0
        ? profile.requiredDocuments
        : (license.requirements || '')
            .split(',')
            .map((req) => req.trim())
            .filter(Boolean)
            .slice(0, 5);
    const orgCode = license.regulatorCode || license.code?.split('_')[0] || license.code || 'GEN';
    const isList = viewMode === 'list';
    const detailId = `license-details-${license.id}`;

    const MetaBlock = () => (
        <div className={`grid gap-2 ${isList ? 'grid-cols-2 sm:max-w-xs' : 'grid-cols-2'}`}>
            {license.estimated_duration && (
                <div className="rounded-lg bg-[#f6f7fb] px-3 py-2 dark:bg-[#111]">
                    <p className="text-[8px] text-[#1d1d1f]/30 dark:text-white/30 uppercase font-bold">Timeline</p>
                    <p className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{license.estimated_duration}</p>
                </div>
            )}
            {license.estimated_cost && (
                <div className="rounded-lg bg-[#f6f7fb] px-3 py-2 dark:bg-[#111]">
                    <p className="text-[8px] text-[#1d1d1f]/30 dark:text-white/30 uppercase font-bold">Fee</p>
                    <p className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{license.estimated_cost}</p>
                </div>
            )}
        </div>
    );

    const DetailsPanel = () => (
        <AnimatePresence>
            {expanded && requirementItems.length > 0 && (
                <motion.div
                    id={detailId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="mt-3 rounded-xl bg-[#f6f7fb] p-3 dark:bg-[#111]">
                        <p className="text-xs text-[#1d1d1f]/60 dark:text-white/60 leading-5 mb-3">{license.regulatorSummary || license.description}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#1d1d1f]/35 dark:text-white/35 mb-1">Applies to</p>
                        <p className="text-xs text-[#1d1d1f]/60 dark:text-white/60 leading-5 mb-3">{license.appliesTo}</p>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-[#1d1d1f] dark:text-white">Requirements</p>
                            {validOfficialRequirementsUrl && (
                                <a
                                    href={validOfficialRequirementsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#0071e3] shadow-sm dark:bg-[#151618]"
                                >
                                    <ExternalLink size={10} />
                                    Open official page
                                </a>
                            )}
                        </div>
                        <ul className="space-y-1.5">
                            {requirementItems.map((req, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-[#1d1d1f]/60 dark:text-white/60">
                                    <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                    {req.trim()}
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const inAppApply = canApplyInApp(license.id);
    const Actions = ({ compact = false }: { compact?: boolean }) => (
        <div className="flex items-center gap-2">
            {inAppApply ? (
                <>
                    <button
                        onClick={onApply}
                        className={`${compact ? 'px-4' : 'flex-1'} h-10 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
                    >
                        <FileText size={15} />
                        Apply
                    </button>
                    {validOfficialApplicationUrl && (
                        <a
                            href={validOfficialApplicationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 w-10 flex-shrink-0 bg-[#f1f4f8] dark:bg-[#111] text-[#1d1d1f] dark:text-white rounded-xl hover:bg-[#e8eef6] dark:hover:bg-[#171719] transition-all active:scale-[0.98] flex items-center justify-center"
                            aria-label={`${license.name} official application page`}
                        >
                            <ExternalLink size={16} />
                        </a>
                    )}
                </>
            ) : validOfficialApplicationUrl ? (
                <a
                    href={validOfficialApplicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-10 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    aria-label={`${license.name} official application page`}
                >
                    <ExternalLink size={15} />
                    Apply on official site
                </a>
            ) : (
                <button
                    disabled
                    title="Application not available in-app yet"
                    className="flex-1 h-10 bg-[#f1f4f8] dark:bg-[#111] text-[#1d1d1f]/40 dark:text-white/40 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                >
                    <FileText size={15} />
                    Apply
                </button>
            )}
        </div>
    );

    if (isList) {
        return (
            <motion.div
                layout
                className="bg-white dark:bg-[#1e1e20] rounded-2xl shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-all active:scale-[0.99] hover:bg-[#f8fafc] dark:hover:bg-[#242427]"
            >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <OrgLogo
                        code={orgCode}
                        logoDomain={license.logoDomain}
                        className="h-24 w-24 text-xl flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-black text-[#1d1d1f] dark:text-white">{license.name}</h4>
                            {license.is_featured && <Star size={13} className="text-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="mt-1 text-xs font-medium text-[#1d1d1f]/42 dark:text-white/42 truncate">{license.issuing_authority}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[10px] font-bold text-[#0071e3]">{license.priority}</span>
                            <span className="rounded-full bg-[#f6f7fb] px-2.5 py-1 text-[10px] font-bold text-[#1d1d1f]/50 dark:bg-[#111] dark:text-white/50">{license.category}</span>
                        </div>
                        <div className="mt-3">
                            <MetaBlock />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:w-48">
                        <Actions compact />
                        <button
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                            aria-controls={detailId}
                            className="h-10 rounded-xl bg-[#f6f7fb] text-xs font-bold text-[#0071e3] transition-colors hover:bg-[#eef2f8] dark:bg-[#111] dark:hover:bg-[#171719] flex items-center justify-center gap-2"
                        >
                            <Info size={13} />
                            {expanded ? 'Hide Details' : 'Details'}
                        </button>
                    </div>
                </div>
                <div className="px-4 pb-4">
                    <DetailsPanel />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            className="bg-white dark:bg-[#1e1e20] rounded-2xl overflow-hidden shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-all active:scale-[0.99] hover:bg-[#f8fafc] dark:hover:bg-[#242427]"
        >
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <OrgLogo
                        code={orgCode}
                        logoDomain={license.logoDomain}
                        className="h-28 w-28 text-2xl"
                    />
                    {license.is_featured && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600">Featured</span>
                    )}
                </div>
                <div className="mt-4 min-h-[92px]">
                    <h4 className="text-base font-black leading-snug text-[#1d1d1f] dark:text-white">{license.name}</h4>
                    <p className="mt-1 text-xs font-medium text-[#1d1d1f]/42 dark:text-white/42 line-clamp-1">{license.issuing_authority}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[10px] font-bold text-[#0071e3]">{license.priority}</span>
                        <span className="text-[10px] font-bold text-[#1d1d1f]/45 dark:text-white/45">{license.category}</span>
                    </div>
                </div>
                <MetaBlock />
                <button
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    className="mt-3 w-full rounded-xl bg-[#f6f7fb] py-2 text-xs font-bold text-[#0071e3] transition-colors hover:bg-[#eef2f8] dark:bg-[#111] dark:hover:bg-[#171719] flex items-center justify-center gap-2"
                >
                    <Info size={13} />
                    {expanded ? 'Hide Details' : 'Details'}
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <DetailsPanel />
            </div>

            <div className="px-4 pb-4">
                <Actions />
            </div>
        </motion.div>
    );
};

// ─── My Applications Panel ───────────────────────────────────────────────────

const MyApplicationsPanel: React.FC<{ applications: UserLicenseApplication[] }> = ({ applications }) => {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'draft': return { label: 'Draft', bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/20', icon: FileText };
            case 'submitted': return { label: 'Submitted', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', icon: Send };
            case 'under_review': return { label: 'Under Review', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', icon: Clock };
            case 'approved': return { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2 };
            case 'rejected': return { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', icon: AlertCircle };
            default: return { label: status, bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20', icon: FileText };
        }
    };

    if (applications.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-8 text-center">
                <FileText size={40} className="mx-auto mb-3 text-[#1d1d1f]/15 dark:text-white/15" />
                <p className="text-sm font-bold text-[#1d1d1f]/40 dark:text-white/40">No applications yet</p>
                <p className="text-xs text-[#1d1d1f]/30 dark:text-white/30 mt-1">Start a new application above</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-4 flex items-center gap-2">
                <FileText size={16} className="text-[#0071e3]" />
                My License Applications ({applications.length})
            </h3>
            <div className="space-y-3">
                {applications.map(app => {
                    const statusConfig = getStatusConfig(app.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                        <div key={app.id} className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl border border-[#1d1d1f]/8 dark:border-white/8">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <OrgLogo code={app.license_type?.code?.split('_')[0] || 'GEN'} className="w-10 h-10 text-[10px]" />
                                    <div>
                                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{app.license_type?.name || 'License Application'}</p>
                                        <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40">{app.license_type?.issuing_authority || ''}</p>
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                    <StatusIcon size={12} />
                                    {statusConfig.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-[#1d1d1f]/30 dark:text-white/30">
                                <span className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'Draft'}
                                </span>
                                <span>Country: {app.country}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Contact Us Panel ────────────────────────────────────────────────────────

const ContactUsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // No inbound-message backend exists, so hand off to the user's mail client
        // with a prefilled draft to legal@mvplab.io rather than faking a send.
        const subject = encodeURIComponent('License & compliance support request');
        const body = encodeURIComponent(`${message}\n\n— Reply to: ${email}`);
        window.location.href = `mailto:legal@mvplab.io?subject=${subject}&body=${body}`;
        setSent(true);
        setTimeout(() => { setSent(false); setEmail(''); setMessage(''); }, 4000);
    };

    return (
        <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                    <Mail size={20} className="text-[#0071e3]" />
                    Contact Us
                </h3>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors">
                    <X size={16} className="text-[#1d1d1f]/40 dark:text-white/40" />
                </button>
            </div>

            {sent ? (
                <div className="text-center py-8">
                    <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
                    <p className="text-base font-bold text-[#1d1d1f] dark:text-white">Opening your email app…</p>
                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50 mt-1">A draft to legal@mvplab.io is ready — send it and we'll reply within 24 hours.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Phone size={18} className="text-[#0071e3]" />
                                <div>
                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">Phone</p>
                                    <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50">+234 800 MVPLAB (687-5222)</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Mail size={18} className="text-[#0071e3]" />
                                <div>
                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">Email</p>
                                    <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50">legal@mvplab.io</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <MapPin size={18} className="text-[#0071e3]" />
                                <div>
                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">Office</p>
                                    <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50">Lagos, Nigeria</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1.5 block">Your Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1.5 block">Message</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="How can we help with your license application?"
                                rows={4}
                                required
                                className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30 resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Send size={16} />
                            Send Message
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
