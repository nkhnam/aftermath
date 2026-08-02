import type { FinancialScenario, RiskFactor } from "./types";
import type { StructuredOutput } from "./i18n-types";
import { totalHousingBurden, getScenarioMetrics } from "./financial-engine";
import { clamp, round } from "./utils";

// ============================================================================
// Transparent Scenario-Scoring Engine
// Every score contribution is visible to the user.
// This is NOT a machine-learning prediction.
// It is a transparent, rules-based score on synthetic assumptions.
//
// All output uses STRUCTURED DATA (type + raw values) for locale-aware
// rendering at display time.
// ============================================================================

/** Maximum score contributions per risk factor (sum = 100) */
export const MAX_CONTRIBUTIONS = {
  postResetBurden: 20, // Housing burden above safe share of income
  emergencyFundLow: 15, // Emergency fund below safe months of essential costs
  paymentJump: 15, // Large change between intro and post-intro payment
  loanToIncome: 10, // High loan-to-income relationship
  hiddenCosts: 10, // Hidden housing costs relative to income
  incomeDisruption: 18, // Income disruption consuming emergency reserves
  noFixedRate: 12, // No long fixed-rate protection
} as const;

const TOTAL_MAX = Object.values(MAX_CONTRIBUTIONS).reduce((a, b) => a + b, 0);

/**
 * Calculate all risk factors for a scenario.
 * Each factor returns structured data for locale-aware rendering.
 */
