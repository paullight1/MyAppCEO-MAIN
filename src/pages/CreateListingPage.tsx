import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Upload,
  Sparkles,
  Zap,
  ShieldCheck,
  Globe,
  DollarSign,
  TrendingUp,
  Lock,
  AlertCircle,
  Loader2,
  Image,
  Video,
  Code,
  Users,
  FileText,
  Info,
  Store,
  Search,
  Eye,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketplace } from "../hooks/useMarketplace";
import { usePayments } from "../hooks/usePayments";
import { useAI } from "../hooks/useAI";
import { Listing } from "../../../../packages/types/src";
import { useExternalApps } from "../hooks/useExternalApps";
import { ExternalStoreApp, StorePlatform } from "../types/externalApp";
import { validateUrl } from "../utils/security";
import {
  buildStoreImportSnapshot,
  monthsSince,
  normalizeStoreCategory,
  parseStoreAppReference,
  storeSourceLabel,
} from "../utils/storeImport";

const CATEGORIES = [
  { name: "SaaS", icon: Zap },
  { name: "AI Tool", icon: Sparkles },
  { name: "Game", icon: ShieldCheck },
  { name: "Mobile App", icon: Globe },
];

const TECH_STACK_OPTIONS = [
  "React",
  "Vue",
  "Next.js",
  "Node.js",
  "Python",
  "Django",
  "FastAPI",
  "Go",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "Supabase",
  "Firebase",
];

