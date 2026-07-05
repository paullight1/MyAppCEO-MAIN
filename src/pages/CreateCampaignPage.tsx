import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  LayoutDashboard,
  Rocket,
  LayoutTemplate,
  Banknote,
  ImagePlus,
  Target,
  Percent,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCrowdfunding } from "../hooks/useCrowdfundingSupabase";
import { useIdeas } from "../hooks/useIdeas";
import { useUserApps, UserAppMembership } from "../hooks/useUserApps";
import { validateCampaignDraft } from "../utils/fundingOwnership";
import { formatCurrency } from "../utils/format";
import { FormField, StatTile, ProgressBar, StatusBadge } from "../components/ui";

type FundingType = "split" | "pay_once";

interface CampaignForm {
  title: string;
  shortDescription: string;
  longDescription: string;
  coverImageUrl: string;
  fundingGoal: string;
  minInvestment: string;
  maxInvestment: string;
  equityOfferedPct: string;
  preMoneyValuation: string;
  fundingType: FundingType;
  durationDays: string;
  maxInvestors: string;
  ideaId: string;
  appId: string;
}

const INPUT_CLASS =
  "w-full px-4 py-3.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium transition-all shadow-sm";
const INPUT_ERROR_CLASS =
  "w-full px-4 py-3.5 bg-card border border-error rounded-xl focus:ring-2 focus:ring-error/20 focus:border-error outline-none font-medium transition-all shadow-sm";

const isValidUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export const CreateCampaignPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ideaId = searchParams.get("ideaId");
  const appId = searchParams.get("appId");
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CampaignForm>({
    title: "",
    shortDescription: "",
    longDescription: "",
    coverImageUrl: "",
    fundingGoal: "",
    minInvestment: "100",
    maxInvestment: "",
    equityOfferedPct: "",
    preMoneyValuation: "",
    fundingType: "split",
    durationDays: "30",
    maxInvestors: "100",
    ideaId: ideaId || "",
    appId: appId || "",
  });
  const [idea, setIdea] = useState<any>(null);
  const [linkedApp, setLinkedApp] = useState<UserAppMembership | null>(null);
  const [appContextLoading, setAppContextLoading] = useState(false);
  const [appContextError, setAppContextError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);

  const { createCampaign } = useCrowdfunding();
  const { getIdeaById } = useIdeas();
  const { getMyApps } = useUserApps();

  useEffect(() => {
    if (ideaId) {
      loadIdea();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  useEffect(() => {
    if (appId) {
      loadLinkedApp();
    } else {
      setLinkedApp(null);
      setAppContextError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const loadIdea = async () => {
    const result = await getIdeaById(ideaId!);
    if (result.success && result.data) {
      const ideaData = (result.data as any).data || result.data;
      setIdea(ideaData);
      setFormData((prev) => ({
        ...prev,
        title: ideaData.title,
        shortDescription: ideaData.description?.substring(0, 150),
        fundingGoal: ideaData.costEstimate?.toString() || "",
      }));
    }
  };

  const loadLinkedApp = async () => {
    setAppContextLoading(true);
    setAppContextError("");

    try {
      const result = await getMyApps();
      if (!result.success || !result.data) {
        setAppContextError("We could not confirm access to this app. Go back to Apps and start the raise from an app you own or co-found.");
        return;
      }

      const appGroups = (result.data as any).data || result.data;
      const allApps: UserAppMembership[] = [
        ...(appGroups.owned || []),
        ...(appGroups.cofounded || []),
      ];
      const match = allApps.find((app) => app.app_id === appId);

      if (!match) {
        setLinkedApp(null);
        setAppContextError("This app could not be found in your workspace, or you do not have permission to raise funding for it.");
        return;
      }

      setLinkedApp(match);
      setFormData((prev) => ({
        ...prev,
        appId: match.app_id,
        title: prev.title || `${match.app_name} funding campaign`,
        shortDescription:
          prev.shortDescription ||
          `Raise funding for ${match.app_name} to accelerate product growth and execution.`,
      }));
    } catch {
      setAppContextError("We could not load this app context. Retry from the app dashboard before creating a funding campaign.");
    } finally {
      setAppContextLoading(false);
    }
  };

  // Inline, per-field validation. Computed every render so messages appear as the
  // user types / blurs — not only after submit.
  const fieldErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    const goal = Number(formData.fundingGoal);
    const valuation = Number(formData.preMoneyValuation);
    const equity = Number(formData.equityOfferedPct);
    const min = Number(formData.minInvestment);
    const max = formData.maxInvestment ? Number(formData.maxInvestment) : null;
    const duration = Number(formData.durationDays);
    const investors = Number(formData.maxInvestors);

    if (!formData.title.trim()) e.title = "Campaign title is required.";
    else if (formData.title.trim().length < 4) e.title = "Campaign title must be at least 4 characters.";

    if (!formData.shortDescription.trim()) e.shortDescription = "An elevator pitch is required.";

    if (formData.coverImageUrl.trim() && !isValidUrl(formData.coverImageUrl.trim()))
      e.coverImageUrl = "Enter a valid image URL (http:// or https://).";

    if (!formData.fundingGoal) e.fundingGoal = "Funding goal is required.";
    else if (!(goal > 0)) e.fundingGoal = "Funding goal must be greater than zero.";

    if (!formData.preMoneyValuation) e.preMoneyValuation = "Pre-money valuation is required.";
    else if (!(valuation > 0)) e.preMoneyValuation = "Valuation must be greater than zero.";

    if (!formData.equityOfferedPct) e.equityOfferedPct = "Equity offered is required.";
    else if (!(equity > 0) || equity > 49) e.equityOfferedPct = "Equity must be greater than 0% and no more than 49%.";

    if (!formData.minInvestment) e.minInvestment = "Minimum investment is required.";
    else if (!(min > 0)) e.minInvestment = "Minimum investment must be greater than zero.";
    else if (goal > 0 && min > goal) e.minInvestment = "Minimum cannot exceed the funding goal.";

    if (max != null && max > 0 && min > 0 && max < min)
      e.maxInvestment = "Maximum cannot be lower than the minimum.";

    if (formData.durationDays && (!Number.isInteger(duration) || duration < 1 || duration > 365))
      e.durationDays = "Duration must be a whole number between 1 and 365 days.";

    if (!formData.maxInvestors) e.maxInvestors = "Maximum investors is required.";
    else if (!Number.isInteger(investors) || investors < 1) e.maxInvestors = "Maximum investors must be at least 1.";

    return e;
  }, [formData]);

  const showError = (field: keyof CampaignForm) =>
    touched[field] ? fieldErrors[field] : undefined;

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const setField = (field: keyof CampaignForm, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const validation = validateCampaignDraft({
      title: formData.title,
      fundingGoal: Number(formData.fundingGoal),
      minInvestment: Number(formData.minInvestment),
      maxInvestment: formData.maxInvestment ? Number(formData.maxInvestment) : undefined,
      equityOfferedPct: Number(formData.equityOfferedPct),
      preMoneyValuation: Number(formData.preMoneyValuation),
      durationDays: Number(formData.durationDays),
      maxInvestors: Number(formData.maxInvestors),
      ideaId: formData.ideaId || undefined,
      appId: formData.appId || undefined,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setLoading(true);
    setValidationErrors([]);
    const result = await createCampaign({
      ...formData,
      fundingGoal: parseFloat(formData.fundingGoal),
      minInvestment: parseFloat(formData.minInvestment),
      maxInvestment: formData.maxInvestment
        ? parseFloat(formData.maxInvestment)
        : undefined,
      equityOfferedPct: parseFloat(formData.equityOfferedPct),
      preMoneyValuation: parseFloat(formData.preMoneyValuation),
      durationDays: parseInt(formData.durationDays),
      maxInvestors: parseInt(formData.maxInvestors),
      ideaId: formData.ideaId || undefined,
      appId: formData.appId || undefined,
    });

    if (result.success && result.data) {
      setCreatedCampaign((result.data as any).data || result.data);
      setStep(4);
    } else if ((result as any).error) {
      setValidationErrors([(result as any).error]);
    }
    setLoading(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return (
          !fieldErrors.title &&
          !fieldErrors.shortDescription &&
          !fieldErrors.coverImageUrl
        );
      case 2:
        return validateCampaignDraft({
          title: formData.title || "Draft",
          fundingGoal: Number(formData.fundingGoal),
          minInvestment: Number(formData.minInvestment),
          maxInvestment: formData.maxInvestment ? Number(formData.maxInvestment) : undefined,
          equityOfferedPct: Number(formData.equityOfferedPct),
          preMoneyValuation: Number(formData.preMoneyValuation),
          durationDays: Number(formData.durationDays),
          maxInvestors: Number(formData.maxInvestors),
          ideaId: formData.ideaId || undefined,
          appId: formData.appId || undefined,
        }).isValid;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Mark every field on the current step as touched so inline errors reveal when
  // the user tries to advance with an invalid step.
  const touchStep = (target: number) => {
    if (target === 1) ["title", "shortDescription", "coverImageUrl"].forEach(markTouched);
    if (target === 2)
      [
        "fundingGoal",
        "preMoneyValuation",
        "equityOfferedPct",
        "durationDays",
        "minInvestment",
        "maxInvestment",
        "maxInvestors",
      ].forEach(markTouched);
  };

  const handleContinue = () => {
    if (!canProceed()) {
      touchStep(step);
      return;
    }
    setStep(step + 1);
  };

  const stepInfo = [
    { num: 1, title: "Basics" },
    { num: 2, title: "Financials" },
    { num: 3, title: "Review" },
  ];

  const goalNum = Number(formData.fundingGoal) || 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">
        {/* Background Decor */}
        <div className="absolute top-0 right-1/4 -mr-32 -mt-16 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -ml-32 -mb-16 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-semibold transition-colors relative z-10"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {appContextLoading ? (
          <div className="bg-card/80 backdrop-blur-2xl rounded-2xl border border-border/60 shadow-2xl shadow-black/5 p-8 sm:p-10 relative z-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">
              Checking App Access
            </h1>
            <p className="text-muted-foreground mt-3 font-medium max-w-md mx-auto">
              Confirming this raise is linked to an app in your workspace.
            </p>
          </div>
        ) : appContextError ? (
          <div className="bg-card/80 backdrop-blur-2xl rounded-2xl border border-error/20 shadow-2xl shadow-black/5 p-8 sm:p-10 relative z-10 text-center">
            <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              App Context Required
            </h1>
            <p className="text-muted-foreground mt-3 font-medium max-w-md mx-auto">
              {appContextError}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/apps"
                className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-colors"
              >
                Back to Apps
              </Link>
              <button
                type="button"
                onClick={loadLinkedApp}
                className="px-6 py-3 bg-muted/60 text-foreground rounded-xl font-bold hover:bg-muted transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
        <div className="bg-card/80 backdrop-blur-2xl rounded-2xl border border-border/60 shadow-2xl shadow-black/5 p-8 sm:p-10 relative z-10">
          {step < 4 ? (
            <>
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {linkedApp ? `Raise Funding For ${linkedApp.app_name}` : "Create Campaign Draft"}
                </h1>
                <p className="text-muted-foreground mt-3 font-medium max-w-md mx-auto">
                  {linkedApp
                    ? "Create an app-linked raise so investor commitments connect back to ownership records."
                    : "Configure your crowdfunding campaign details to attract fractional investors."}
                </p>
              </div>

              {/* Stepper — labels are absolutely positioned so the connector aligns
                  with the circle centers via items-center (no negative-margin hack). */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-16">
                {stepInfo.map((s, index) => (
                  <React.Fragment key={s.num}>
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          s.num < step
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : s.num === step
                              ? "bg-accent text-white shadow-lg shadow-accent/30 scale-110"
                              : "bg-muted/80 text-muted-foreground border border-border/50"
                        }`}
                      >
                        {s.num < step ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                      </div>
                      <span
                        className={`absolute top-full mt-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap ${s.num === step ? "text-accent" : "text-muted-foreground"}`}
                      >
                        {s.title}
                      </span>
                    </div>
                    {index < stepInfo.length - 1 && (
                      <div
                        className={`w-12 sm:w-20 h-1 rounded-full transition-all duration-500 ${
                          s.num < step
                            ? "bg-gradient-to-r from-emerald-500 to-accent/50"
                            : "bg-muted/50"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {validationErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error"
                  >
                    {validationErrors.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {idea && (
                      <div className="p-5 bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 rounded-2xl flex items-start gap-4">
                        <LayoutTemplate className="w-10 h-10 text-accent shrink-0 p-2 bg-accent/10 rounded-xl" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-1">
                            Pre-filled from Idea
                          </p>
                          <p className="font-bold text-foreground text-lg">
                            {idea.title}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground mt-1">
                            Est:{" "}
                            <span className="text-foreground">
                              {formatCurrency(idea.costEstimate || 0)}
                            </span>{" "}
                            • Timeline:{" "}
                            <span className="text-foreground">
                              {idea.timelineWeeks} wks
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {linkedApp && (
                      <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-2xl border border-sky-100 dark:border-sky-900/40 flex items-start gap-4">
                        <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                          <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-sky-700 dark:text-sky-300 mb-1">
                            Linked App Raise
                          </p>
                          <p className="font-semibold text-foreground text-lg">
                            {linkedApp.app_name}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground mt-1">
                            Investor commitments from this campaign will be tied
                            back to this app's ownership record.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-muted/20 p-6 rounded-2xl border border-border/50 space-y-6">
                      <FormField
                        label="Campaign Title"
                        required
                        error={showError("title")}
                      >
                        {(f) => (
                          <input
                            {...f}
                            type="text"
                            value={formData.title}
                            onChange={(e) => setField("title", e.target.value)}
                            onBlur={() => markTouched("title")}
                            placeholder="e.g., TaskMaster Pro - Seed Stage"
                            className={showError("title") ? INPUT_ERROR_CLASS : INPUT_CLASS}
                          />
                        )}
                      </FormField>

                      <FormField
                        label="Elevator Pitch"
                        required
                        description="A compelling short description for campaign preview cards."
                        error={showError("shortDescription")}
                      >
                        {(f) => (
                          <textarea
                            {...f}
                            value={formData.shortDescription}
                            onChange={(e) => setField("shortDescription", e.target.value)}
                            onBlur={() => markTouched("shortDescription")}
                            placeholder="Revolutionizing productivity through AI..."
                            rows={3}
                            className={`${showError("shortDescription") ? INPUT_ERROR_CLASS : INPUT_CLASS} resize-none`}
                          />
                        )}
                      </FormField>

                      <FormField
                        label="Cover Image URL"
                        description="Paste a link to a hosted image (used on the campaign card and detail page)."
                        error={showError("coverImageUrl")}
                      >
                        {(f) => (
                          <div className="relative">
                            <ImagePlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              {...f}
                              type="url"
                              inputMode="url"
                              value={formData.coverImageUrl}
                              onChange={(e) => setField("coverImageUrl", e.target.value)}
                              onBlur={() => markTouched("coverImageUrl")}
                              placeholder="https://images.example.com/cover.jpg"
                              className={`${showError("coverImageUrl") ? INPUT_ERROR_CLASS : INPUT_CLASS} pl-11`}
                            />
                          </div>
                        )}
                      </FormField>

                      {formData.coverImageUrl.trim() && !fieldErrors.coverImageUrl && (
                        <img
                          src={formData.coverImageUrl}
                          alt="Campaign cover preview"
                          className="w-full h-40 rounded-2xl object-cover border border-border/50"
                        />
                      )}

                      <FormField label="Detailed Project Description">
                        {(f) => (
                          <textarea
                            {...f}
                            value={formData.longDescription}
                            onChange={(e) => setField("longDescription", e.target.value)}
                            placeholder="Describe the problem, solution, market opportunity, and use of funds..."
                            rows={6}
                            className={`${INPUT_CLASS} resize-none`}
                          />
                        )}
                      </FormField>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-muted/20 p-6 rounded-2xl border border-border/50 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField label="Funding Goal (NGN)" required error={showError("fundingGoal")}>
                          {(f) => (
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                              <input
                                {...f}
                                type="number"
                                value={formData.fundingGoal}
                                onChange={(e) => setField("fundingGoal", e.target.value)}
                                onBlur={() => markTouched("fundingGoal")}
                                placeholder="50000"
                                className={`${showError("fundingGoal") ? INPUT_ERROR_CLASS : INPUT_CLASS} pl-9 font-bold text-lg`}
                              />
                            </div>
                          )}
                        </FormField>
                        <FormField label="Pre-Money Valuation (NGN)" required error={showError("preMoneyValuation")}>
                          {(f) => (
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                              <input
                                {...f}
                                type="number"
                                value={formData.preMoneyValuation}
                                onChange={(e) => setField("preMoneyValuation", e.target.value)}
                                onBlur={() => markTouched("preMoneyValuation")}
                                placeholder="1000000"
                                className={`${showError("preMoneyValuation") ? INPUT_ERROR_CLASS : INPUT_CLASS} pl-9 font-bold text-lg`}
                              />
                            </div>
                          )}
                        </FormField>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField label="Equity Offered" required error={showError("equityOfferedPct")}>
                          {(f) => (
                            <div className="relative">
                              <input
                                {...f}
                                type="number"
                                step="0.01"
                                value={formData.equityOfferedPct}
                                onChange={(e) => setField("equityOfferedPct", e.target.value)}
                                onBlur={() => markTouched("equityOfferedPct")}
                                placeholder="10"
                                className={`${showError("equityOfferedPct") ? INPUT_ERROR_CLASS : INPUT_CLASS} pr-10 font-bold text-lg`}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                            </div>
                          )}
                        </FormField>
                        <FormField label="Duration (days)" error={showError("durationDays")}>
                          {(f) => (
                            <input
                              {...f}
                              type="number"
                              value={formData.durationDays}
                              onChange={(e) => setField("durationDays", e.target.value)}
                              onBlur={() => markTouched("durationDays")}
                              placeholder="30"
                              className={`${showError("durationDays") ? INPUT_ERROR_CLASS : INPUT_CLASS} font-bold text-lg`}
                            />
                          )}
                        </FormField>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                        <FormField label="Min Investment (NGN)" required error={showError("minInvestment")}>
                          {(f) => (
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                              <input
                                {...f}
                                type="number"
                                value={formData.minInvestment}
                                onChange={(e) => setField("minInvestment", e.target.value)}
                                onBlur={() => markTouched("minInvestment")}
                                placeholder="100"
                                className={`${showError("minInvestment") ? INPUT_ERROR_CLASS : INPUT_CLASS} pl-9`}
                              />
                            </div>
                          )}
                        </FormField>
                        <FormField label="Max Investment (NGN)" description="Leave blank for no limit." error={showError("maxInvestment")}>
                          {(f) => (
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                              <input
                                {...f}
                                type="number"
                                value={formData.maxInvestment}
                                onChange={(e) => setField("maxInvestment", e.target.value)}
                                onBlur={() => markTouched("maxInvestment")}
                                placeholder="No limit"
                                className={`${showError("maxInvestment") ? INPUT_ERROR_CLASS : INPUT_CLASS} pl-9`}
                              />
                            </div>
                          )}
                        </FormField>
                      </div>

                      <div className="pt-4 border-t border-border/50">
                        <FormField
                          label="Maximum Investors"
                          required
                          description="Caps how many backers can join this raise."
                          error={showError("maxInvestors")}
                        >
                          {(f) => (
                            <div className="relative">
                              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                              <input
                                {...f}
                                type="number"
                                value={formData.maxInvestors}
                                onChange={(e) => setField("maxInvestors", e.target.value)}
                                onBlur={() => markTouched("maxInvestors")}
                                placeholder="100"
                                className={`${showError("maxInvestors") ? INPUT_ERROR_CLASS : INPUT_CLASS} pl-11`}
                              />
                            </div>
                          )}
                        </FormField>
                      </div>

                      <div className="pt-4 border-t border-border/50">
                        <label className="block text-sm font-bold text-foreground mb-4">
                          Funding Structure
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setField("fundingType", "split")}
                            aria-pressed={formData.fundingType === "split"}
                            className={`p-5 rounded-2xl border-2 text-left transition-all ${
                              formData.fundingType === "split"
                                ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                                : "border-border bg-card hover:border-accent/40"
                            }`}
                          >
                            <Users
                              className={`w-6 h-6 mb-3 ${formData.fundingType === "split" ? "text-accent" : "text-muted-foreground"}`}
                            />
                            <p className="font-bold text-foreground text-lg">
                              Fractional Split
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Pool funds from multiple micro-investors.
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setField("fundingType", "pay_once")}
                            aria-pressed={formData.fundingType === "pay_once"}
                            className={`p-5 rounded-2xl border-2 text-left transition-all ${
                              formData.fundingType === "pay_once"
                                ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                                : "border-border bg-card hover:border-accent/40"
                            }`}
                          >
                            <Banknote
                              className={`w-6 h-6 mb-3 ${formData.fundingType === "pay_once" ? "text-accent" : "text-muted-foreground"}`}
                            />
                            <p className="font-bold text-foreground text-lg">
                              Single Backer
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Seek one investor to fund the entire goal.
                            </p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <LayoutDashboard className="w-4 h-4 text-accent" />
                      This is how investors will see your campaign
                    </div>

                    {/* Real preview */}
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                      {formData.coverImageUrl.trim() && !fieldErrors.coverImageUrl ? (
                        <img
                          src={formData.coverImageUrl}
                          alt=""
                          className="w-full h-44 object-cover"
                        />
                      ) : (
                        <div className="w-full h-44 bg-gradient-to-br from-accent/20 to-emerald-500/10 flex items-center justify-center">
                          <ImagePlus className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge kind="campaign" status="draft" dot />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formData.fundingType === "split" ? "Fractional Split" : "Single Backer"}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground tracking-tight">
                            {formData.title || "Untitled campaign"}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formData.shortDescription || "No elevator pitch yet."}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-semibold text-foreground">
                              {formatCurrency(0)} raised
                            </span>
                            <span className="text-muted-foreground">
                              of {formatCurrency(goalNum)}
                            </span>
                          </div>
                          <ProgressBar value={0} tone="emerald" label="Funding progress" />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <StatTile
                            variant="plain"
                            label="Funding Goal"
                            value={formatCurrency(goalNum)}
                            icon={Target}
                          />
                          <StatTile
                            variant="plain"
                            label="Valuation"
                            value={formatCurrency(Number(formData.preMoneyValuation) || 0)}
                            icon={Banknote}
                          />
                          <StatTile
                            variant="plain"
                            label="Equity Offered"
                            value={`${formData.equityOfferedPct || 0}%`}
                            icon={Percent}
                          />
                          <StatTile
                            variant="plain"
                            label="Min Investment"
                            value={formatCurrency(Number(formData.minInvestment) || 0)}
                          />
                          <StatTile
                            variant="plain"
                            label="Max Investors"
                            value={formData.maxInvestors || "—"}
                            icon={Users}
                          />
                          <StatTile
                            variant="plain"
                            label="Duration"
                            value={`${formData.durationDays || 0} days`}
                            icon={Clock}
                          />
                        </div>
                        {formData.maxInvestment && (
                          <p className="text-xs text-muted-foreground">
                            Maximum investment per backer:{" "}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(Number(formData.maxInvestment))}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                      <div className="bg-amber-500/10 p-2 rounded-xl shrink-0">
                        <Info className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-800 dark:text-amber-200 text-lg mb-1">
                          Draft Mode
                        </p>
                        <p className="text-amber-700 dark:text-amber-300/90 font-medium leading-relaxed">
                          Your campaign will be saved as a draft. Review the
                          terms, confirm Paystack checkout readiness, then
                          publish when you are ready to accept investor funds.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mt-10 pt-8 border-t border-border/50">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3.5 text-muted-foreground bg-muted/40 hover:bg-muted focus:bg-muted outline-none rounded-xl font-bold transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canProceed()}
                    className="px-8 py-3.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all shadow-md"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="relative group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-emerald-500 rounded-xl blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
                    <div className="relative px-8 py-3.5 bg-emerald-500 text-white rounded-xl flex items-center gap-2 font-bold shadow-inner">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Create Draft Campaign
                        </>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, delay: 0.1 }}
                className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Draft Campaign Created
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-sm mx-auto font-medium">
                Your campaign draft is saved. Preview the details, confirm the
                app and Paystack funding terms, then publish when ready.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={`/campaigns/${createdCampaign?.id}`}
                  className="px-8 py-4 bg-accent text-white rounded-xl flex items-center justify-center gap-2 hover:bg-accent/90 font-bold shadow-lg hover:shadow-accent/40 transition-all"
                >
                  <Sparkles className="w-5 h-5" /> Preview Campaign
                </Link>
                <button
                  onClick={() => navigate("/my-campaigns")}
                  className="px-8 py-4 bg-muted/50 text-foreground border border-border/50 rounded-xl hover:bg-muted font-bold transition-colors"
                >
                  Return to My Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
};
