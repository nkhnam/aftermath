import type { FinancialScenario, RiskFactor } from "./types";
import { totalHousingBurden, getScenarioMetrics } from "./financial-engine";
import { clamp, round } from "./utils";

// ============================================================================
// Transparent Scenario-Scoring Engine
// Every score contribution is visible to the user.
// This is NOT a machine-learning prediction.
// It is a transparent, rules-based score on synthetic assumptions.
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
 * Each factor returns its contribution (0 to maxContribution).
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
    // Scale: 0 at 35%, full at 65%
    const scale = clamp((totalHousingRatio - 35) / 30, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.postResetBurden);
    factors.push({
      id: "post-reset-burden",
      label: "Post-reset housing burden above 50% of income",
      description: `Total housing burden is ${totalHousingRatio.toFixed(0)}% of income post-reset.`,
      maxContribution: MAX_CONTRIBUTIONS.postResetBurden,
      contribution,
      triggered,
      evidence: `Mortgage ₫${(metrics.postResetPayment / 1e6).toFixed(1)}M + Housing ₫${(housingCosts / 1e6).toFixed(1)}M = ${totalHousingRatio.toFixed(0)}% of ₫${(scenario.monthlyIncome / 1e6).toFixed(0)}M income`,
    });
  }

  // 2. Emergency fund below 12 months of essential costs
  {
    const essentialMonthly =
      scenario.monthlyLivingExpenses + housingCosts + metrics.postResetPayment;
    const fundMonths = scenario.currentSavings / essentialMonthly;
    const triggered = fundMonths < 6;
    // Scale: 0 at 12 months, full at 3 months
    const scale = clamp((12 - fundMonths) / 9, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.emergencyFundLow);
    factors.push({
      id: "emergency-fund-low",
      label: "Emergency fund below six months of essential costs",
      description: `Emergency fund covers ${fundMonths.toFixed(1)} months of essential costs.`,
      maxContribution: MAX_CONTRIBUTIONS.emergencyFundLow,
      contribution,
      triggered,
      evidence: `Fund ₫${(scenario.currentSavings / 1e6).toFixed(0)}M / Monthly essentials ₫${(essentialMonthly / 1e6).toFixed(1)}M = ${fundMonths.toFixed(1)} months`,
    });
  }

  // 3. Large change between introductory and post-introductory payment
  {
    const jumpPct = metrics.paymentIncreasePct;
    const triggered = jumpPct > 20;
    // Scale: 0 at 5%, full at 45%
    const scale = clamp((jumpPct - 5) / 40, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.paymentJump);
    factors.push({
      id: "payment-jump",
      label: "Large change between introductory and post-introductory payment",
      description: `Monthly payment increases by ${jumpPct.toFixed(0)}% after the introductory period.`,
      maxContribution: MAX_CONTRIBUTIONS.paymentJump,
      contribution,
      triggered,
      evidence: `Intro ₫${(metrics.introPayment / 1e6).toFixed(1)}M → Post ₫${(metrics.postResetPayment / 1e6).toFixed(1)}M (+${jumpPct.toFixed(0)}%)`,
    });
  }

  // 4. High loan-to-income relationship
  {
    const lti = metrics.loanToIncomeRatio;
    const triggered = lti > 4;
    // Scale: 0 at 1.5×, full at 5×
    const scale = clamp((lti - 1.5) / 3.5, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.loanToIncome);
    factors.push({
      id: "loan-to-income",
      label: "High loan-to-income relationship",
      description: `Loan principal is ${lti.toFixed(1)}× annual household income.`,
      maxContribution: MAX_CONTRIBUTIONS.loanToIncome,
      contribution,
      triggered,
      evidence: `Loan ₫${(scenario.loanAmount / 1e9).toFixed(1)}B / Annual income ₫${((scenario.monthlyIncome * 12) / 1e9).toFixed(1)}B = ${lti.toFixed(1)}×`,
    });
  }

  // 5. Hidden housing costs relative to income
  {
    const hiddenPctOfIncome = (housingCosts / scenario.monthlyIncome) * 100;
    const triggered = hiddenPctOfIncome > 15;
    // Scale: 0 at 5%, full at 20% of income
    const scale = clamp((hiddenPctOfIncome - 5) / 15, 0, 1);
    const contribution = round(scale * MAX_CONTRIBUTIONS.hiddenCosts);
    factors.push({
      id: "hidden-costs",
      label: "Hidden housing costs excluded from the headline mortgage payment",
      description: `Hidden housing costs are ${hiddenPctOfIncome.toFixed(0)}% of income — not included in the quoted mortgage payment.`,
      maxContribution: MAX_CONTRIBUTIONS.hiddenCosts,
      contribution,
      triggered,
      evidence: `Maintenance ₫${(scenario.monthlyMaintenance / 1e6).toFixed(1)}M + Insurance ₫${(scenario.monthlyInsurance / 1e6).toFixed(1)}M + Furnishing ₫${(scenario.monthlyFurnishingRepair / 1e6).toFixed(1)}M + Mgmt ₫${(scenario.monthlyManagementFees / 1e6).toFixed(1)}M = ${hiddenPctOfIncome.toFixed(0)}% of income`,
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
      label: "Income disruption exhausting emergency reserves",
      description: `A ${scenario.incomeDisruptionMonths}-month income loss would consume ${(consumptionRatio * 100).toFixed(0)}% of current savings.`,
      maxContribution: MAX_CONTRIBUTIONS.incomeDisruption,
      contribution,
      triggered,
      evidence: `Disruption cost ₫${(disruptionDrain / 1e6).toFixed(0)}M / Fund ₫${(scenario.currentSavings / 1e6).toFixed(0)}M → ${(consumptionRatio * 100).toFixed(0)}% consumed`,
    });
  }

  // 7. No long fixed-rate protection
  {
    let scale = 0;
    let description = "";
    let evidence = "";
    if (scenario.isFixedRate) {
      scale = 0;
      description = "Rate is fixed for the full loan term — strong protection.";
      evidence = "Fixed rate for full term";
    } else if (scenario.introductoryPeriodMonths <= 12) {
      scale = 1.0;
      description = `Rate resets after only ${scenario.introductoryPeriodMonths} months — very short protection.`;
      evidence = `Variable rate, resets at month ${scenario.introductoryPeriodMonths + 1}`;
    } else if (scenario.introductoryPeriodMonths <= 23) {
      scale = 0.75;
      description = `Rate resets after ${scenario.introductoryPeriodMonths} months — limited protection.`;
      evidence = `Variable rate, resets at month ${scenario.introductoryPeriodMonths + 1}`;
    } else if (scenario.introductoryPeriodMonths <= 59) {
      scale = 0.5;
      description = `Rate resets after ${scenario.introductoryPeriodMonths} months — moderate protection.`;
      evidence = `Variable rate, resets at month ${scenario.introductoryPeriodMonths + 1}`;
    } else {
      scale = 0.25;
      description = `Rate fixed for ${scenario.introductoryPeriodMonths} months — longer protection, but still variable after.`;
      evidence = `Variable rate, resets at month ${scenario.introductoryPeriodMonths + 1}`;
    }
    const triggered = scale > 0;
    const contribution = round(scale * MAX_CONTRIBUTIONS.noFixedRate);
    factors.push({
      id: "no-fixed-rate",
      label: "No long fixed-rate protection",
      description,
      maxContribution: MAX_CONTRIBUTIONS.noFixedRate,
      contribution,
      triggered,
      evidence,
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