export const CreateListingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [showGuide, setShowGuide] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "SaaS",
    description: "",
    shortDescription: "",
    imageUrl: "",
    screenshots: [] as string[],
    demoVideoUrl: "",
    appStoreUrl: "",
    playStoreUrl: "",
    storeMetadata: {} as Record<string, any>,
    techStack: [] as string[],
    repositoryUrl: "",
    documentationUrl: "",
    listingType: "sale" as "sale" | "investment" | "both",
    askingPrice: "",
    minimumOffer: "",
    targetRaise: "",
    monthlyRevenue: "",
    ageMonths: "12",
    totalUsers: "1000",
    revenueVerified: false,
    revenueEvidenceUrl: "",
    revenueEvidenceStatus: "not_submitted",
    equityAvailable: "",
    trafficMetrics: {
      monthlyVisitors: "",
      bounceRate: "",
      avgSessionDuration: "",
    },
    unitEconomics: {
      cac: "",
      ltv: "",
      mrrChurn: "",
    },
    handoverReadiness: {
      hostingProvider: "",
      domainRegistrar: "",
      hasDbSchema: false,
      hasSop: false,
    },
    termsAccepted: false,
    termsPolicyVersion: "marketplace-terms-2026-05",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const marketplaceActions = useMarketplace() as ReturnType<
    typeof useMarketplace
  > & {
    saveListingDraft?: (formData: any) => Promise<any>;
    submitListingForReview?: (id: string) => Promise<any>;
  };
  const {
    createListing,
    uploadImage,
    isLoading: marketplaceLoading,
    error: apiError,
  } = marketplaceActions;
  const { connectStripe, isLoading: paymentsLoading } = usePayments();
  const { getValuationSuggestion, isLoading: aiLoading } = useAI();
  const {
    getExternalApp,
    searchExternalApps,
    isLoading: importingStore,
  } = useExternalApps();

  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [storeImportValue, setStoreImportValue] = useState("");
  const [storeImportPlatform, setStoreImportPlatform] =
    useState<Exclude<StorePlatform, "all">>("ios");
  const [storeImportError, setStoreImportError] = useState<string | null>(null);
  const [importedStoreApp, setImportedStoreApp] =
    useState<ExternalStoreApp | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const platform = searchParams.get("storePlatform") as Exclude<
      StorePlatform,
      "all"
    > | null;
    const id = searchParams.get("storeId");
    const country = searchParams.get("country") || "US";

    if ((platform === "ios" || platform === "android") && id) {
      loadStoreApp(platform, id, country);
    }
  }, [searchParams]);

  const buildListingPayload = (status: "draft" | "pending_review") => ({
    ...formData,
    status,
    imageUrl: formData.imageUrl,
    screenshots: screenshotUrls.slice(0, 8),
    termsAcceptedAt: formData.termsAccepted
      ? new Date().toISOString()
      : undefined,
  });

  const validateStep = () => {
    if (step === 1 && (!formData.name.trim() || !formData.description.trim())) {
      return "Add the listing name and description before continuing.";
    }
    if (
      step === 2 &&
      !["sale", "investment", "both"].includes(formData.listingType)
    ) {
      return "Choose whether this listing is for sale, investment, or both.";
    }
    if (step === 3 && screenshotUrls.length > 8) {
      return "Listings support up to 8 screenshots.";
    }
    if (step === 4 && Number(formData.ageMonths) < 0) {
      return "Project age must be zero or greater.";
    }
    if (step === 6) {
      if (!formData.termsAccepted)
        return "Accept the marketplace listing terms before submitting for review.";
      if (
        (formData.listingType === "sale" || formData.listingType === "both") &&
        Number(formData.askingPrice) <= 0
      ) {
        return "Enter a valid asking price.";
      }
      if (
        (formData.listingType === "sale" || formData.listingType === "both") &&
        formData.minimumOffer &&
        Number(formData.minimumOffer) > Number(formData.askingPrice)
      ) {
        return "Minimum offer cannot be greater than the asking price.";
      }
      if (
        (formData.listingType === "investment" ||
          formData.listingType === "both") &&
        Number(formData.targetRaise || formData.askingPrice) <= 0
      ) {
        return "Enter a valid target raise for investment listings.";
      }
      if (
        (formData.listingType === "investment" ||
          formData.listingType === "both") &&
        Number(formData.equityAvailable) <= 0
      ) {
        return "Enter the equity available for investment listings.";
      }
    }
    return null;
  };

  const persistListing = async (status: "draft" | "pending_review") => {
    setFormError(null);
    const saveDraft = marketplaceActions.saveListingDraft || createListing;
    const result = await saveDraft(buildListingPayload(status));
    const listingId = result?.data?.data?.id || result?.data?.id;

    if (
      status === "pending_review" &&
      listingId &&
      marketplaceActions.submitListingForReview
    ) {
      await marketplaceActions.submitListingForReview(listingId);
    }

    return result;
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    const result = await persistListing("draft");
    setIsSubmitting(false);
    if (result?.success) {
      navigate("/manage-listings");
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationMessage = validateStep();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    setFormError(null);

    if (step < 6) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      const result = await persistListing("pending_review");
      setIsSubmitting(false);
      if (result?.success) {
        navigate("/manage-listings");
      }
    }
  };

  const updateForm = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateNestedForm = (parent: string, key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as Record<string, any>),
        [key]: value,
      },
    }));
  };

  const applyStoreApp = (app: ExternalStoreApp) => {
    const snapshot = buildStoreImportSnapshot(app);
    const screenshots = snapshot.screenshots.filter(Boolean);

    setFormData((prev) => ({
      ...prev,
      name: snapshot.name || prev.name,
      category: normalizeStoreCategory(snapshot.category),
      description: snapshot.description || prev.description,
      shortDescription: snapshot.shortDescription || prev.shortDescription,
      imageUrl: snapshot.artworkUrl || snapshot.iconUrl || prev.imageUrl,
      screenshots,
      ageMonths: monthsSince(snapshot.releaseDate),
      appStoreUrl:
        snapshot.platform === "ios" ? snapshot.storeUrl : prev.appStoreUrl,
      playStoreUrl:
        snapshot.platform === "android" ? snapshot.storeUrl : prev.playStoreUrl,
      storeMetadata: snapshot.metadata,
    }));

    setScreenshotUrls(screenshots);
    setImportedStoreApp(app);
    setStoreImportValue(snapshot.storeUrl || snapshot.storeId);
    setStoreImportError(null);
  };

  const loadStoreApp = async (
    platform: Exclude<StorePlatform, "all">,
    id: string,
    country = "US",
  ) => {
    setStoreImportError(null);
    const result = await getExternalApp(platform, id, country);
    const app = result?.data?.data;

    if (app) {
      applyStoreApp(app);
    } else {
      setStoreImportError(
        "No app metadata was returned for that store reference.",
      );
    }
  };

  const handleStoreImport = async () => {
    const input = storeImportValue.trim();
    if (!input) {
      setStoreImportError(
        "Paste a store URL, package name, App Store ID, or app name.",
      );
      return;
    }

    try {
      setStoreImportError(null);
      const parsed = parseStoreAppReference(input);

      if (parsed) {
        await loadStoreApp(parsed.platform, parsed.id);
        return;
      }

      const result = await searchExternalApps({
        term: input,
        platform: storeImportPlatform,
        country: "US",
        limit: 5,
      });
      const app = result?.data?.data?.apps?.[0];

      if (!app) {
        setStoreImportError(
          "No matching store app was found. Try a direct App Store or Play Store URL.",
        );
        return;
      }

      applyStoreApp(app);
    } catch (err) {
      setStoreImportError(
        err instanceof Error ? err.message : "Store import failed.",
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const result = await uploadImage(file);
      if (result.success && result.data?.data) {
        updateForm("imageUrl", result.data.data.url);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleScreenshotChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      const selectedFiles = Array.from(files);
      if (screenshotUrls.length + selectedFiles.length > 8) {
        setFormError("Listings support up to 8 screenshots.");
        return;
      }
      const uploadPromises = selectedFiles.map((file) => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const urls = results
        .filter((r) => r.success && r.data?.data)
        .map((r) => r.data!.data.url);
      setScreenshotUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Screenshot upload failed", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRevenueEvidenceChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const result = await uploadImage(file, {
        purpose: "revenue_evidence",
        path: "listings/drafts/private/revenue-evidence",
      } as any);
      const url = result?.data?.data?.url;
      if (result?.success && url) {
        updateForm("revenueEvidenceUrl", url);
        updateForm("revenueEvidenceStatus", "pending_review");
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Revenue evidence upload failed.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleConnectStripe = async () => {
    const result = await connectStripe();
    if (result?.data?.url) {
      window.location.href = result.data.url;
    }
  };

  const handleSuggestValuation = async () => {
    if (!formData.monthlyRevenue || !formData.name) return;

    const result = await getValuationSuggestion({
      name: formData.name,
      category: formData.category,
      monthlyRevenue: parseFloat(formData.monthlyRevenue),
      description: formData.description,
    });

    if (result?.data) {
      updateForm("askingPrice", result.data.suggestedPrice.toString());
      setAiInsight(result.data.insight);
    }
  };

  const toggleTechStack = (tech: string) => {
    setFormData((prev) => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter((t) => t !== tech)
        : [...prev.techStack, tech],
    }));
  };

  const isLoading =
    marketplaceLoading ||
    paymentsLoading ||
    aiLoading ||
    isSubmitting ||
    importingStore;

  const previewListing: Partial<Listing> = {
    id: "preview",
    sellerId: "you",
    name: formData.name || "Your App Name",
    category: formData.category,
    shortDescription:
      formData.shortDescription ||
      (formData.description
        ? formData.description.substring(0, 100) + "..."
        : "A compelling summary..."),
    longDescription: formData.description,
    imageUrl:
      formData.imageUrl ||
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    listingType: formData.listingType,
    askingPrice: formData.askingPrice ? parseInt(formData.askingPrice) : null,
    targetRaise: formData.targetRaise ? parseInt(formData.targetRaise) : null,
    equityAvailable:
      formData.listingType !== "sale"
        ? formData.equityAvailable
          ? parseInt(formData.equityAvailable)
          : 15
        : null,
    monthlyRevenue: formData.monthlyRevenue
      ? parseInt(formData.monthlyRevenue)
      : 0,
    revenueVerified: formData.revenueVerified,
    ageMonths: parseInt(formData.ageMonths),
    totalUsers: parseInt(formData.totalUsers),
    status: formData.termsAccepted ? "pending_review" : "draft",
    createdAt: new Date().toISOString(),
  };

  const steps = [
    { num: 1, title: "Identity", desc: "Basic info" },
    { num: 2, title: "Type", desc: "Sale or raise" },
    { num: 3, title: "Media", desc: "Assets & tech" },
    { num: 4, title: "Finance", desc: "Revenue data" },
    { num: 5, title: "Metrics", desc: "Verification" },
    { num: 6, title: "Preview", desc: "Terms & submit" },
  ];

  return (
    <Layout>
      <div className="-mt-8 -mx-4 md:-mx-6">
        {/* Hero - Black */}
        <section className="bg-black dark:bg-[#000000] min-h-[40dvh] py-20 px-6 transition-colors duration-300">
          <div className="max-w-[980px] mx-auto">
            <Link
              to="/marketplace"
              className="text-[#0071e3] text-[14px] hover:underline inline-flex items-center gap-1 mb-12"
            >
              <ArrowLeft size={16} /> Back to Marketplace
            </Link>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-white text-4xl md:text-6xl font-semibold leading-[1.07] tracking-[-0.028em]">
                List Your App.
              </h1>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-transparent text-white text-[17px] font-normal rounded-full border border-white/30 hover:border-white/50 transition-all"
              >
                <Info size={16} /> {showGuide ? "Close Guide" : "How it Works"}
              </button>
            </div>

            <p className="text-white/80 text-[21px] font-normal leading-[1.19] tracking-[0.0231px] max-w-[65ch]">
              Complete all 6 steps to create a professional listing that
              attracts serious buyers.
            </p>
          </div>
        </section>

        {/* Guide - Dark */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#1d1d1f] dark:bg-[#2a2a2d] px-6 py-16 transition-colors duration-300"
            >
              <div className="max-w-[980px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071e3]/10 rounded-full border border-[#0071e3]/20 text-[12px] font-semibold uppercase tracking-wide text-[#0071e3]">
                      6-Step Wizard
                    </div>
                    <h3 className="text-white text-[40px] font-semibold leading-[1.1]">
                      The Complete Listing Journey
                    </h3>
                    <div className="space-y-4">
                      {steps.map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-8 h-8 rounded-[4px] bg-[#0071e3] flex items-center justify-center text-[12px] font-semibold text-white shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-[17px] text-white font-normal">
                              {item.title}
                            </p>
                            <p className="text-[14px] text-white/60">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/[0.05] rounded-[8px] p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[4px] bg-[#0071e3] flex items-center justify-center text-white text-[21px] font-semibold">
                        S
                      </div>
                      <div>
                        <p className="text-[17px] text-white font-normal">
                          Sarah's Success Story
                        </p>
                        <p className="text-[12px] text-white/48">
                          SaaS Founder
                        </p>
                      </div>
                    </div>
                    <p className="text-[14px] text-white/80 leading-[1.47] italic">
                      "The 6-step wizard helped me present everything buyers
                      needed. I had 3 offers within 48 hours. The verification
                      badges gave buyers instant confidence."
                    </p>
                    <div className="flex justify-between items-center pt-6 border-t border-white/[0.1]">
                      <div>
                        <p className="text-[12px] text-white/48 uppercase tracking-wide">
                          Final Sale
                        </p>
                        <p className="text-[40px] text-emerald-400 font-semibold leading-[1.1]">
                          ₦60,000,000
                        </p>
                      </div>
                      <span className="text-[12px] font-semibold text-emerald-400 bg-emerald-500/20 px-3 py-1.5 rounded-full">
                        VERIFIED
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Steps - Light */}
        <section className="bg-[#f5f5f7] dark:bg-[#1d1d1f] py-12 px-6 border-t border-[#1d1d1f]/[0.08] dark:border-white/[0.08] transition-colors duration-300">
          <div className="max-w-[980px] mx-auto">
            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#1d1d1f]/[0.08] dark:bg-white/[0.08] rounded-full transition-colors duration-300" />
              <motion.div
                className="absolute top-0 left-0 h-1 bg-[#0071e3] rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${(step / 6) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />

              <div className="flex justify-between pt-8">
                {steps.map((s) => (
                  <div
                    key={s.num}
                    className="flex flex-col items-center gap-3 text-center"
                  >
                    <div
                      className={`w-10 h-10 rounded-[8px] flex items-center justify-center text-[17px] font-semibold transition-all duration-300 ${step > s.num ? "bg-emerald-500 text-white" : step === s.num ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] dark:bg-[#2a2a2d] text-[#1d1d1f]/48 dark:text-white/48 transition-colors duration-300"}`}
                    >
                      {step > s.num ? <CheckCircle2 size={18} /> : s.num}
                    </div>
                    <div>
                      <p
                        className={`text-[12px] font-normal transition-colors duration-300 ${step >= s.num ? "text-[#1d1d1f] dark:text-white" : "text-[#1d1d1f]/48 dark:text-white/48"}`}
                      >
                        {s.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Form Content - Light */}
        <section className="bg-[#f5f5f7] dark:bg-[#1d1d1f] py-20 px-6 transition-colors duration-300">
          <div className="max-w-[980px] mx-auto">
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-[8px] flex gap-3 text-red-400 text-[14px] mb-8">
                <AlertCircle size={18} className="shrink-0" />
                <p>{apiError}</p>
              </div>
            )}
            {formError && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-[8px] flex gap-3 text-amber-500 text-[14px] mb-8">
                <AlertCircle size={18} className="shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <div className="bg-white dark:bg-[#2a2a2d] rounded-[8px] p-8 md:p-12 min-h-[400px] transition-colors duration-300">
              <form onSubmit={handleNext} className="space-y-8">
                <AnimatePresence mode="wait">
                  {/* Step 1 */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] mb-2 transition-colors duration-300">
                          Step 1: Basic Identity
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                          Give your project a name and define its market
                          category.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="rounded-[8px] border border-[#1d1d1f]/[0.08] bg-[#f5f5f7] p-5 transition-colors duration-300 dark:border-white/[0.08] dark:bg-[#1d1d1f]">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f] transition-colors duration-300 dark:text-white">
                                <Store size={16} className="text-[#0071e3]" />{" "}
                                Import real store details
                              </p>
                              <p className="mt-1 text-[13px] leading-5 text-[#1d1d1f]/55 transition-colors duration-300 dark:text-white/55">
                                Pull the name, icon, screenshots, category,
                                description, and store link from Apple App Store
                                or Google Play.
                              </p>
                            </div>
                            <div className="flex rounded-full bg-white p-1 dark:bg-[#2a2a2d]">
                              {(
                                ["ios", "android"] as Exclude<
                                  StorePlatform,
                                  "all"
                                >[]
                              ).map((platform) => (
                                <button
                                  key={platform}
                                  type="button"
                                  onClick={() =>
                                    setStoreImportPlatform(platform)
                                  }
                                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${storeImportPlatform === platform ? "bg-[#0071e3] text-white" : "text-[#1d1d1f]/55 hover:text-[#1d1d1f] dark:text-white/55 dark:hover:text-white"}`}
                                >
                                  {platform === "ios"
                                    ? "App Store"
                                    : "Play Store"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                              type="text"
                              value={storeImportValue}
                              onChange={(e) =>
                                setStoreImportValue(e.target.value)
                              }
                              placeholder="Paste store URL, app ID, package name, or search by app name"
                              className="min-w-0 flex-1 rounded-[8px] border-none bg-white px-4 py-3 text-[14px] text-[#1d1d1f] outline-none transition-all placeholder:text-[#1d1d1f]/30 focus:ring-2 focus:ring-[#0071e3]/20 dark:bg-[#2a2a2d] dark:text-white dark:placeholder:text-white/30"
                            />
                            <button
                              type="button"
                              onClick={handleStoreImport}
                              disabled={isLoading}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#0077ed] disabled:opacity-60"
                            >
                              {importingStore ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Search size={16} />
                              )}
                              Import
                            </button>
                          </div>

                          {storeImportError ? (
                            <p className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-red-500">
                              <AlertCircle
                                size={15}
                                className="mt-0.5 shrink-0"
                              />{" "}
                              {storeImportError}
                            </p>
                          ) : null}

                          {importedStoreApp ? (
                            <div className="mt-4 flex items-center gap-3 rounded-[8px] bg-white p-3 dark:bg-[#2a2a2d]">
                              <img
                                src={
                                  importedStoreApp.iconUrl ||
                                  importedStoreApp.artworkUrl
                                }
                                alt=""
                                className="h-12 w-12 rounded-[12px] object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                                  {importedStoreApp.name}
                                </p>
                                <p className="truncate text-[12px] text-[#1d1d1f]/50 dark:text-white/50">
                                  Imported from{" "}
                                  {storeSourceLabel(importedStoreApp)} by{" "}
                                  {importedStoreApp.developer}
                                </p>
                              </div>
                              {importedStoreApp.storeUrl &&
                              validateUrl(importedStoreApp.storeUrl) ? (
                                <a
                                  href={importedStoreApp.storeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-[12px] font-semibold text-[#0071e3] hover:underline"
                                >
                                  Source
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                            Official Name
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateForm("name", e.target.value)}
                            placeholder="e.g., TaskFlow Pro"
                            className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                          />
                        </div>

                        <div>
                          <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                            Short Summary
                          </label>
                          <input
                            type="text"
                            value={formData.shortDescription}
                            onChange={(e) =>
                              updateForm("shortDescription", e.target.value)
                            }
                            placeholder="One-line store summary for marketplace cards"
                            className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                          />
                        </div>

                        <div>
                          <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                            Market Category
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {CATEGORIES.map((cat) => {
                              const Icon = cat.icon;
                              const isSelected = formData.category === cat.name;
                              return (
                                <button
                                  key={cat.name}
                                  type="button"
                                  onClick={() =>
                                    updateForm("category", cat.name)
                                  }
                                  className={`p-6 rounded-[8px] text-center transition-all ${isSelected ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f]/60 dark:text-white/60 hover:text-[#1d1d1f] dark:hover:text-white transition-colors duration-300"}`}
                                >
                                  <Icon size={24} className="mx-auto mb-3" />
                                  <span className="text-[14px] font-normal">
                                    {cat.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                            Description
                          </label>
                          <textarea
                            required
                            value={formData.description}
                            onChange={(e) =>
                              updateForm("description", e.target.value)
                            }
                            placeholder="Describe what your project does..."
                            rows={4}
                            className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] p-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none resize-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] mb-2 transition-colors duration-300">
                          Step 2: Listing Type
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                          Choose whether buyers can acquire the app, invest in
                          it, or do both.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                          {
                            value: "sale",
                            title: "Full Acquisition",
                            body: "Sell 100% of the app through escrow.",
                            icon: DollarSign,
                          },
                          {
                            value: "investment",
                            title: "Growth Funding",
                            body: "Raise capital while keeping operating control.",
                            icon: TrendingUp,
                          },
                          {
                            value: "both",
                            title: "Sale + Investment",
                            body: "Accept acquisition offers and investment offers.",
                            icon: ShieldCheck,
                          },
                        ].map((option) => {
                          const Icon = option.icon;
                          const selected =
                            formData.listingType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                updateForm("listingType", option.value)
                              }
                              className={`rounded-[8px] p-6 text-left transition-all ${selected ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]/65 hover:text-[#1d1d1f] dark:bg-[#1d1d1f] dark:text-white/65 dark:hover:text-white"}`}
                            >
                              <div
                                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[8px] ${selected ? "bg-white/20" : "bg-white dark:bg-[#2a2a2d]"}`}
                              >
                                <Icon size={23} />
                              </div>
                              <p className="text-[19px] font-semibold">
                                {option.title}
                              </p>
                              <p className="mt-2 text-[14px] leading-5 opacity-75">
                                {option.body}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] mb-2 transition-colors duration-300">
                          Step 3: Media & Assets
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                          Upload visuals and define your technology stack.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Cover Image
                            </label>
                            <div className="relative aspect-video bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[8px] overflow-hidden transition-colors duration-300">
                              {formData.imageUrl ? (
                                <img
                                  src={formData.imageUrl}
                                  alt="Cover"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-[#1d1d1f]/48 dark:text-white/48 gap-2 transition-colors duration-300">
                                  <Image size={32} />
                                  <span className="text-[14px]">
                                    Upload cover image
                                  </span>
                                </div>
                              )}
                              {uploadingImage && (
                                <div className="absolute inset-0 bg-white/60 dark:bg-[#2a2a2d]/60 flex items-center justify-center transition-colors duration-300">
                                  <Loader2
                                    size={24}
                                    className="text-[#0071e3] animate-spin"
                                  />
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                aria-label="Upload cover image"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Demo Video URL
                            </label>
                            <input
                              type="url"
                              value={formData.demoVideoUrl}
                              onChange={(e) =>
                                updateForm("demoVideoUrl", e.target.value)
                              }
                              placeholder="https://youtube.com/..."
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />

                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 mt-6 block transition-colors duration-300">
                              Store URL
                            </label>
                            <input
                              type="url"
                              value={
                                formData.appStoreUrl || formData.playStoreUrl
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                const parsed = parseStoreAppReference(value);
                                if (parsed?.platform === "android") {
                                  updateForm("playStoreUrl", value);
                                  updateForm("appStoreUrl", "");
                                } else {
                                  updateForm("appStoreUrl", value);
                                  updateForm("playStoreUrl", "");
                                }
                              }}
                              placeholder="https://apps.apple.com/... or https://play.google.com/..."
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />

                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 mt-6 block transition-colors duration-300">
                              Screenshots
                            </label>
                            <div className="flex flex-wrap gap-3">
                              {screenshotUrls.map((url, i) => (
                                <div
                                  key={i}
                                  className="relative w-16 h-16 rounded-[8px] overflow-hidden bg-[#f5f5f7] dark:bg-[#1d1d1f] transition-colors duration-300"
                                >
                                  <img
                                    src={url}
                                    alt={`Screenshot ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setScreenshotUrls((prev) =>
                                        prev.filter((_, idx) => idx !== i),
                                      )
                                    }
                                    aria-label={`Remove screenshot ${i + 1}`}
                                    className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-[#1d1d1f] shadow hover:text-red-500 dark:bg-[#2a2a2d]/90 dark:text-white"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              <label className="w-16 h-16 rounded-[8px] bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center cursor-pointer hover:bg-[#0071e3]/10 transition-all transition-colors duration-300">
                                <Upload
                                  size={18}
                                  className="text-[#1d1d1f]/48 dark:text-white/48"
                                />
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleScreenshotChange}
                                  aria-label="Upload screenshots"
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                            Tech Stack
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {TECH_STACK_OPTIONS.map((tech) => (
                              <button
                                key={tech}
                                type="button"
                                onClick={() => toggleTechStack(tech)}
                                className={`px-4 py-2 rounded-full text-[14px] font-normal transition-all ${formData.techStack.includes(tech) ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f]/60 dark:text-white/60 hover:text-[#1d1d1f] dark:hover:text-white transition-colors duration-300"}`}
                              >
                                {tech}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Repository URL
                            </label>
                            <input
                              type="url"
                              value={formData.repositoryUrl}
                              onChange={(e) =>
                                updateForm("repositoryUrl", e.target.value)
                              }
                              placeholder="https://github.com/..."
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Documentation URL
                            </label>
                            <input
                              type="url"
                              value={formData.documentationUrl}
                              onChange={(e) =>
                                updateForm("documentationUrl", e.target.value)
                              }
                              placeholder="https://docs..."
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4 */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] mb-2 transition-colors duration-300">
                          Step 4: Financial Data
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                          Share revenue metrics and verify with Stripe.
                        </p>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[8px] flex gap-5">
                        <div className="w-14 h-14 bg-emerald-500 rounded-[8px] flex items-center justify-center shrink-0">
                          <Lock size={24} className="text-white" />
                        </div>
                        <div>
                          <p className="text-emerald-400 text-[12px] uppercase tracking-wide font-semibold">
                            Secured Data Integration
                          </p>
                          <p className="text-emerald-400/80 text-[14px] mt-1">
                            Verified revenue streams increase buyer confidence
                            by +85%.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Monthly Revenue (₦)
                            </label>
                            <input
                              type="number"
                              disabled={formData.revenueVerified}
                              value={formData.monthlyRevenue}
                              onChange={(e) =>
                                updateForm("monthlyRevenue", e.target.value)
                              }
                              placeholder="0"
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all disabled:opacity-50 placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Total Users
                            </label>
                            <input
                              type="number"
                              value={formData.totalUsers}
                              onChange={(e) =>
                                updateForm("totalUsers", e.target.value)
                              }
                              placeholder="1000"
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Project Age (Months)
                            </label>
                            <input
                              type="number"
                              value={formData.ageMonths}
                              onChange={(e) =>
                                updateForm("ageMonths", e.target.value)
                              }
                              placeholder="12"
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleConnectStripe}
                          disabled={isLoading || formData.revenueVerified}
                          className="w-full bg-[#635BFF] hover:bg-[#5851e0] text-white p-5 rounded-[8px] text-[14px] font-normal flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                        >
                          {paymentsLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <>
                              <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center text-[12px] font-semibold">
                                S
                              </div>
                              {formData.revenueVerified
                                ? "Revenue Verified"
                                : "Verify Revenue with Stripe"}
                            </>
                          )}
                        </button>

                        <div className="rounded-[8px] border border-[#1d1d1f]/[0.08] bg-[#f5f5f7] p-5 transition-colors duration-300 dark:border-white/[0.08] dark:bg-[#1d1d1f]">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">
                                Private revenue evidence
                              </p>
                              <p className="mt-1 text-[13px] leading-5 text-[#1d1d1f]/55 dark:text-white/55">
                                Upload statements or dashboard exports for
                                review. These remain private until approved.
                              </p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#1d1d1f] shadow-sm transition-all hover:text-[#0071e3] dark:bg-[#2a2a2d] dark:text-white">
                              <Upload size={16} />
                              Upload
                              <input
                                type="file"
                                accept="image/*,.pdf,.csv"
                                onChange={handleRevenueEvidenceChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                          {formData.revenueEvidenceUrl ? (
                            <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-amber-500">
                              Evidence status:{" "}
                              {formData.revenueEvidenceStatus.replace("_", " ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5 */}
                  {step === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] mb-2 transition-colors duration-300">
                          Step 5: Metrics & Verification
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                          Add detailed metrics to boost buyer confidence.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[8px] p-6 space-y-4 transition-colors duration-300">
                          <h3 className="text-[14px] text-[#1d1d1f] dark:text-white font-normal flex items-center gap-2 transition-colors duration-300">
                            <Users size={16} className="text-[#0071e3]" />{" "}
                            Traffic Metrics
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                Monthly Visitors
                              </label>
                              <input
                                type="number"
                                value={formData.trafficMetrics.monthlyVisitors}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "trafficMetrics",
                                    "monthlyVisitors",
                                    e.target.value,
                                  )
                                }
                                placeholder="5000"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                Bounce Rate (%)
                              </label>
                              <input
                                type="number"
                                value={formData.trafficMetrics.bounceRate}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "trafficMetrics",
                                    "bounceRate",
                                    e.target.value,
                                  )
                                }
                                placeholder="45"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                Avg Session (min)
                              </label>
                              <input
                                type="number"
                                value={
                                  formData.trafficMetrics.avgSessionDuration
                                }
                                onChange={(e) =>
                                  updateNestedForm(
                                    "trafficMetrics",
                                    "avgSessionDuration",
                                    e.target.value,
                                  )
                                }
                                placeholder="3.5"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[8px] p-6 space-y-4 transition-colors duration-300">
                          <h3 className="text-[14px] text-[#1d1d1f] dark:text-white font-normal flex items-center gap-2 transition-colors duration-300">
                            <DollarSign size={16} className="text-[#0071e3]" />{" "}
                            Unit Economics
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                CAC (₦)
                              </label>
                              <input
                                type="number"
                                value={formData.unitEconomics.cac}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "unitEconomics",
                                    "cac",
                                    e.target.value,
                                  )
                                }
                                placeholder="25"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                LTV (₦)
                              </label>
                              <input
                                type="number"
                                value={formData.unitEconomics.ltv}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "unitEconomics",
                                    "ltv",
                                    e.target.value,
                                  )
                                }
                                placeholder="150"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                MRR Churn (%)
                              </label>
                              <input
                                type="number"
                                value={formData.unitEconomics.mrrChurn}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "unitEconomics",
                                    "mrrChurn",
                                    e.target.value,
                                  )
                                }
                                placeholder="2.5"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[8px] p-6 space-y-4 transition-colors duration-300">
                          <h3 className="text-[14px] text-[#1d1d1f] dark:text-white font-normal flex items-center gap-2 transition-colors duration-300">
                            <ShieldCheck size={16} className="text-[#0071e3]" />{" "}
                            Handover Readiness
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                Hosting Provider
                              </label>
                              <input
                                type="text"
                                value={formData.handoverReadiness.hostingProvider}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "handoverReadiness",
                                    "hostingProvider",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Vercel, AWS"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-2 block transition-colors duration-300">
                                Domain Registrar
                              </label>
                              <input
                                type="text"
                                value={formData.handoverReadiness.domainRegistrar}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "handoverReadiness",
                                    "domainRegistrar",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Namecheap"
                                className="w-full bg-white dark:bg-[#2a2a2d] border-none rounded-[8px] py-3 px-4 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-colors duration-300"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6 pt-1">
                            <label className="flex items-center gap-3 text-[14px] text-[#1d1d1f] dark:text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.handoverReadiness.hasDbSchema}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "handoverReadiness",
                                    "hasDbSchema",
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 accent-[#0071e3]"
                              />
                              Database schema documented
                            </label>
                            <label className="flex items-center gap-3 text-[14px] text-[#1d1d1f] dark:text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.handoverReadiness.hasSop}
                                onChange={(e) =>
                                  updateNestedForm(
                                    "handoverReadiness",
                                    "hasSop",
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 accent-[#0071e3]"
                              />
                              Standard operating procedures ready
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 6 */}
                  {step === 6 && (
                    <motion.div
                      key="step6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] mb-2 transition-colors duration-300">
                          Step 6: Preview & Terms
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                          Finalize your ask and set the terms of engagement.
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              {formData.listingType === "sale" ||
                              formData.listingType === "both"
                                ? "Asking Price (₦)"
                                : "Reference Valuation (₦)"}
                            </label>
                            <input
                              type="number"
                              value={formData.askingPrice}
                              onChange={(e) =>
                                updateForm("askingPrice", e.target.value)
                              }
                              placeholder="50000"
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                              Minimum Offer (₦)
                            </label>
                            <input
                              type="number"
                              value={formData.minimumOffer}
                              onChange={(e) =>
                                updateForm("minimumOffer", e.target.value)
                              }
                              placeholder="25000"
                              className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                            />
                          </div>
                          {(formData.listingType === "investment" ||
                            formData.listingType === "both") && (
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                                Target Raise (₦)
                              </label>
                              <input
                                type="number"
                                value={formData.targetRaise}
                                onChange={(e) =>
                                  updateForm("targetRaise", e.target.value)
                                }
                                placeholder="100000"
                                className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                              />
                            </div>
                          )}
                          {(formData.listingType === "investment" ||
                            formData.listingType === "both") && (
                            <div>
                              <label className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide mb-3 block transition-colors duration-300">
                                Equity Available (%)
                              </label>
                              <input
                                type="number"
                                value={formData.equityAvailable}
                                onChange={(e) =>
                                  updateForm("equityAvailable", e.target.value)
                                }
                                placeholder="15"
                                className="w-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-none rounded-[8px] py-4 px-5 text-[17px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all placeholder:text-[#1d1d1f]/30 dark:placeholder:text-white/30"
                              />
                            </div>
                          )}
                        </div>

                        {formData.monthlyRevenue && (
                          <button
                            type="button"
                            onClick={handleSuggestValuation}
                            disabled={isLoading}
                            className="w-full bg-[#0071e3]/10 text-[#0071e3] p-5 rounded-[8px] text-[14px] font-normal flex items-center justify-center gap-3 transition-all hover:bg-[#0071e3]/20"
                          >
                            {aiLoading ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <>
                                <Sparkles size={18} />
                                Get AI Valuation Suggestion
                              </>
                            )}
                          </button>
                        )}

                        {aiInsight && (
                          <div className="bg-[#0071e3]/10 border border-[#0071e3]/20 p-6 rounded-[8px] space-y-3">
                            <p className="text-[#0071e3] text-[12px] uppercase tracking-wide font-semibold">
                              AI Insight
                            </p>
                            <p className="text-[#1d1d1f] dark:text-white text-[17px] leading-[1.47] transition-colors duration-300">
                              {aiInsight}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                          <div className="overflow-hidden rounded-[8px] border border-[#1d1d1f]/[0.08] bg-[#f5f5f7] dark:border-white/[0.08] dark:bg-[#1d1d1f]">
                            <div className="aspect-video bg-[#1d1d1f]">
                              <img
                                src={previewListing.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="space-y-3 p-5">
                              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#0071e3]">
                                {previewListing.listingType?.replace("_", " ")}
                              </p>
                              <h3 className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">
                                {previewListing.name}
                              </h3>
                              <p className="text-[14px] leading-6 text-[#1d1d1f]/60 dark:text-white/60">
                                {previewListing.shortDescription}
                              </p>
                              <div className="flex flex-wrap gap-2 pt-2">
                                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#1d1d1f] dark:bg-[#2a2a2d] dark:text-white">
                                  {previewListing.category}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#1d1d1f] dark:bg-[#2a2a2d] dark:text-white">
                                  {screenshotUrls.length}/8 screenshots
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[8px] border border-[#1d1d1f]/[0.08] bg-[#f5f5f7] p-6 dark:border-white/[0.08] dark:bg-[#1d1d1f]">
                            <h3 className="mb-5 flex items-center gap-2 text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                              <Eye size={18} className="text-[#0071e3]" />{" "}
                              Review checklist
                            </h3>
                            <div className="space-y-3 text-[14px] text-[#1d1d1f]/65 dark:text-white/65">
                              {[
                                ["Public listing type", formData.listingType],
                                [
                                  "Revenue visibility",
                                  formData.revenueVerified
                                    ? "verified public badge"
                                    : "private until approved",
                                ],
                                [
                                  "Evidence review",
                                  formData.revenueEvidenceUrl
                                    ? formData.revenueEvidenceStatus.replace(
                                        "_",
                                        " ",
                                      )
                                    : "not submitted",
                                ],
                                [
                                  "Store source",
                                  formData.appStoreUrl || formData.playStoreUrl
                                    ? "linked"
                                    : "not linked",
                                ],
                                [
                                  "Transfer readiness",
                                  formData.handoverReadiness.hasDbSchema ||
                                  formData.handoverReadiness.hasSop
                                    ? "configured"
                                    : "basic checklist",
                                ],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="flex items-center justify-between gap-4 border-b border-[#1d1d1f]/[0.06] pb-3 dark:border-white/[0.08]"
                                >
                                  <span>{label}</span>
                                  <span className="text-right font-semibold text-[#1d1d1f] dark:text-white">
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <label className="mt-6 flex items-start gap-3 rounded-[8px] bg-white p-4 dark:bg-[#2a2a2d]">
                              <input
                                type="checkbox"
                                checked={formData.termsAccepted}
                                onChange={(e) =>
                                  updateForm("termsAccepted", e.target.checked)
                                }
                                className="mt-1 h-4 w-4 accent-[#0071e3]"
                              />
                              <span className="text-[13px] leading-5 text-[#1d1d1f]/70 dark:text-white/70">
                                I accept the marketplace listing terms, escrow
                                process, review rules, and payout readiness
                                requirements under policy{" "}
                                {formData.termsPolicyVersion}.
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-8 border-t border-[#1d1d1f]/[0.08] dark:border-white/[0.08] transition-colors duration-300">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="inline-flex items-center gap-2 text-[#0071e3] text-[17px] font-normal hover:underline"
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isLoading}
                      className="inline-flex rounded-full bg-[#f5f5f7] px-6 py-3 text-[17px] font-normal text-[#1d1d1f] transition-all hover:bg-[#e8e8ed] disabled:opacity-70 dark:bg-[#1d1d1f] dark:text-white"
                    >
                      Save Draft
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-normal rounded-full transition-all disabled:opacity-70"
                    >
                      {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          {step === 6 ? "Submit for Review" : "Continue"}{" "}
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};
