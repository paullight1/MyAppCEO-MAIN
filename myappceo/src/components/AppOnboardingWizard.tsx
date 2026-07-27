import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Code2,
  DollarSign,
  Globe2,
  Github,
  Layers3,
  Loader2,
  LockKeyhole,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  UploadCloud,
  X,
} from "lucide-react";
import { ExternalStoreApp } from "../types/externalApp";
import { useExternalApps } from "../hooks/useExternalApps";
import { useAuth } from "../hooks/useAuth";
import {
  buildStoreImportSnapshot,
  normalizeStoreCategory,
  parseStoreAppReference,
} from "../utils/storeImport";
import { lookupAppleApp } from "../utils/appleCatalog";
import {
  MARKETING_NOTIFICATION_OPTIONS,
  MarketingNotificationPreference,
  applyMarketingNotificationPreference,
  normalizeNotificationPreferences,
} from "../utils/notificationPreferences";
import { supabase } from "../lib/supabaseClient";
import { apiPost } from "../lib/apiClient";
import { ApiResponse } from "../../../packages/types/src";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  tone: string;
}

interface StepStatus {
  active: boolean;
  complete: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Asset Profile",
    description: "Tell us what you already own.",
    icon: UploadCloud,
    tone: "text-blue-600 bg-blue-500/10",
  },
  {
    id: 2,
    title: "Links & Stack",
    description: "Add store, website, repo, and tech context.",
    icon: Code2,
    tone: "text-cyan-600 bg-cyan-500/10",
  },
  {
    id: 3,
    title: "Ownership",
    description: "Confirm rights and operating status.",
    icon: ShieldCheck,
    tone: "text-emerald-600 bg-emerald-500/10",
  },
  {
    id: 4,
    title: "Review",
    description: "Check the details before submission.",
    icon: Check,
    tone: "text-amber-600 bg-amber-500/10",
  },
];

const STEP_SEQUENCE = [
  { id: 1, label: "Asset profile" },
  { id: 2, label: "Links & stack" },
  { id: 3, label: "Ownership" },
  { id: 4, label: "Review" },
] as const;

const ASSET_TYPES = [
  {
    id: "mobile",
    label: "Mobile app",
    icon: MonitorSmartphone,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "website",
    label: "Website",
    icon: Globe2,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "saas",
    label: "SaaS",
    icon: Layers3,
    color: "from-violet-500 to-indigo-500",
  },
  {
    id: "store",
    label: "Store app",
    icon: Store,
    color: "from-orange-500 to-rose-500",
  },
];

const STAGES = ["Live", "Beta", "Private build", "Paused", "Pre-launch"];
const STACK_OPTIONS = [
  { label: "React / Node.js", logo: "RE", value: "React / Node.js" },
  { label: "Next.js / Supabase", logo: "N", value: "Next.js / Supabase" },
  { label: "Flutter / Firebase", logo: "F", value: "Flutter / Firebase" },
  { label: "React Native", logo: "RN", value: "React Native" },
  { label: "Swift / iOS", logo: "iOS", value: "Swift / iOS" },
  { label: "Kotlin / Android", logo: "K", value: "Kotlin / Android" },
  { label: "Laravel / MySQL", logo: "L", value: "Laravel / MySQL" },
  { label: "Python / Django", logo: "Py", value: "Python / Django" },
  { label: "Other / Unknown", logo: "...", value: "Other / Unknown" },
];
const USER_RANGE_OPTIONS = [
  "No users yet",
  "1-100 users",
  "101-1k users",
  "1k-10k users",
  "10k-100k users",
  "100k+ users",
];

const FRIENDLY_SUBMIT_ERRORS = {
  backend:
    "The workspace service is unavailable right now. Check that the backend is running, then try again.",
  duplicate:
    "This app already exists in your workspace. Open the existing app or use a different public/store URL.",
  invalidUrl:
    "One or more links are not valid URLs. Use a full https:// URL or leave the field blank.",
  provider:
    "The store import provider is unavailable. You can submit without imported store details and enrich the app later.",
  permission:
    "You do not have permission to create an app workspace for this account.",
  generic: "Failed to add this app. Please try again.",
};

const normalizeOptionalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname.includes(".")
    ) {
      throw new Error("Invalid URL");
    }
    return parsed.toString();
  } catch {
    throw new Error(FRIENDLY_SUBMIT_ERRORS.invalidUrl);
  }
};