export function calculateRiskFactors(scenario: FinancialScenario): RiskFactor[] {
  const metrics = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);
  const factors: RiskFactor[] = [];

  // 1. Post-reset housing burden (mortgage + all housing costs) vs income
  {
    const totalHousingRatio =
      ((metrics.postResetPayment + housingCosts) / scenario.monthlyIncome) * 100;
    const triggered = totalHousingRatio > 50;
    const scale = clamp((totalHousingRatio - 35) / 30, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.postResetBurden);
    factors.push({
      id: "post-reset-burden",
      description: {
        type: "riskfactor.post-reset-burden.desc",
        values: { ratio: totalHousingRatio },
      },
      reason: {
        type: "riskfactor.post-reset-burden.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.postResetBurden,
      contribution,
      triggered,
      evidence: {
        type: "riskfactor.post-reset-burden.evidence",
        values: {
          mortgage: metrics.postResetPayment,
          housing: housingCosts,
          ratio: totalHousingRatio,
          income: scenario.monthlyIncome,
        },
      },
      sourceType: "verified_calc",
      sensitivity: "high",
    });
  }

  // 2. Emergency fund below 12 months of essential costs
  {
    const essentialMonthly =
      scenario.monthlyLivingExpenses + housingCosts + metrics.postResetPayment;
    const fundMonths = scenario.currentSavings / essentialMonthly;
    const triggered = fundMonths < 6;
    const scale = clamp((12 - fundMonths) / 9, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.emergencyFundLow);
    factors.push({
      id: "emergency-fund-low",
      description: {
        type: "riskfactor.emergency-fund-low.desc",
        values: { months: round(fundMonths, 1) },
      },
      reason: {
        type: "riskfactor.emergency-fund-low.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.emergencyFundLow,
      contribution,
      triggered,
      evidence: {
        type: "riskfactor.emergency-fund-low.evidence",
        values: {
          fund: scenario.currentSavings,
          essentials: essentialMonthly,
          months: round(fundMonths, 1),
        },
      },
      sourceType: "verified_calc",
      sensitivity: "high",
    });
  }

  // 3. Large change between introductory and post-introductory payment
  {
    const jumpPct = metrics.paymentIncreasePct;
    const triggered = jumpPct > 20;
    const scale = clamp((jumpPct - 5) / 40, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.paymentJump);
    factors.push({
      id: "payment-jump",
      description: {
        type: "riskfactor.payment-jump.desc",
        values: { pct: jumpPct },
      },
      reason: {
        type: "riskfactor.payment-jump.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.paymentJump,
      contribution,
      triggered,
      evidence: {
        type: "riskfactor.payment-jump.evidence",
        values: {
          intro: metrics.introPayment,
          post: metrics.postResetPayment,
          pct: jumpPct,
        },
      },
      sourceType: "verified_calc",
      sensitivity: "medium",
    });
  }

  // 4. High loan-to-income relationship
  {
    const lti = metrics.loanToIncomeRatio;
    const triggered = lti > 4;
    const scale = clamp((lti - 1.5) / 3.5, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.loanToIncome);
    factors.push({
      id: "loan-to-income",
      description: {
        type: "riskfactor.loan-to-income.desc",
        values: { ratio: lti },
      },
      reason: {
        type: "riskfactor.loan-to-income.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.loanToIncome,
      contribution,
      triggered,
      evidence: {
        type: "riskfactor.loan-to-income.evidence",
        values: {
          loan: scenario.loanAmount,
          income: scenario.monthlyIncome * 12,
          ratio: lti,
        },
      },
      sourceType: "verified_calc",
      sensitivity: "medium",
    });
  }

  // 5. Hidden housing costs relative to income
  {
    const hiddenPctOfIncome = (housingCosts / scenario.monthlyIncome) * 100;
    const triggered = hiddenPctOfIncome > 15;
    const scale = clamp((hiddenPctOfIncome - 5) / 15, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.hiddenCosts);
    factors.push({
      id: "hidden-costs",
      description: {
        type: "riskfactor.hidden-costs.desc",
        values: { pct: hiddenPctOfIncome },
      },
      reason: {
        type: "riskfactor.hidden-costs.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.hiddenCosts,
      contribution,
      triggered,
      evidence: {
        type: "riskfactor.hidden-costs.evidence",
        values: {
          m: scenario.monthlyMaintenance,
          i: scenario.monthlyInsurance,
          f: scenario.monthlyFurnishingRepair,
          mg: scenario.monthlyManagementFees,
          pct: hiddenPctOfIncome,
        },
      },
      sourceType: "verified_calc",
      sensitivity: "low",
    });
  }

  // 6. Income disruption consuming emergency reserves
  {
    const essentialMonthly =
      scenario.monthlyLivingExpenses + housingCosts + metrics.postResetPayment;
    const disruptionDrain = essentialMonthly * scenario.incomeDisruptionMonths;
    const consumptionRatio = scenario.currentSavings > 0
      ? clamp(disruptionDrain / scenario.currentSavings, 0, 1)
      : 1;
    const triggered = consumptionRatio > 0.4;
    const contribution = round(
      consumptionRatio * MAX_CONTRIBUTIONS.incomeDisruption,
    );
    factors.push({
      id: "income-disruption",
      description: {
        type: "riskfactor.income-disruption.desc",
        values: {
          months: scenario.incomeDisruptionMonths,
          pct: consumptionRatio * 100,
        },
      },
      reason: {
        type: "riskfactor.income-disruption.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.incomeDisruption,
      contribution,
      triggered,
      evidence: {
        type: "riskfactor.income-disruption.evidence",
        values: {
          drain: disruptionDrain,
          fund: scenario.currentSavings,
          pct: consumptionRatio * 100,
        },
      },
      sourceType: "stress_test",
      sensitivity: "high",
    });
  }

  // 7. No long fixed-rate protection
  {
    let scale = 0;
    let descType = "riskfactor.no-fixed-rate.desc.fixed";
    let evidenceType = "riskfactor.no-fixed-rate.evidence.fixed";
    let evidenceValues: Record<string, string | number> = {};

    if (scenario.isFixedRate) {
      scale = 0;
      descType = "riskfactor.no-fixed-rate.desc.fixed";
      evidenceType = "riskfactor.no-fixed-rate.evidence.fixed";
    } else if (scenario.introductoryPeriodMonths <= 12) {
      scale = 1.0;
      descType = "riskfactor.no-fixed-rate.desc.veryShort";
      evidenceType = "riskfactor.no-fixed-rate.evidence.variable";
      evidenceValues = { month: scenario.introductoryPeriodMonths + 1 };
    } else if (scenario.introductoryPeriodMonths <= 23) {
      scale = 0.75;
      descType = "riskfactor.no-fixed-rate.desc.limited";
      evidenceType = "riskfactor.no-fixed-rate.evidence.variable";
      evidenceValues = { month: scenario.introductoryPeriodMonths + 1 };
    } else if (scenario.introductoryPeriodMonths <= 59) {
      scale = 0.5;
      descType = "riskfactor.no-fixed-rate.desc.moderate";
      evidenceType = "riskfactor.no-fixed-rate.evidence.variable";
      evidenceValues = { month: scenario.introductoryPeriodMonths + 1 };
    } else {
      scale = 0.25;
      descType = "riskfactor.no-fixed-rate.desc.longer";
      evidenceType = "riskfactor.no-fixed-rate.evidence.variable";
      evidenceValues = { month: scenario.introductoryPeriodMonths + 1 };
    }

    const triggered = scale > 0;
    const contribution = round(scale * MAX_CONTRIBUTIONS.noFixedRate);
    const descValues: Record<string, string | number> = scenario.isFixedRate
      ? {}
      : { months: scenario.introductoryPeriodMonths };

    factors.push({
      id: "no-fixed-rate",
      description: { type: descType, values: descValues },
      reason: {
        type: "riskfactor.no-fixed-rate.reason",
        values: {},
      },
      maxContribution: MAX_CONTRIBUTIONS.noFixedRate,
      contribution,
      triggered,
      evidence: { type: evidenceType, values: evidenceValues },
      sourceType: "verified_calc",
      sensitivity: "medium",
    });
  }

  return factors;
}

/**
 * Calculate the total risk score (clamped 0–100).
 */
export function calculateRiskScore(scenario: FinancialScenario): {
  score: number;
  factors: RiskFactor[];
} {
  const factors = calculateRiskFactors(scenario);
  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  const score = clamp(round((rawScore / TOTAL_MAX) * 100), 0, 100);
  return { score, factors };
}

/**
 * Determine risk level from score.
 */
export function getRiskLevel(score: number): "low" | "moderate" | "high" | "critical" {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

/** Helper: build a StructuredOutput */
export function so(type: string, values: Record<string, string | number> = {}): StructuredOutput {
  return { type, values };
}
