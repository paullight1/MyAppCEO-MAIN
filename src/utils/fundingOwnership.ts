export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'funded'
  | 'cancelled'
  | 'expired'
  | 'rejected';

export interface CampaignValidationInput {
  title?: string;
  fundingGoal: number;
  minInvestment: number;
  maxInvestment?: number | null;
  preMoneyValuation: number;
  equityOfferedPct: number;
  maxInvestors: number;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  appId?: string | null;
  ideaId?: string | null;
}

export interface CampaignValidationResult {
  isValid: boolean;
  errors: string[];
}

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

export const validateCampaignDraft = (input: CampaignValidationInput): CampaignValidationResult => {
  const errors: string[] = [];
  const title = input.title?.trim() || '';

  if (title.length < 4) errors.push('Campaign title must be at least 4 characters.');
  if (!isPositiveFinite(input.fundingGoal)) errors.push('Funding goal must be greater than zero.');
  if (!isPositiveFinite(input.minInvestment)) errors.push('Minimum investment must be greater than zero.');
  if (input.maxInvestment != null && input.maxInvestment > 0 && input.maxInvestment < input.minInvestment) {
    errors.push('Maximum investment cannot be lower than minimum investment.');
  }
  if (input.minInvestment > input.fundingGoal) errors.push('Minimum investment cannot exceed the funding goal.');
  if (!isPositiveFinite(input.preMoneyValuation)) errors.push('Pre-money valuation must be greater than zero.');
  if (!isPositiveFinite(input.equityOfferedPct) || input.equityOfferedPct > 49) {
    errors.push('Equity offered must be greater than 0% and no more than 49%.');
  }
  if (!Number.isInteger(input.maxInvestors) || input.maxInvestors < 1) {
    errors.push('Maximum investors must be at least 1.');
  }
  if (input.durationDays != null && (!Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 365)) {
    errors.push('Campaign duration must be between 1 and 365 days.');
  }

  if (input.startDate && input.endDate) {
    const start = new Date(input.startDate).getTime();
    const end = new Date(input.endDate).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      errors.push('Campaign end date must be after the start date.');
    }
  }

  if (input.appId && input.ideaId) {
    errors.push('Campaigns can link to either an app or an idea, not both.');
  }

  return { isValid: errors.length === 0, errors };
};

export interface StakeCalculationInput {
  amount: number;
  fundingGoal: number;
  fundingRaised: number;
  minInvestment: number;
  maxInvestment?: number | null;
  preMoneyValuation: number;
  equityOfferedPct: number;
  currentInvestorCount?: number;
  maxInvestors?: number;
}

export const calculateStakeFromCampaign = (input: StakeCalculationInput) => {
  const errors: string[] = [];
  const remainingFunding = Math.max(0, input.fundingGoal - input.fundingRaised);
  const maxAllowed = input.maxInvestment && input.maxInvestment > 0
    ? Math.min(input.maxInvestment, remainingFunding)
    : remainingFunding;
  const postMoneyValuation = input.preMoneyValuation + input.amount;
  const stakePct = postMoneyValuation > 0 ? (input.amount / postMoneyValuation) * 100 : 0;
  const equityRaisedPct = input.fundingGoal > 0
    ? (input.fundingRaised / input.fundingGoal) * input.equityOfferedPct
    : 0;
  const equityRemaining = Math.max(0, input.equityOfferedPct - equityRaisedPct);

  if (!isPositiveFinite(input.amount)) errors.push('Investment amount must be greater than zero.');
  if (input.amount < input.minInvestment) errors.push(`Minimum investment is ${input.minInvestment.toLocaleString()}.`);
  if (maxAllowed > 0 && input.amount > maxAllowed) errors.push(`Maximum available investment is ${maxAllowed.toLocaleString()}.`);
  if (input.maxInvestors && input.maxInvestors > 0 && (input.currentInvestorCount || 0) >= input.maxInvestors) {
    errors.push('This campaign has reached its maximum investor count.');
  }
  if (stakePct > equityRemaining) errors.push('This investment would over-allocate the offered campaign equity.');

  return {
    amount: input.amount,
    stakePct,
    stakePctFormatted: `${stakePct.toFixed(4)}%`,
    equityRemaining,
    fundingRemaining: remainingFunding,
    valuation: input.preMoneyValuation,
    minInvestment: input.minInvestment,
    maxInvestment: input.maxInvestment ?? null,
    isValid: errors.length === 0,
    validationErrors: errors,
  };
};

export const calculateDilutionScenario = (
  currentCapTable: { owner_type: string; equity_pct: number }[],
  preMoneyValuation: number,
  investmentAmount: number,
) => {
  if (!isPositiveFinite(preMoneyValuation) || !isPositiveFinite(investmentAmount)) {
    return null;
  }

  const postMoney = preMoneyValuation + investmentAmount;
  const investorPct = (investmentAmount / postMoney) * 100;
  const dilution = preMoneyValuation / postMoney;

  return {
    postMoney,
    investorPct,
    dilution,
    existingPcts: currentCapTable.map((entry) => ({
      owner_type: entry.owner_type,
      old_pct: entry.equity_pct,
      new_pct: entry.equity_pct * dilution,
    })),
  };
};

export interface VestingInput {
  startDate?: string | null;
  cliffDate?: string | null;
  vestingMonths?: number;
  asOf?: Date;
}

export const calculateVestingProgress = ({
  startDate,
  cliffDate,
  vestingMonths = 48,
  asOf = new Date(),
}: VestingInput) => {
  if (!startDate || vestingMonths <= 0) {
    return { vestedPct: 100, monthsRemaining: 0, isCliffPassed: true };
  }

  const start = new Date(startDate);
  const cliff = cliffDate ? new Date(cliffDate) : null;
  if (!Number.isFinite(start.getTime())) {
    return { vestedPct: 0, monthsRemaining: vestingMonths, isCliffPassed: false };
  }

  const isCliffPassed = cliff ? asOf >= cliff : true;
  if (!isCliffPassed) {
    return { vestedPct: 0, monthsRemaining: vestingMonths, isCliffPassed };
  }

  const elapsedMonths = Math.max(
    0,
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth()),
  );
  const vestedPct = Math.min(100, (elapsedMonths / vestingMonths) * 100);

  return {
    vestedPct,
    monthsRemaining: Math.max(0, vestingMonths - elapsedMonths),
    isCliffPassed,
  };
};

export const formatCurrency = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