const classifySubmitError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (message === FRIENDLY_SUBMIT_ERRORS.invalidUrl)
    return FRIENDLY_SUBMIT_ERRORS.invalidUrl;
  if (
    normalized.includes("backend api is not available") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return FRIENDLY_SUBMIT_ERRORS.backend;
  }
  if (
    normalized.includes("duplicate") ||
    normalized.includes("already exists") ||
    normalized.includes("unique")
  ) {
    return FRIENDLY_SUBMIT_ERRORS.duplicate;
  }
  if (
    normalized.includes("store") &&
    (normalized.includes("provider") || normalized.includes("import"))
  ) {
    return FRIENDLY_SUBMIT_ERRORS.provider;
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("access denied") ||
    normalized.includes("forbidden") ||
    normalized.includes("403")
  ) {
    return FRIENDLY_SUBMIT_ERRORS.permission;
  }

  return message || FRIENDLY_SUBMIT_ERRORS.generic;
};

interface AppOnboardingWizardProps {
  onClose: () => void;
}

export const AppOnboardingWizard: React.FC<AppOnboardingWizardProps> = ({
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getExternalApp, isLoading: importingStoreData } = useExternalApps();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingRepo, setIsValidatingRepo] = useState(false);
  const [repoValidated, setRepoValidated] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [isImportingStore, setIsImportingStore] = useState(false);
  const [storeImportError, setStoreImportError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [createdAppId, setCreatedAppId] = useState("");
  const [importedStoreApp, setImportedStoreApp] =
    useState<ExternalStoreApp | null>(null);
  const [formData, setFormData] = useState({
    assetType: "mobile",
    name: "",
    category: "Mobile App",
    stage: "Live",
    description: "",
    websiteUrl: "",
    playStoreUrl: "",
    appStoreUrl: "",
    otherStoreUrl: "",
    repoUrl: "",
    techStack: "React / Node.js",
    monthlyRevenue: "0",
    users: "No users yet",
    ownerConfirmed: false,
    dataConfirmed: false,
    termsAccepted: false,
    marketingNotificationPreference: "" as MarketingNotificationPreference | "",
  });

  const selectedAsset =
    ASSET_TYPES.find((asset) => asset.id === formData.assetType) ||
    ASSET_TYPES[0];
  const progress = Math.min((step / STEPS.length) * 100, 100);
  const currentStepNumber = Math.min(step, STEP_SEQUENCE.length);
  const currentStep =
    STEP_SEQUENCE[currentStepNumber - 1] ||
    STEP_SEQUENCE[STEP_SEQUENCE.length - 1];
  const stepRail = useMemo(
    () =>
      STEP_SEQUENCE.map((item) => ({
        ...item,
        active: step === item.id,
        complete: step > item.id || step === 5,
      })),
    [step],
  );
  const isStoreImportBusy = isImportingStore || importingStoreData;
  const importedStoreSnapshot = useMemo(
    () =>
      importedStoreApp ? buildStoreImportSnapshot(importedStoreApp) : null,
    [importedStoreApp],
  );

  const stepIsValid = useMemo(() => {
    if (step === 1)
      return (
        formData.name.trim().length > 1 &&
        formData.description.trim().length > 10
      );
    if (step === 2)
      return Boolean(
        formData.websiteUrl ||
        formData.playStoreUrl ||
        formData.appStoreUrl ||
        formData.otherStoreUrl ||
        formData.repoUrl,
      );
    if (step === 3)
      return (
        formData.ownerConfirmed &&
        formData.dataConfirmed &&
        formData.termsAccepted &&
        Boolean(formData.marketingNotificationPreference)
      );
    return true;
  }, [formData, step]);

  const updateField = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => {
    if (key === "playStoreUrl" || key === "appStoreUrl") {
      setStoreImportError("");
      setImportedStoreApp(null);
    }
    setFormData((current) => ({ ...current, [key]: value }));
  };

  // Client-side URL-format check only. We can't confirm the repo exists or is
  // accessible from the browser, so we validate the shape and label it honestly
  // rather than faking a "Verified" result.
  const validateRepo = async () => {
    if (!formData.repoUrl.trim()) return;
    setIsValidatingRepo(true);
    setRepoError("");
    try {
      const url = new URL(formData.repoUrl.trim());
      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      const isKnownHost =
        /(github\.com|gitlab\.com|bitbucket\.org|dev\.azure\.com|sourcehut\.org|codeberg\.org|git\.)/i.test(
          url.hostname,
        );
      if (isHttp && isKnownHost) {
        setRepoValidated(true);
      } else {
        setRepoError(
          "Enter a GitHub, GitLab, Bitbucket, or Azure DevOps repository URL.",
        );
      }
    } catch {
      setRepoError("That doesn't look like a valid URL.");
    } finally {
      setIsValidatingRepo(false);
    }
  };

  const importStoreData = async () => {
    if (isStoreImportBusy) return;
    setStoreImportError("");
    setImportedStoreApp(null);

    const storeInput =
      formData.appStoreUrl.trim() || formData.playStoreUrl.trim();
    const reference = parseStoreAppReference(storeInput);
    if (!reference) {
      setStoreImportError(
        "Enter a valid Google Play package URL or Apple App Store URL first.",
      );
      return;
    }

    setIsImportingStore(true);
    try {
      let app: ExternalStoreApp | null = null;

      try {
        const result = await getExternalApp(reference.platform, reference.id);
        app =
          (((result as any)?.data?.data || (result as any)?.data) as
            | ExternalStoreApp
            | undefined) || null;
      } catch {
        app = null;
      }

      if (!app && reference.platform === "ios") {
        try {
          app = await lookupAppleApp(reference.id);
        } catch {
          app = null;
        }
      }

      if (!app) {
        setStoreImportError(
          reference.platform === "android"
            ? "Google Play metadata is unavailable right now. Connect the backend provider to import Android details."
            : "Apple App Store metadata is unavailable right now. You can continue without imported store details.",
        );
        return;
      }

      const snapshot = buildStoreImportSnapshot(app);

      setImportedStoreApp(app);
      setFormData((current) => ({
        ...current,
        name: app.name || current.name,
        assetType: "mobile",
        category: normalizeStoreCategory(snapshot.category),
        description: snapshot.shortDescription || current.description,
        stage: "Live",
        users: app.ratingCount
          ? `${app.ratingCount.toLocaleString()} ratings`
          : current.users,
        appStoreUrl:
          reference.platform === "ios"
            ? app.storeUrl || current.appStoreUrl
            : current.appStoreUrl,
        playStoreUrl:
          reference.platform === "android"
            ? app.storeUrl || current.playStoreUrl
            : current.playStoreUrl,
      }));
    } finally {
      setIsImportingStore(false);
    }
  };

  const nextStep = () => {
    if (!stepIsValid) return;
    setStep((current) => Math.min(current + 1, STEPS.length));
  };

  const prevStep = () => setStep((current) => Math.max(current - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const storeMetadata = importedStoreSnapshot?.metadata;
      const marketingPreference =
        formData.marketingNotificationPreference as MarketingNotificationPreference;
      const response = await apiPost<
        ApiResponse<{ app: { app_id: string }; listing: { id: string } }>
      >("/apps/managed", {
        ...formData,
        websiteUrl: normalizeOptionalUrl(formData.websiteUrl),
        playStoreUrl: normalizeOptionalUrl(formData.playStoreUrl),
        appStoreUrl: normalizeOptionalUrl(formData.appStoreUrl),
        otherStoreUrl: normalizeOptionalUrl(formData.otherStoreUrl),
        repoUrl: normalizeOptionalUrl(formData.repoUrl),
        monthlyRevenue: Number(formData.monthlyRevenue || 0),
        marketingNotificationPreference:
          formData.marketingNotificationPreference,
        storeMetadata,
      });
      const responseData = (response as any)?.data || response;
      const appId =
        responseData?.app?.app_id ||
        responseData?.app?.id ||
        responseData?.appId;
      if (!appId)
        throw new Error(
          "The app was created but the server did not return an app ID.",
        );

      if (user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("notification_preferences")
            .eq("id", user.id)
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          const currentPreferences = normalizeNotificationPreferences(
            profileData?.notification_preferences,
          );
          const nextPreferences = applyMarketingNotificationPreference(
            currentPreferences,
            marketingPreference,
          );

          const { error: updateError } = await supabase
            .from("user_profiles")
            .upsert(
              { id: user.id, notification_preferences: nextPreferences },
              { onConflict: "id" },
            );

          if (updateError) {
            throw updateError;
          }

          localStorage.setItem(
            "notification_preferences",
            JSON.stringify(nextPreferences),
          );
        } catch (preferenceError) {
          console.warn(
            "Failed to persist marketing notification preference:",
            preferenceError,
          );
        }
      }

      setCreatedAppId(appId);
      navigate(`/apps/${appId}/dashboard`, { replace: true });
    } catch (error) {
      setSubmitError(classifySubmitError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-5">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 18 }}
        className="relative z-10 grid max-h-[92dvh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-[0_35px_100px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#111214] lg:h-[92dvh] lg:max-h-[780px] lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.96] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          aria-label="Close add app form"
        >
          <X size={19} />
        </button>

        <aside className="overflow-x-hidden overflow-y-auto border-b border-slate-200 bg-slate-50/90 px-6 py-7 text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
          <div className="flex h-full flex-col">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#0071e3] dark:border-white/10 dark:bg-white/[0.04]">
              <selectedAsset.icon size={27} />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-white/40">
              Managed intake
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight">
              Bring your app into MyAppCEO.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-white/55">
              Create a managed app profile first. You can connect, upload, or
              build, but publishing stays in review.
            </p>

            <div className="mt-8 space-y-2">
              {stepRail.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.complete && setStep(item.id)}
                  aria-current={item.active ? "step" : undefined}
                  className={`flex w-full items-start gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                    item.active
                      ? "border-[#0071e3]/20 bg-white dark:bg-white/[0.05]"
                      : item.complete
                        ? "border-slate-200 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                        : "border-transparent bg-transparent opacity-85 hover:bg-white/60 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      item.active
                        ? "border-[#0071e3] bg-[#0071e3] text-white"
                        : item.complete
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/35"
                    }`}
                  >
                    {item.complete ? <Check size={14} /> : item.id}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        item.active
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-white/60"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/40">
                      Step {item.id}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-white/40">
                Controlled environment
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                Draft first, review second
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">
                Users can explore in a sandbox. Creating or publishing routes to
                admin request.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <header className="border-b border-slate-200/80 px-6 py-5 pr-16 dark:border-white/10 lg:px-10 lg:py-6 lg:pr-16">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-white/40">
                  Asset intake
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/50">
                  Step {currentStepNumber} of 4 · {currentStep.label}
                </p>
              </div>
              <p className="hidden text-sm font-medium text-slate-500 dark:text-white/40 sm:block">
                Controlled draft
              </p>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-white/8">
              <motion.div
                className="h-full rounded-full bg-[#0071e3]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 lg:px-10 lg:py-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <WizardPanel
                  key="step-1"
                  title="What are you adding?"
                  subtitle="Choose the asset type and describe what it does."
                >
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {ASSET_TYPES.map((asset) => {
                      const Icon = asset.icon;
                      const selected = formData.assetType === asset.id;

                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => updateField("assetType", asset.id)}
                          className={`rounded-2xl p-3 text-left transition active:scale-[0.98] ${
                            selected
                              ? "border border-[#0071e3]/20 bg-white text-[#0f172a] dark:bg-white/[0.05]"
                              : "border border-slate-200 bg-white/80 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65 dark:hover:bg-white/[0.06]"
                          }`}
                        >
                          <div
                            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${asset.color} text-white`}
                          >
                            <Icon size={22} />
                          </div>
                          <span className="text-sm font-semibold">
                            {asset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Asset name"
                      helper="Use the name customers or users recognize."
                    >
                      <input
                        type="text"
                        placeholder="e.g. FinanceFlow AI"
                        className={fieldClass}
                        value={formData.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                      />
                    </Field>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Detected category
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">
                        This follows the asset type or imported store metadata.
                      </p>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                        {formData.category}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-[0.7fr_1.3fr]">
                    <Field
                      label="Current stage"
                      helper="This controls how we review the asset."
                    >
                      <select
                        className={fieldClass}
                        value={formData.stage}
                        onChange={(event) =>
                          updateField("stage", event.target.value)
                        }
                      >
                        {STAGES.map((stage) => (
                          <option key={stage}>{stage}</option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Short description"
                      helper="Minimum 10 characters. Mention users, problem, and value."
                    >
                      <textarea
                        rows={4}
                        placeholder="What does it do, who uses it, and why does it matter?"
                        className={`${fieldClass} resize-none`}
                        value={formData.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </WizardPanel>
              )}

              {step === 2 && (
                <WizardPanel
                  key="step-2"
                  title="Connect the public and technical context"
                  subtitle="Add any links you have. One public, store, or repo link is enough to continue."
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Website or landing page"
                      helper="For websites, SaaS products, and public demos."
                    >
                      <input
                        type="url"
                        placeholder="https://yourapp.com"
                        className={fieldClass}
                        value={formData.websiteUrl}
                        onChange={(event) =>
                          updateField("websiteUrl", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Google Play URL"
                      helper="Optional. We can import public Android store metadata."
                    >
                      <input
                        type="url"
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        className={fieldClass}
                        value={formData.playStoreUrl}
                        onChange={(event) =>
                          updateField("playStoreUrl", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="App Store URL"
                      helper="Optional. We can import public iOS store metadata."
                    >
                      <input
                        type="url"
                        placeholder="https://apps.apple.com/app/id..."
                        className={fieldClass}
                        value={formData.appStoreUrl}
                        onChange={(event) =>
                          updateField("appStoreUrl", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Other store or marketplace"
                      helper="Optional link for Chrome Web Store, Shopify, WordPress, Gumroad, or another listing."
                    >
                      <input
                        type="url"
                        placeholder="https://..."
                        className={fieldClass}
                        value={formData.otherStoreUrl}
                        onChange={(event) =>
                          updateField("otherStoreUrl", event.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={importStoreData}
                      disabled={
                        isStoreImportBusy ||
                        (!formData.playStoreUrl && !formData.appStoreUrl)
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#e8f2ff] px-4 text-sm font-semibold text-[#0071e3] transition hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isStoreImportBusy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Store size={16} />
                      )}
                      {isStoreImportBusy
                        ? "Importing store details"
                        : "Import app store details"}
                    </button>

                    {storeImportError && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
                        {storeImportError}
                      </div>
                    )}

                    {importedStoreApp && (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                        {importedStoreApp.iconUrl ? (
                          <img
                            src={importedStoreApp.iconUrl}
                            alt={`${importedStoreApp.name} icon`}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#0071e3]">
                            <Store size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#0f172a] dark:text-white">
                            {importedStoreApp.name}
                          </p>
                          <p className="truncate text-xs text-[#475569] dark:text-white/55">
                            {importedStoreApp.developer} /{" "}
                            {importedStoreApp.category}
                            {importedStoreApp.rating
                              ? ` / ${importedStoreApp.rating.toFixed(1)} rating`
                              : ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#0071e3] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                          <Github size={21} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Repository</p>
                          <p className="text-xs text-slate-500 dark:text-white/55">
                            Optional, but useful for ownership and technical
                            review.
                          </p>
                        </div>
                      </div>
                      {repoValidated && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 size={14} />
                          Format looks valid
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="url"
                        placeholder="https://github.com/user/repo"
                        disabled={repoValidated || isValidatingRepo}
                        className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0071e3]/40 focus:ring-2 focus:ring-[#0071e3]/20 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
                        value={formData.repoUrl}
                        onChange={(event) => {
                          updateField("repoUrl", event.target.value);
                          setRepoValidated(false);
                          setRepoError("");
                        }}
                      />
                      <button
                        type="button"
                        onClick={validateRepo}
                        disabled={
                          !formData.repoUrl || isValidatingRepo || repoValidated
                        }
                        className="min-h-12 rounded-2xl bg-[#0071e3] px-5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#cbd5e1] disabled:text-[#64748b]"
                      >
                        {isValidatingRepo ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 size={15} className="animate-spin" />{" "}
                            Checking
                          </span>
                        ) : repoValidated ? (
                          "Valid"
                        ) : (
                          "Check format"
                        )}
                      </button>
                    </div>
                    {repoError && (
                      <p className="mt-2 text-xs font-medium text-error">{repoError}</p>
                    )}
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <Field
                      label="Main stack"
                      helper="Choose the closest known stack."
                    >
                      <select
                        className={fieldClass}
                        value={formData.techStack}
                        onChange={(event) =>
                          updateField("techStack", event.target.value)
                        }
                      >
                        {STACK_OPTIONS.map((stack) => (
                          <option key={stack.value} value={stack.value}>
                            {stack.logo} {stack.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Monthly revenue"
                      helper="Use 0 if it has not monetized."
                    >
                      <div className="relative">
                        <DollarSign
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                          size={18}
                        />
                        <input
                          type="number"
                          min="0"
                          className={`${fieldClass} pl-10`}
                          value={formData.monthlyRevenue}
                          onChange={(event) =>
                            updateField("monthlyRevenue", event.target.value)
                          }
                        />
                      </div>
                    </Field>
                    <Field
                      label="Users or traffic"
                      helper="Pick a range; exact numbers can be added later."
                    >
                      <select
                        className={fieldClass}
                        value={formData.users}
                        onChange={(event) =>
                          updateField("users", event.target.value)
                        }
                      >
                        {USER_RANGE_OPTIONS.map((range) => (
                          <option key={range}>{range}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </WizardPanel>
              )}

              {step === 3 && (
                <WizardPanel
                  key="step-3"
                  title="Confirm ownership and readiness"
                  subtitle="These checks keep listings, campaigns, and transfers clean."
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoCard
                      icon={LockKeyhole}
                      title="Ownership"
                      body="You control the code, store listing, domain, or operating rights."
                      tone="blue"
                    />
                    <InfoCard
                      icon={ShieldCheck}
                      title="Compliance"
                      body="Regulated apps can be routed into Legal and Licenses after intake."
                      tone="emerald"
                    />
                    <InfoCard
                      icon={Sparkles}
                      title="Growth"
                      body="Once added, you can manage campaigns, promotion, analytics, and team access."
                      tone="amber"
                    />
                  </div>

                  <div className="space-y-3">
                    <CheckRow
                      checked={formData.ownerConfirmed}
                      onChange={() =>
                        updateField("ownerConfirmed", !formData.ownerConfirmed)
                      }
                      title="I own or have authority to manage this asset"
                      body="This includes code, brand, store listing, domain, or licensed operating rights."
                    />
                    <CheckRow
                      checked={formData.dataConfirmed}
                      onChange={() =>
                        updateField("dataConfirmed", !formData.dataConfirmed)
                      }
                      title="The information I provided is accurate"
                      body="Revenue, user, repository, and public links should be reviewable where available."
                    />
                    <CheckRow
                      checked={formData.termsAccepted}
                      onChange={() =>
                        updateField("termsAccepted", !formData.termsAccepted)
                      }
                      title="I understand this creates a managed app profile"
                      body="You can later use this profile for listing, legal, fundraising, team, and promotion workflows."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white">
                    <div className="flex items-center gap-2">
                      <Rocket size={18} className="text-[#0071e3]" />
                      <p className="text-sm font-semibold">
                        Marketing notifications
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                      Tell us whether you already have marketing notifications
                      or want them enabled for launch and growth updates.
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {MARKETING_NOTIFICATION_OPTIONS.map((option) => {
                        const selected =
                          formData.marketingNotificationPreference ===
                          option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              updateField(
                                "marketingNotificationPreference",
                                option.id,
                              )
                            }
                            className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                              selected
                                ? "border-[#0071e3]/20 bg-white dark:bg-white/[0.05]"
                                : "border-slate-200 bg-white/70 hover:border-[#0071e3]/25 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {option.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">
                              {option.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </WizardPanel>
              )}

              {step === 4 && (
                <WizardPanel
                  key="step-4"
                  title="Review your app profile"
                  subtitle="Make sure the asset details are clear before adding it to your dashboard."
                >
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <div
                      className={`mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${selectedAsset.color} text-white`}
                    >
                      <selectedAsset.icon size={30} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <ReviewItem
                        label="Asset name"
                        value={formData.name || "Not set"}
                      />
                      <ReviewItem label="Type" value={selectedAsset.label} />
                      <ReviewItem label="Category" value={formData.category} />
                      <ReviewItem label="Stage" value={formData.stage} />
                      <ReviewItem
                        label="Website"
                        value={formData.websiteUrl || "Not provided"}
                      />
                      <ReviewItem
                        label="Google Play"
                        value={formData.playStoreUrl || "Not provided"}
                      />
                      <ReviewItem
                        label="App Store"
                        value={formData.appStoreUrl || "Not provided"}
                      />
                      <ReviewItem
                        label="Other store"
                        value={formData.otherStoreUrl || "Not provided"}
                      />
                      <ReviewItem
                        label="Repository"
                        value={
                          repoValidated
                            ? "Verified repository"
                            : formData.repoUrl || "Not provided"
                        }
                      />
                      <ReviewItem
                        label="Monthly revenue"
                        value={`$${formData.monthlyRevenue || "0"}`}
                      />
                      <ReviewItem
                        label="Users or traffic"
                        value={formData.users || "Not provided"}
                      />
                      <ReviewItem
                        label="Stack"
                        value={formData.techStack || "Not provided"}
                      />
                      <ReviewItem
                        label="Marketing notifications"
                        value={
                          MARKETING_NOTIFICATION_OPTIONS.find(
                            (option) =>
                              option.id ===
                              formData.marketingNotificationPreference,
                          )?.label || "Not selected"
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <div className="flex gap-3">
                      <AlertCircle size={19} className="mt-0.5 shrink-0" />
                      <p className="text-sm font-semibold leading-6">
                        After submission, this asset is added as a managed app
                        profile. You can still edit details, add team members,
                        start legal setup, or prepare a marketplace listing
                        later.
                      </p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
                      <div className="flex gap-3">
                        <AlertCircle size={19} className="mt-0.5 shrink-0" />
                        <p className="text-sm font-semibold leading-6">
                          {submitError}
                        </p>
                      </div>
                    </div>
                  )}
                </WizardPanel>
              )}

              {step === 5 && (
                <motion.div
                  key="success"
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="flex min-h-[500px] flex-col items-center justify-center text-center"
                >
                  <div className="relative mb-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 rounded-full bg-emerald-400 blur-xl"
                    />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-500 text-white">
                      <CheckCircle2 size={48} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-[#0f172a] dark:text-white">
                    App profile added
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#64748b] dark:text-white/58">
                    Your asset is ready for management workflows. Next you can
                    add co-founders, prepare legal documents, connect services,
                    or create a listing.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(
                        createdAppId
                          ? `/apps/${createdAppId}/dashboard`
                          : "/apps",
                      );
                    }}
                    className="mt-8 rounded-2xl bg-[#0071e3] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#0077ed] active:scale-[0.98]"
                  >
                    Open app dashboard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 5 && (
            <footer className="flex items-center justify-between gap-4 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03] lg:px-10">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900 dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                  <ChevronLeft size={17} />
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {!stepIsValid && (
                  <p className="hidden text-xs font-semibold text-slate-400 sm:block">
                    Complete required fields to continue.
                  </p>
                )}
                <button
                  type="button"
                  onClick={step === 4 ? handleSubmit : nextStep}
                  disabled={isSubmitting || !stepIsValid}
                  className={`inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-sm font-bold transition active:scale-[0.98] ${
                    isSubmitting || !stepIsValid
                      ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-white/30"
                      : "bg-[#0071e3] text-white hover:bg-[#0077ed]"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Adding app
                    </>
                  ) : (
                    <>
                      {step === 4 ? "Add My App" : "Continue"}
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </footer>
          )}
        </section>
      </motion.div>
    </div>
  );
};

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-transparent bg-[#f3f6fb] px-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/22 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:bg-white/10";

const WizardPanel: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <motion.div
    initial={{ opacity: 0, x: 18 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -18 }}
    transition={{ duration: 0.18 }}
    className="space-y-8"
  >
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white sm:text-3xl">
        {title}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-white/58">
        {subtitle}
      </p>
    </div>
    {children}
  </motion.div>
);

const Field: React.FC<{
  label: string;
  helper: string;
  children: React.ReactNode;
}> = ({ label, helper, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-[#0f172a] dark:text-white">
      {label}
    </span>
    <span className="mb-2 mt-1 block text-xs leading-5 text-[#64748b] dark:text-white/48">
      {helper}
    </span>
    {children}
  </label>
);

const InfoCard: React.FC<{
  icon: React.ElementType;
  title: string;
  body: string;
  tone: "blue" | "emerald" | "amber";
}> = ({ icon: Icon, title, body, tone }) => {
  const tones = {
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/52">
        {body}
      </p>
    </div>
  );
};

const CheckRow: React.FC<{
  checked: boolean;
  onChange: () => void;
  title: string;
  body: string;
}> = ({ checked, onChange, title, body }) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
      checked
        ? "border-emerald-500/20 bg-emerald-50 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10"
        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    }`}
  >
    <div className="flex gap-3">
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
          checked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white text-transparent dark:border-white/18 dark:bg-white/[0.03]"
        }`}
      >
        <Check size={14} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/52">
          {body}
        </p>
      </div>
    </div>
  </button>
);

const ReviewItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </p>
  </div>
);
