import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Upload, FileText, Info, AlertCircle, DollarSign, Clock, Building2, User, Mail, ExternalLink } from 'lucide-react';
import { useLegalLicenses, LicenseType } from '../../hooks/useLegalLicenses';
import { useAuth } from '../../hooks/useAuth';
import { getLicenseApplicationProfile } from '../../utils/legalLicenseProfiles';
import { validateUrl } from '../../utils/security';

interface LicenseApplicationModalProps {
    license: LicenseType;
    onSuccess?: () => void;
    onClose?: () => void;
}

const STEPS = [
    { id: 1, label: 'Personal Info' },
    { id: 2, label: 'Business Details' },
    { id: 3, label: 'Documents' },
    { id: 4, label: 'Review & Pay' },
];

export const LicenseApplicationModal: React.FC<LicenseApplicationModalProps> = ({
    license,
    onSuccess,
    onClose,
}) => {
    const { user } = useAuth();
    const { createApplication, submitApplication, uploadDocument } = useLegalLicenses();
    const profile = getLicenseApplicationProfile(license.code);
    const officialApplicationUrl = profile.officialApplicationUrl;
    const officialRequirementsUrl = profile.officialRequirementsUrl || profile.officialApplicationUrl;
    const validOfficialApplicationUrl = officialApplicationUrl && validateUrl(officialApplicationUrl) ? officialApplicationUrl : '';
    const validOfficialRequirementsUrl = officialRequirementsUrl && validateUrl(officialRequirementsUrl) ? officialRequirementsUrl : '';
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [applicationId, setApplicationId] = useState<string | null>(null);
    const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({});

    const [formData, setFormData] = useState({
        fullName: '',
        email: user?.email || '',
        phone: '',
        businessName: '',
        businessType: 'llc',
        registrationNumber: '',
        businessAddress: '',
        yearsInOperation: '',
        additionalNotes: '',
    } as Record<string, string>);

    const existingBusinessFields = new Set([
        'businessName',
        'businessType',
        'registrationNumber',
        'businessAddress',
        'yearsInOperation',
    ]);
    const licenseSpecificFields = profile.applicationFields.filter(field => !existingBusinessFields.has(field.name));

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateDocumentFile = (documentType: string, file: File | null) => {
        setDocumentFiles(prev => ({ ...prev, [documentType]: file }));
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return formData.fullName && formData.email && formData.phone;
            case 2:
                return Boolean(
                    formData.businessName &&
                    formData.businessType &&
                    formData.businessAddress &&
                    licenseSpecificFields.every(field => !field.required || formData[field.name])
                );
            case 3:
                return profile.requiredDocuments.every(documentType => Boolean(documentFiles[documentType]));
            default:
                return true;
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const applicationData = {
                personalInfo: {
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                },
                businessInfo: {
                    businessName: formData.businessName,
                    businessType: formData.businessType,
                    registrationNumber: formData.registrationNumber,
                    businessAddress: formData.businessAddress,
                    yearsInOperation: formData.yearsInOperation,
                    additionalNotes: formData.additionalNotes,
                },
                licenseSpecific: licenseSpecificFields.reduce((acc, field) => ({
                    ...acc,
                    [field.name]: formData[field.name] || '',
                }), {}),
                requiredDocuments: profile.requiredDocuments,
                reviewChecklist: profile.reviewChecklist,
            };

            const result = await createApplication(license.id, license.country, applicationData);

            if (result.success && result.data) {
                const created = (result.data as any).data || result.data;
                setApplicationId(created.id);
                for (const documentType of profile.requiredDocuments) {
                    const file = documentFiles[documentType];
                    if (!file) {
                        throw new Error(`Upload ${documentType} before submitting.`);
                    }
                    const uploadResult = await uploadDocument(created.id, documentType, file);
                    if (!uploadResult.success) {
                        throw new Error((uploadResult as any).error || `Failed to upload ${documentType}.`);
                    }
                }
                const submitted = await submitApplication(created.id);
                if (!submitted.success) {
                    throw new Error((submitted as any).error || 'Application draft was saved, but submission failed.');
                }
                setSuccess(true);
                onSuccess?.();
            } else {
                throw new Error(result.error || 'Failed to submit application.');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to submit application. Please try again when persistence is available.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-2xl p-8 max-w-md w-full text-center"
                >
                    <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500" />
                    <h3 className="text-xl font-black text-[#1d1d1f] dark:text-white mb-2">Application Submitted!</h3>
                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50 mb-2">{license.name}</p>
                    <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40 mb-6">
                        Your application has been submitted to the admin review queue. An admin will approve or reject it after checking the details and uploaded documents.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all"
                    >
                        Done
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-5 border-b border-[#1d1d1f]/8 dark:border-white/8">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">Apply for License</h3>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors">
                            <X size={16} className="text-[#1d1d1f]/40 dark:text-white/40" />
                        </button>
                    </div>
                    <p className="text-sm text-[#1d1d1f]/60 dark:text-white/60">{license.name}</p>
                    <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">{license.issuing_authority}</p>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-1 mt-4">
                        {STEPS.map(s => (
                            <div key={s.id} className="flex-1">
                                <div className={`h-1 rounded-full transition-all ${s.id <= step ? 'bg-[#0071e3]' : 'bg-[#fafafa] dark:bg-[#111]'}`} />
                                <p className={`text-[9px] font-bold mt-1 ${s.id === step ? 'text-[#0071e3]' : s.id < step ? 'text-emerald-500' : 'text-[#1d1d1f]/30 dark:text-white/30'}`}>
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Personal Information</h4>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Full Name *</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1d1d1f]/30 dark:text-white/30" />
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={e => updateField('fullName', e.target.value)}
                                            placeholder={user?.email?.split('@')[0] || 'Your name'}
                                            className="w-full pl-9 pr-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Email *</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1d1d1f]/30 dark:text-white/30" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => updateField('email', e.target.value)}
                                            placeholder={user?.email || 'you@example.com'}
                                            className="w-full pl-9 pr-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Phone *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => updateField('phone', e.target.value)}
                                        placeholder="+234 800 000 0000"
                                        className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Business Details</h4>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Business Name *</label>
                                    <div className="relative">
                                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1d1d1f]/30 dark:text-white/30" />
                                        <input
                                            type="text"
                                            value={formData.businessName}
                                            onChange={e => updateField('businessName', e.target.value)}
                                            placeholder="Your business name"
                                            className="w-full pl-9 pr-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Business Type *</label>
                                    <select
                                        value={formData.businessType}
                                        onChange={e => updateField('businessType', e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]/30"
                                    >
                                        <option value="sole_proprietorship">Sole Proprietorship</option>
                                        <option value="llc">Limited Liability Company (LLC)</option>
                                        <option value="corporation">Corporation</option>
                                        <option value="partnership">Partnership</option>
                                        <option value="non_profit">Non-Profit</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Registration Number</label>
                                    <input
                                        type="text"
                                        value={formData.registrationNumber}
                                        onChange={e => updateField('registrationNumber', e.target.value)}
                                        placeholder="RC-000000 (if applicable)"
                                        className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Business Address *</label>
                                    <textarea
                                        value={formData.businessAddress}
                                        onChange={e => updateField('businessAddress', e.target.value)}
                                        placeholder="Full business address"
                                        rows={2}
                                        className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Years in Operation</label>
                                    <input
                                        type="number"
                                        value={formData.yearsInOperation}
                                        onChange={e => updateField('yearsInOperation', e.target.value)}
                                        placeholder="e.g. 3"
                                        min="0"
                                        className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">Additional Notes</label>
                                    <textarea
                                        value={formData.additionalNotes}
                                        onChange={e => updateField('additionalNotes', e.target.value)}
                                        placeholder="Any additional information..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:border-[#0071e3]/30 resize-none"
                                    />
                                </div>

                                {licenseSpecificFields.length > 0 && (
                                    <div className="rounded-2xl bg-[#f6f7fb] dark:bg-[#111] p-4 space-y-4">
                                        <div>
                                            <p className="text-sm font-black text-[#1d1d1f] dark:text-white">License-specific details</p>
                                            <p className="mt-1 text-xs text-[#1d1d1f]/50 dark:text-white/50">{profile.regulatorSummary}</p>
                                        </div>

                                        {validOfficialApplicationUrl && (
                                            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#0071e3]/15 bg-white px-4 py-3 dark:bg-[#1e1e20]">
                                                <div>
                                                    <p className="text-xs font-bold text-[#1d1d1f] dark:text-white">Missing a form?</p>
                                                    <p className="text-[11px] text-[#1d1d1f]/50 dark:text-white/50">
                                                        Open the official filing page and return here after you save the regulator form.
                                                    </p>
                                                </div>
                                                <a
                                                    href={validOfficialApplicationUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071e3]/10 px-3 py-2 text-[11px] font-bold text-[#0071e3] transition hover:bg-[#0071e3]/20"
                                                >
                                                    <ExternalLink size={12} />
                                                    Open page
                                                </a>
                                            </div>
                                        )}

                                        {licenseSpecificFields.map(field => (
                                            <div key={field.name}>
                                                <label className="text-xs font-bold text-[#1d1d1f]/60 dark:text-white/60 mb-1.5 block">
                                                    {field.label}{field.required ? ' *' : ''}
                                                </label>
                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        value={formData[field.name] || ''}
                                                        onChange={e => updateField(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        rows={3}
                                                        className="w-full px-4 py-3 bg-white dark:bg-[#1e1e20] rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25 resize-none shadow-sm"
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        value={formData[field.name] || ''}
                                                        onChange={e => updateField(field.name, e.target.value)}
                                                        className="w-full px-4 py-3 bg-white dark:bg-[#1e1e20] rounded-xl text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25 shadow-sm"
                                                    >
                                                        <option value="">Select an option</option>
                                                        {(field.options || []).map(option => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
                                                        value={formData[field.name] || ''}
                                                        onChange={e => updateField(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className="w-full px-4 py-3 bg-white dark:bg-[#1e1e20] rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25 shadow-sm"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Upload Documents</h4>

                                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <Info size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Required Documents</p>
                                            <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-0.5">
                                                {profile.requiredDocuments.map((req, i) => (
                                                    <li key={i} className="flex items-start gap-1.5">
                                                        <span className="text-amber-500 mt-0.5">•</span>
                                                        {req}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {profile.requiredDocuments.map((doc, i) => (
                                        <div key={i} className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl border border-dashed border-[#1d1d1f]/20 dark:border-white/20">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                                <div className="w-10 h-10 rounded-lg bg-[#0071e3]/10 flex items-center justify-center">
                                                    <Upload size={18} className="text-[#0071e3]" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{doc}</p>
                                                    <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40">
                                                        Upload PDF, PNG, JPG, or WebP evidence for admin review.
                                                    </p>
                                                    {documentFiles[doc] && (
                                                        <p className="mt-1 text-[10px] font-bold text-emerald-600 truncate">
                                                            Selected: {documentFiles[doc]?.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0071e3]/10 text-[#0071e3] rounded-lg text-xs font-bold hover:bg-[#0071e3]/20 transition-colors">
                                                    <Upload size={12} />
                                                    Upload
                                                    <input
                                                        type="file"
                                                        accept=".pdf,image/png,image/jpeg,image/webp"
                                                        className="hidden"
                                                        onChange={(event) => updateDocumentFile(doc, event.target.files?.[0] || null)}
                                                    />
                                                </label>
                                                {validOfficialRequirementsUrl ? (
                                                    <a
                                                        href={validOfficialRequirementsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3]/10 text-[#0071e3] rounded-lg text-xs font-bold hover:bg-[#0071e3]/20 transition-colors"
                                                    >
                                                        <ExternalLink size={12} />
                                                        Open form
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40">
                                    These files are saved with the application and sent to the admin panel for review before approval.
                                </p>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Review & Submit</h4>

                                {/* License Info */}
                                <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                                            <FileText size={20} className="text-[#0071e3]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{license.name}</p>
                                            <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40">{license.issuing_authority}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="space-y-3">
                                    <div className="p-3 bg-[#fafafa] dark:bg-[#111] rounded-lg">
                                        <p className="text-[10px] font-bold text-[#1d1d1f]/40 dark:text-white/40 uppercase mb-1">Personal</p>
                                        <p className="text-sm text-[#1d1d1f] dark:text-white">{formData.fullName}</p>
                                        <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50">{formData.email} • {formData.phone}</p>
                                    </div>
                                    <div className="p-3 bg-[#fafafa] dark:bg-[#111] rounded-lg">
                                        <p className="text-[10px] font-bold text-[#1d1d1f]/40 dark:text-white/40 uppercase mb-1">Business</p>
                                        <p className="text-sm text-[#1d1d1f] dark:text-white">{formData.businessName}</p>
                                        <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50">{formData.businessType} • {formData.businessAddress}</p>
                                    </div>
                                </div>

                                {/* Fees */}
                                <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-[#1d1d1f]/60 dark:text-white/60">Application Fee</p>
                                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{license.estimated_cost || 'TBD'}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-[#1d1d1f]/60 dark:text-white/60">Processing Time</p>
                                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{license.estimated_duration || 'TBD'}</p>
                                    </div>
                                    <div className="border-t border-[#1d1d1f]/8 dark:border-white/8 pt-2 flex items-center justify-between">
                                        <p className="text-base font-bold text-[#1d1d1f] dark:text-white">Total</p>
                                        <p className="text-base font-black text-[#0071e3]">{license.estimated_cost || 'TBD'}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-[#eef7ff] dark:bg-[#0071e3]/10 rounded-xl">
                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-2">Before filing</p>
                                    <ul className="space-y-2">
                                        {profile.reviewChecklist.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-xs text-[#1d1d1f]/65 dark:text-white/65">
                                                <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-[#0071e3]" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        By submitting, you confirm that all information provided is accurate and complete.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[#1d1d1f]/8 dark:border-white/8 flex items-center gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-4 py-3 bg-[#fafafa] dark:bg-[#111] text-[#1d1d1f] dark:text-white rounded-xl font-bold text-sm hover:bg-[#e8e8ea] dark:hover:bg-[#1a1a1a] transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}
                    <button
                        onClick={step === 4 ? handleSubmit : () => setStep(step + 1)}
                        disabled={loading || !canProceed()}
                        className="flex-1 py-3 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Submitting...
                            </>
                        ) : step === 4 ? (
                            <>
                                Submit Application
                                <ArrowRight size={16} />
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
