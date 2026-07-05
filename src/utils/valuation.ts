import { AppListing } from '../types';

/**
 * Antigravity Valuation Engine (AVE) Configuration
 * Standards derived from industry averages (MicroAcquire/EmpireFlippers)
 */
const VALUATION_CONFIG = {
    MULTIPLIERS: {
        EMERGING: 2.0,     // < $1k MRR
        ESTABLISHED: 3.0,  // $1k - $10k MRR
        ENTERPRISE: 4.5    // > $10k MRR
    },
    WEIGHTS: {
        CONFIDENCE_VERIFIED: 1.0,
        CONFIDENCE_UNVERIFIED: 0.7,
        USER_ASSET_VALUE: 2.5 // USD value per user
    },
    BOUNDS: {
        MRR_EMERGING_THRESHOLD: 1000,
        MRR_ENTERPRISE_THRESHOLD: 10000,
        RANGE_DEVIATION: 0.1 // +/- 10% for valuation range
    }
};

export interface ValuationResult {
    valuation: number;
    multiple: number;
    tier: 'Emerging' | 'Established' | 'Enterprise';
    confidence: number;
    lowRange: number;
    highRange: number;
}

/**
 * Calculates a professional-grade valuation for an app listing.
 * Optimized for readability and consistent logic application.
 */
export const calculateAppValuation = (listing: AppListing): ValuationResult => {
    const mrr = listing.monthlyRevenue || 0;
    const users = listing.totalUsers || 0;

    // 1. Determine Tier and Multiple
    let tier: ValuationResult['tier'] = 'Established';
    let multiple = VALUATION_CONFIG.MULTIPLIERS.ESTABLISHED;

    if (mrr < VALUATION_CONFIG.BOUNDS.MRR_EMERGING_THRESHOLD) {
        tier = 'Emerging';
        multiple = VALUATION_CONFIG.MULTIPLIERS.EMERGING;
    } else if (mrr > VALUATION_CONFIG.BOUNDS.MRR_ENTERPRISE_THRESHOLD) {
        tier = 'Enterprise';
        multiple = VALUATION_CONFIG.MULTIPLIERS.ENTERPRISE;
    }

    // 2. Adjust for verification status
    const confidence = listing.revenueVerified
        ? VALUATION_CONFIG.WEIGHTS.CONFIDENCE_VERIFIED
        : VALUATION_CONFIG.WEIGHTS.CONFIDENCE_UNVERIFIED;

    // 3. User Asset Calculation
    const userAssetValue = users * VALUATION_CONFIG.WEIGHTS.USER_ASSET_VALUE;

    // 4. Revenue Calculation (Annualized MRR * Multiple)
    const annualRevenue = mrr * 12;
    const revenueValuation = annualRevenue * multiple;

    // 5. Aggregate and weight
    const totalValuation = (revenueValuation + userAssetValue) * confidence;

    return {
        valuation: Math.round(totalValuation),
        multiple,
        tier,
        confidence,
        lowRange: Math.round(totalValuation * (1 - VALUATION_CONFIG.BOUNDS.RANGE_DEVIATION)),
        highRange: Math.round(totalValuation * (1 + VALUATION_CONFIG.BOUNDS.RANGE_DEVIATION))
    };
};
