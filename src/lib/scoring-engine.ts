import type { FinancialScenario, RiskFactor } from "./types";
import type { StructuredOutput } from "./i18n-types";
import {
  findEarliestCriticalTurningPoint,
  getScenarioMetrics,
  runMonthlySimulation,
  totalHousingBurden,
} from "./financial-engine";
import { clamp, round } from "./utils";

// Transparent 0–100 score. The six base factors sum to 100 possible points.
export const MAX_CONTRIBUTIONS = {
  postResetBurden: 25,
  totalCommitment: 20,
  emergencyFundLow: 20,
  paymentJump: 15,
  postResetCashFlow: 15,
  loanToValue: 5,
} as const;

function linear(value: number, safe: number, dangerous: number, max: number): number {
  return round(clamp((value - safe) / (dangerous - safe), 0, 1) * max);
}

function inverse(value: number, safe: number, dangerous: number, max: number): number {
  return round(clamp((safe - value) / (safe - dangerous), 0, 1) * max);
}

function factor(
  id: string,
  contribution: number,
  maxContribution: number,
  values: Record<string, string | number>,
  sensitivity: "high" | "medium" | "low",
): RiskFactor {
  return {
    id,
    description: { type: `riskfactor.${id}.desc`, values },
    reason: { type: `riskfactor.${id}.reason`, values: {} },
    maxContribution,
    contribution,
    triggered: contribution > 0,
    evidence: { type: `riskfactor.${id}.evidence`, values },
    sourceType: "verified_calc",
    sensitivity,
  };
}

export function calculateRiskFactors(scenario: FinancialScenario): RiskFactor[] {
  const metrics = getScenarioMetrics(scenario);
  const ownership = totalHousingBurden(scenario);
  const income = scenario.monthlyIncome;
  const debt = scenario.additionalMonthlyDebt ?? 0;
  const debtObligations =
    metrics.postResetPayment + scenario.monthlyInsurance + scenario.monthlyManagementFees + debt;
  const essential = metrics.postResetPayment + ownership + debt + scenario.monthlyLivingExpenses;
  const debtToIncomeRatio = income > 0 ? (debtObligations / income) * 100 : 100;
  const commitmentRatio = income > 0 ? (essential / income) * 100 : 100;
  const reserveMonths = essential > 0 ? scenario.currentSavings / essential : 99;
  const postResetSurplus = income - essential;
  const surplusRatio = income > 0 ? (postResetSurplus / income) * 100 : -100;
  const ltv = scenario.propertyPrice > 0 ? (scenario.loanAmount / scenario.propertyPrice) * 100 : 100;

  return [
    factor(
      "post-reset-burden",
      linear(debtToIncomeRatio, 36, 50, MAX_CONTRIBUTIONS.postResetBurden),
      MAX_CONTRIBUTIONS.postResetBurden,
      {
        ratio: debtToIncomeRatio,
        mortgage: metrics.postResetPayment,
        housing: scenario.monthlyInsurance + scenario.monthlyManagementFees,
        debt,
        income,
      },
      "high",
    ),
    factor(
      "total-commitment",
      linear(commitmentRatio, 60, 90, MAX_CONTRIBUTIONS.totalCommitment),
      MAX_CONTRIBUTIONS.totalCommitment,
      { ratio: commitmentRatio, commitments: essential, income },
      "high",
    ),
    factor(
      "emergency-fund-low",
      inverse(reserveMonths, 6, 1, MAX_CONTRIBUTIONS.emergencyFundLow),
      MAX_CONTRIBUTIONS.emergencyFundLow,
      { months: reserveMonths, fund: scenario.currentSavings, essentials: essential },
      "high",
    ),
    factor(
      "payment-jump",
      linear(metrics.paymentIncreasePct, 10, 50, MAX_CONTRIBUTIONS.paymentJump),
      MAX_CONTRIBUTIONS.paymentJump,
      { pct: metrics.paymentIncreasePct, intro: metrics.introPayment, post: metrics.postResetPayment },
      "medium",
    ),
    factor(
      "post-reset-cash-flow",
      inverse(surplusRatio, 15, 0, MAX_CONTRIBUTIONS.postResetCashFlow),
      MAX_CONTRIBUTIONS.postResetCashFlow,
      { surplus: postResetSurplus, ratio: surplusRatio, income },
      "high",
    ),
    factor(
      "loan-to-value",
      linear(ltv, 70, 90, MAX_CONTRIBUTIONS.loanToValue),
      MAX_CONTRIBUTIONS.loanToValue,
      { ratio: ltv, loan: scenario.loanAmount, price: scenario.propertyPrice },
      "medium",
    ),
  ];
}

export function calculateRiskScore(scenario: FinancialScenario): {
  score: number;
  factors: RiskFactor[];
} {
  const factors = calculateRiskFactors(scenario);
  const baseScore = factors.reduce((sum, item) => sum + item.contribution, 0);
  const simulation = runMonthlySimulation(scenario);
  const critical = findEarliestCriticalTurningPoint(simulation, scenario);
  const reserveExhausted = simulation.some((point) => point.emergencyFund <= 0);
  const postPayment = getScenarioMetrics(scenario).postResetPayment;
  const threeMonthThreshold = (
    postPayment + totalHousingBurden(scenario) + scenario.monthlyLivingExpenses +
    (scenario.additionalMonthlyDebt ?? 0)
  ) * 3;
  const reserveCritical = simulation.some((point) => point.emergencyFund < threeMonthThreshold);
  let negativeStreak = 0;
  let hasThreeMonthDeficit = false;
  for (const point of simulation) {
    negativeStreak = !point.isDisruption && point.monthlyCashFlow < 0
      ? negativeStreak + 1
      : 0;
    if (negativeStreak >= 3) hasThreeMonthDeficit = true;
  }

  let floor = 0;
  if (reserveExhausted) floor = 80;
  else if (reserveCritical) floor = 65;
  else if (hasThreeMonthDeficit || critical.reason === "unsustainable_burden") floor = 60;
  const score = clamp(Math.max(baseScore, floor), 0, 100);
  if (score > baseScore) {
    factors.push(factor(
      "simulation-floor",
      score - baseScore,
      100,
      { base: baseScore, floor, score },
      "high",
    ));
  }
  return { score, factors };
}

export function getRiskLevel(score: number): "low" | "moderate" | "high" | "critical" {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "moderate";
  return "low";
}

export function so(type: string, values: Record<string, string | number> = {}): StructuredOutput {
  return { type, values };
}
