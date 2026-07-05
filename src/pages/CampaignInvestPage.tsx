import React, { useState, useEffect, useRef, useMemo } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Calculator,
  CreditCard,
  Lock,
  Minus,
  Plus,
  TrendingUp,
  Sparkles,
  Banknote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCrowdfunding,
  CrowdfundingCampaign,
  StakeCalculation,
} from "../hooks/useCrowdfundingSupabase";
import { useAuth } from "../hooks/useAuth";
import { StatTile, ProgressBar, Checkbox } from "../components/ui";
import { formatCurrency, formatDateTime, clampPercent } from "../utils/format";

/** Version tag for the investment agreement acknowledgement captured at commit. */
const AGREEMENT_VERSION = "2026-07-invest-v1";

interface Acknowledgement {
  name: string;
  acceptedAt: string;
  version: string;
}

export const CampaignInvestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { getCampaignById, calculateStake, commitInvestment, confirmInvestment } =
    useCrowdfunding();

  const [campaign, setCampaign] = useState<CrowdfundingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [stakeCalc, setStakeCalc] = useState<StakeCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [step, setStep] = useState<"amount" | "processing" | "success">("amount");
  const [processingMode, setProcessingMode] = useState<"redirecting" | "verifying">("redirecting");
  const [acknowledgement, setAcknowledgement] = useState<Acknowledgement | null>(null);
  const [investmentError, setInvestmentError] = useState<string | null>(null);
  const [, setCommitmentId] = useState<string | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const callbackHandledRef = useRef(false);

  const currency = campaign?.currency;
  const money = (value: number | string) => formatCurrency(value, { currency });
  const termsAccepted = Boolean(acknowledgement);

  const presetAmounts = useMemo(() => {
    if (!campaign) return [];
    const min = campaign.minInvestment || 100;
    const goal = campaign.fundingGoal || 10000;
    return [
      min,
      Math.round(min * 2.5),
      Math.round(min * 5),
      Math.round(min * 10),
    ].filter((v, i, arr) => v <= goal && arr.indexOf(v) === i);
  }, [campaign]);

  const amountNum = parseFloat(amount);

  // Inline min/max enforcement on manual typing.
  const amountError = useMemo(() => {
    if (!campaign || amount === "") return null;
    if (Number.isNaN(amountNum)) return "Enter a valid amount.";
    if (amountNum < campaign.minInvestment)
      return `Below minimum — the minimum investment is ${money(campaign.minInvestment)}.`;
    if (campaign.maxInvestment && amountNum > campaign.maxInvestment)
      return `Above maximum — the maximum investment is ${money(campaign.maxInvestment)}.`;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, amountNum, campaign]);

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const storedCommitmentId = id
      ? sessionStorage.getItem(`myappceo:pending-investment:${id}`)
      : null;
    const returnedCommitmentId = searchParams.get("commitmentId") || storedCommitmentId;
    if (!id || !reference || !returnedCommitmentId || callbackHandledRef.current) return;

    callbackHandledRef.current = true;
    setProcessingMode("verifying");
    setStep("processing");
    setCommitmentId(returnedCommitmentId);
    setInvestmentError(null);

    confirmInvestment(id, returnedCommitmentId, reference).then((confirmation) => {
      if (confirmation.success) {
        setStep("success");
        sessionStorage.removeItem(`myappceo:pending-investment:${id}`);
        sessionStorage.removeItem(`myappceo:pending-ack:${id}`);
        navigate(`/campaigns/${id}/invest`, { replace: true });
      } else {
        setInvestmentError(
          (confirmation as any).error ||
            "We could not verify this Paystack payment yet. If you completed payment, do not pay again; check your investments or retry status shortly.",
        );
        setStep("amount");
      }
    });
  }, [id, searchParams, confirmInvestment, navigate]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (amount && parseFloat(amount) >= (campaign?.minInvestment || 100)) {
        fetchCalculation();
      } else {
        setStakeCalc(null);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, campaign]);

  const loadCampaign = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const result = await getCampaignById(id);
    if (result.success && result.data) {
      const campaignData = (result.data as any).data || result.data;
      if (campaignData.status !== "active") {
        setError("This campaign is not currently accepting investments");
      } else {
        setCampaign(campaignData);
        setAmount(campaignData.minInvestment.toString());
      }
    } else {
      setError("Failed to load campaign");
    }
    setLoading(false);
  };

  const fetchCalculation = async () => {
    if (!id || !amount) return;
    setCalculating(true);
    const result = await calculateStake(id, parseFloat(amount));
    if (result.success && result.data) {
      setStakeCalc((result.data as any).data || result.data);
    }
    setCalculating(false);
  };

  const handleAckChange = (checked: boolean) => {
    if (checked) {
      setAcknowledgement({
        name: user?.fullName || user?.email || "Investor",
        acceptedAt: new Date().toISOString(),
        version: AGREEMENT_VERSION,
      });
    } else {
      setAcknowledgement(null);
    }
  };

  const handleInvest = async () => {
    if (!id || !amount || !stakeCalc?.isValid || amountError || !acknowledgement) return;
    setProcessingMode("redirecting");
    setStep("processing");
    setInvestmentError(null);

    const result = await commitInvestment(
      id,
      parseFloat(amount),
      `${window.location.origin}/campaigns/${id}/invest`,
    );

    if (result.success && result.data) {
      const data = ((result.data as any).data || result.data) as any;
      const createdCommitmentId = data.commitment?.id || data.id;
      const paymentReference =
        data.reference ||
        data.commitment?.stripePaymentIntentId ||
        data.commitment?.stripe_payment_intent_id;
      setCommitmentId(createdCommitmentId);

      if (data.authorizationUrl) {
        if (createdCommitmentId) {
          sessionStorage.setItem(`myappceo:pending-investment:${id}`, createdCommitmentId);
          // Persist the captured acknowledgement across the Paystack round-trip.
          sessionStorage.setItem(`myappceo:pending-ack:${id}`, JSON.stringify(acknowledgement));
        }
        window.location.href = data.authorizationUrl;
        return;
      }

      const confirmation = createdCommitmentId
        ? await confirmInvestment(id, createdCommitmentId, paymentReference)
        : { success: false, error: "Investment commitment was not created." };

      if (confirmation.success) {
        setStep("success");
      } else {
        setInvestmentError(
          (confirmation as any).error || "Investment confirmation failed. Please try again.",
        );
        setStep("amount");
      }
    } else {
      setInvestmentError(
        (result as any).error || "Investment failed. Please try again.",
      );
      setStep("amount");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
            <p className="text-muted-foreground font-medium">
              Preparing Investment Details...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign || error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card max-w-md w-full border border-border rounded-2xl p-8 text-center shadow-xl shadow-black/5"
          >
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Unavailable
            </h2>
            <p className="text-muted-foreground mb-8">
              {error || "This campaign is not currently accepting investments."}
            </p>
            <button
              onClick={() => navigate("/campaigns")}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-accent text-white rounded-xl hover:bg-accent/90 font-bold transition-all shadow-lg hover:shadow-accent/40"
            >
              <ArrowLeft className="w-5 h-5" /> Back to Campaigns
            </button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = clampPercent(campaign.fundingRaised, campaign.fundingGoal);
  const platformFee =
    parseFloat(amount || "0") * (Number(campaign.platformFeePct) / 100);
  const sliderStep = Math.max(1, Math.round(campaign.minInvestment || 100));
  const sliderMax = campaign.maxInvestment || campaign.fundingGoal;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {step !== "processing" && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Campaign Overview
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === "processing" ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-8 md:p-12 text-center max-w-xl mx-auto shadow-2xl shadow-black/5 min-h-[60vh] flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mb-8">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {processingMode === "verifying"
                  ? "Verifying your payment"
                  : "Opening secure checkout"}
              </h2>
              <p className="text-muted-foreground max-w-sm">
                {processingMode === "verifying"
                  ? "We're confirming your Paystack payment and reserving your equity. Please keep this tab open — do not pay again."
                  : "Redirecting you to Paystack to complete payment securely. Please wait…"}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-8 text-xs font-semibold text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                <span>Secured by Paystack</span>
              </div>
            </motion.div>
          ) : step === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-8 md:p-12 text-center max-w-2xl mx-auto shadow-2xl shadow-emerald-500/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, delay: 0.1 }}
                  className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>

                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Payment Verified
                </h2>
                <p className="text-muted-foreground mb-10 text-lg">
                  Paystack verified your{" "}
                  <span className="font-bold text-foreground">{money(amount)}</span>{" "}
                  investment in{" "}
                  <span className="font-bold text-foreground">{campaign.title}</span>.
                </p>

                <div className="bg-muted/50 rounded-2xl p-6 mb-10 text-left border border-border/50 max-w-md mx-auto">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-foreground">
                      Transaction Details
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-sm text-muted-foreground">
                        Amount Committed
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {money(amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Secured Equity Stake
                      </span>
                      <span className="text-xl font-black text-accent">
                        {stakeCalc?.stakePctFormatted || "0%"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/my-investments"
                    className="flex-1 px-6 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 font-bold shadow-lg hover:shadow-accent/40 transition-all flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-5 h-5" /> View My Investments
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex-1 px-6 py-4 bg-muted text-foreground rounded-xl hover:bg-muted/80 font-bold transition-all"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
                  <div className="flex items-start gap-4 mb-8">
                    {campaign.coverImageUrl ? (
                      <img
                        src={campaign.coverImageUrl}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl flex items-center justify-center shrink-0">
                        <Banknote className="w-8 h-8 text-accent/40" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
                        Back {campaign.title}
                      </h1>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {campaign.shortDescription}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <StatTile
                      label="Raised"
                      value={money(campaign.fundingRaised)}
                      hint={`Target ${money(campaign.fundingGoal)}`}
                      icon={TrendingUp}
                    />
                    <StatTile
                      label="Company Valuation"
                      value={money(campaign.preMoneyValuation)}
                      hint={`${campaign.equityOfferedPct}% equity available`}
                      icon={Banknote}
                    />
                  </div>
                  <ProgressBar
                    value={progress}
                    tone="emerald"
                    label={`Funding progress: ${Math.round(progress)}%`}
                    className="mb-8"
                  />

                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="invest-amount"
                        className="block text-sm font-bold text-foreground mb-3"
                      >
                        How much would you like to invest?
                      </label>
                      <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground group-focus-within:text-accent transition-colors">
                          ₦
                        </span>
                        <input
                          id="invest-amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          min={campaign.minInvestment}
                          max={campaign.maxInvestment || undefined}
                          aria-invalid={Boolean(amountError) || undefined}
                          className={`w-full pl-11 pr-4 py-4 bg-muted/30 hover:bg-muted/50 border rounded-2xl focus:bg-card focus:ring-2 outline-none text-2xl font-black transition-all ${
                            amountError
                              ? "border-error focus:ring-error/20 focus:border-error"
                              : "border-border focus:ring-accent/20 focus:border-accent"
                          }`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          NGN
                        </div>
                      </div>
                      {amountError ? (
                        <p className="flex items-center gap-1.5 mt-2 px-1 text-xs font-semibold text-error" role="alert">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {amountError}
                        </p>
                      ) : (
                        <div className="flex items-center justify-between mt-3 px-1 text-xs font-semibold text-muted-foreground">
                          <span>Minimum: {money(campaign.minInvestment)}</span>
                          {campaign.maxInvestment && (
                            <span>Maximum: {money(campaign.maxInvestment)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label="Decrease amount"
                          onClick={() => {
                            const current = parseFloat(amount) || campaign.minInvestment;
                            setAmount(
                              Math.max(campaign.minInvestment, current - sliderStep).toString(),
                            );
                          }}
                          className="p-3 bg-card shadow-sm border border-border rounded-xl hover:border-accent/40 text-foreground hover:text-accent transition-all"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <div className="flex-1 px-2">
                          <input
                            ref={sliderRef}
                            type="range"
                            aria-label="Investment amount slider"
                            min={campaign.minInvestment}
                            max={sliderMax}
                            step={sliderStep}
                            value={parseFloat(amount) || campaign.minInvestment}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full h-2.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:shadow-lg"
                          />
                        </div>
                        <button
                          type="button"
                          aria-label="Increase amount"
                          onClick={() => {
                            const current = parseFloat(amount) || campaign.minInvestment;
                            setAmount(Math.min(sliderMax, current + sliderStep).toString());
                          }}
                          className="p-3 bg-card shadow-sm border border-border rounded-xl hover:border-accent/40 text-foreground hover:text-accent transition-all"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
                        {presetAmounts.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(preset.toString())}
                            className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-sm font-bold transition-all ${
                              parseFloat(amount) === preset
                                ? "bg-accent text-white shadow-md shadow-accent/20"
                                : "bg-card border border-border text-foreground hover:border-accent/40 hover:bg-accent/5"
                            }`}
                          >
                            {money(preset)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {stakeCalc && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-6 bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-2xl relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Calculator className="w-24 h-24" />
                          </div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                              <Calculator className="w-5 h-5 text-accent" />
                              <h4 className="font-bold text-foreground tracking-tight">
                                Equity Calculation
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                                  Your Stake
                                </p>
                                <p className="text-3xl font-black text-accent">
                                  {stakeCalc.stakePctFormatted}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                                  Campaign Remaining
                                </p>
                                <p className="text-xl font-bold text-foreground mt-1">
                                  {stakeCalc.equityRemaining.toFixed(2)}%
                                </p>
                              </div>
                            </div>

                            <AnimatePresence>
                              {stakeCalc.validationErrors.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mt-4 p-3 bg-error/10 border border-error/20 rounded-xl"
                                >
                                  {stakeCalc.validationErrors.map((err, i) => (
                                    <div
                                      key={i}
                                      className="flex gap-2 items-start text-xs font-medium text-error"
                                    >
                                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                      <p>{err}</p>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {calculating && !stakeCalc && (
                      <div className="flex items-center justify-center py-6 bg-muted/20 rounded-2xl border border-border/50">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        <span className="ml-3 text-sm font-medium text-muted-foreground">
                          Calculating allocation...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm sticky top-24">
                  <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-accent" /> Summary
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Investment amount
                      </span>
                      <span className="font-bold text-foreground">
                        {money(parseFloat(amount || "0"))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Projected equity
                      </span>
                      <span className="font-bold text-accent px-3 py-1 bg-accent/10 rounded-lg">
                        {stakeCalc?.stakePctFormatted || "0.00%"}
                      </span>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          Total to pay
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Charged via Paystack
                        </span>
                      </div>
                      <span className="text-2xl font-black text-foreground">
                        {money(parseFloat(amount || "0"))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The {campaign.platformFeePct}% platform fee
                      ({money(platformFee)}) is deducted from campaign proceeds —
                      it is <span className="font-semibold text-foreground">not added</span>{" "}
                      to your payment. You pay exactly the amount above.
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mb-6">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                          Paystack Verified Processing
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Payments are processed by Paystack. MyAppCEO verifies
                          the payment reference before reserving equity for this
                          app-linked campaign.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="invest-agreement"
                        checked={termsAccepted}
                        onCheckedChange={handleAckChange}
                      />
                      <label
                        htmlFor="invest-agreement"
                        className="text-xs text-muted-foreground leading-tight cursor-pointer"
                      >
                        I,{" "}
                        <span className="font-semibold text-foreground">
                          {user?.fullName || user?.email || "the investor"}
                        </span>
                        , understand the high-risk nature of startup investments and
                        agree to the{" "}
                        <Link
                          to="/terms"
                          className="text-foreground font-semibold hover:text-accent underline decoration-border underline-offset-2"
                        >
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/investment-terms"
                          className="text-foreground font-semibold hover:text-accent underline decoration-border underline-offset-2"
                        >
                          Investment Agreement
                        </Link>
                        .
                      </label>
                    </div>
                    {acknowledgement && (
                      <p className="mt-2 pl-8 text-[11px] text-muted-foreground">
                        Acknowledged by{" "}
                        <span className="font-semibold text-foreground">
                          {acknowledgement.name}
                        </span>{" "}
                        on {formatDateTime(acknowledgement.acceptedAt)} · Agreement{" "}
                        {acknowledgement.version}
                      </p>
                    )}
                  </div>

                  {investmentError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="my-4 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-error shrink-0" />
                      <p className="text-sm font-medium text-error">
                        {investmentError.replace(/\$/g, "NGN ")}
                      </p>
                    </motion.div>
                  )}

                  <button
                    onClick={handleInvest}
                    disabled={
                      !stakeCalc?.isValid ||
                      !termsAccepted ||
                      Boolean(amountError)
                    }
                    className="w-full relative group disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                  >
                    <div className="absolute inset-0 bg-accent rounded-xl blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                    <div className="relative px-6 py-4 bg-accent text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-inner">
                      Continue To Paystack
                    </div>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold text-muted-foreground">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Payment verified by Paystack before equity is reserved</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};
