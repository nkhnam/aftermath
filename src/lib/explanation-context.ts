import type { AnalysisResult, StressTest, EscapeRoute } from "./types";
import type { Lang } from "./i18n-types";
import type { ExplanationContext } from "./explanation-types";

// ============================================================================
// Explanation Context Builder
// Converts an AnalysisResult into a sanitized ExplanationContext.
// Strips all user-identifying information — only calculated financial
// data is sent to the explanation layer.
// ============================================================================

/**
 * Build a sanitized ExplanationContext from an AnalysisResult.
 * No user names, notes, or identifying information is included.
 */
export function buildExplanationContext(
  result: AnalysisResult,
  locale: Lang,
  appliedStress: StressTest | null = null,
  appliedRoute: EscapeRoute | null = null,
): ExplanationContext {
  const { scenario, riskFactors, consequenceEvents, escapeRoutes } = result;

  // Sanitize scenario — strip personal notes, keep only financial values
  const scenarioSummary = {
    propertyPrice: scenario.propertyPrice,
    downPayment: scenario.downPayment,
    loanAmount: scenario.loanAmount,
    loanTermYears: scenario.loanTermYears,
    introductoryRate: scenario.introductoryRate,
    postIntroductoryRate: scenario.postIntroductoryRate,
    introductoryPeriodMonths: scenario.introductoryPeriodMonths,
    monthlyIncome: scenario.monthlyIncome,
    currentSavings: scenario.currentSavings,
    monthlyLivingExpenses: scenario.monthlyLivingExpenses,
    monthlyOwnershipCosts:
      scenario.monthlyMaintenance +
      scenario.monthlyInsurance +
      scenario.monthlyFurnishingRepair +
      scenario.monthlyManagementFees,
    incomeDisruptionMonths: scenario.incomeDisruptionMonths,
    incomeDisruptionStartMonth: scenario.incomeDisruptionStartMonth,
    isFixedRate: scenario.isFixedRate,
    additionalMonthlyDebt: scenario.additionalMonthlyDebt ?? 0,
  };

  // Sanitize metrics
  const metrics = {
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    criticalTurningPoint: result.criticalTurningPoint,
    hasCriticalBreak: result.hasCriticalBreak,
    introMonthlyPayment: result.introMonthlyPayment,
    postResetMonthlyPayment: result.postResetMonthlyPayment,
    paymentIncreasePct: result.paymentIncreasePct,
    paymentToIncomeRatio: result.paymentToIncomeRatio,
    totalHousingBurden: result.totalHousingBurden,
    emergencyFundRunwayMonths: result.emergencyFundRunwayMonths,
  };

  // Sanitize risk factors — keep only structural data, not structured descriptions
  const riskFactorSummaries = riskFactors.map((f) => ({
    id: f.id,
    contribution: f.contribution,
    maxContribution: f.maxContribution,
    triggered: f.triggered,
    sensitivity: f.sensitivity,
  }));

  // Sanitize timeline events — keep only structural data
  const timelineEventSummaries = consequenceEvents.map((e) => ({
    month: e.month,
    eventType: e.eventType,
    severity: e.severity,
    monthlyPayment: e.monthlyPayment,
    monthlyCashFlow: e.monthlyCashFlow,
    emergencyFund: e.emergencyFund,
    isDisruption: e.isDisruption,
    isRateReset: e.isRateReset,
  }));

  // Sanitize escape routes — if a route is applied, use that route's context
  const routesToSummarize: EscapeRoute[] = appliedRoute ? [appliedRoute] : escapeRoutes;
  const escapeRouteSummaries = routesToSummarize.map((r) => ({
    id: r.id,
    newScore: r.newScore,
    isSmallestChange: r.isSmallestChange,
    isViable: r.isViable ?? false,
  }));

  return {
    scenario: scenarioSummary,
    metrics,
    riskFactors: riskFactorSummaries,
    timelineEvents: timelineEventSummaries,
    escapeRoutes: escapeRouteSummaries,
    appliedStress,
    locale,
  };
}

/**
 * Generate a stable cache hash from the explanation context.
 * Used to avoid duplicate Qwen calls when nothing relevant changed.
 */
export function explanationCacheHash(context: ExplanationContext): string {
  const key = JSON.stringify(context);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `exp_${Math.abs(hash).toString(36)}`;
}
