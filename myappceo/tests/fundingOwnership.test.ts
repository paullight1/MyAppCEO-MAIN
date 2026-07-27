import { describe, expect, it } from 'vitest';
import {
  calculateDilutionScenario,
  calculateStakeFromCampaign,
  calculateVestingProgress,
  validateCampaignDraft,
} from '../src/utils/fundingOwnership';

describe('funding and ownership calculations', () => {
  it('rejects invalid campaign economics', () => {
    const result = validateCampaignDraft({
      title: 'Bad',
      fundingGoal: 1000,
      minInvestment: 1200,
      maxInvestment: 100,
      preMoneyValuation: 0,
      equityOfferedPct: 60,
      maxInvestors: 0,
      durationDays: 400,
      appId: 'app',
      ideaId: 'idea',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Campaigns can link to either an app or an idea, not both.');
  });

  it('prevents overfunding and max investor breaches in stake calculations', () => {
    const result = calculateStakeFromCampaign({
      amount: 600,
      fundingGoal: 1000,
      fundingRaised: 500,
      minInvestment: 100,
      maxInvestment: 1000,
      preMoneyValuation: 10000,
      equityOfferedPct: 10,
      currentInvestorCount: 10,
      maxInvestors: 10,
    });

    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Maximum available investment is 500.');
    expect(result.validationErrors).toContain('This campaign has reached its maximum investor count.');
  });

  it('calculates priced-round dilution', () => {
    const result = calculateDilutionScenario(
      [
        { owner_type: 'founder', equity_pct: 80 },
        { owner_type: 'option_pool', equity_pct: 20 },
      ],
      900000,
      100000,
    );

    expect(result?.postMoney).toBe(1000000);
    expect(result?.investorPct).toBe(10);
    expect(result?.existingPcts[0].new_pct).toBe(72);
  });

  it('applies cliff-aware monthly vesting', () => {
    const beforeCliff = calculateVestingProgress({
      startDate: '2026-01-01T00:00:00.000Z',
      cliffDate: '2027-01-01T00:00:00.000Z',
      vestingMonths: 48,
      asOf: new Date('2026-12-01T00:00:00.000Z'),
    });
    const afterCliff = calculateVestingProgress({
      startDate: '2026-01-01T00:00:00.000Z',
      cliffDate: '2027-01-01T00:00:00.000Z',
      vestingMonths: 48,
      asOf: new Date('2027-01-01T00:00:00.000Z'),
    });

    expect(beforeCliff.vestedPct).toBe(0);
    expect(afterCliff.vestedPct).toBe(25);
  });
});
