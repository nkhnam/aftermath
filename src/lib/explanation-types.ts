import type { Lang } from "./i18n-types";

// ============================================================================
// AfterMath — Qwen Explanation Layer Types
// The deterministic engine remains the sole source of truth.
// Qwen is only an optional explanation layer that converts verified
// structured results into clear natural-language explanations.
// ============================================================================

/** The structured explanation output — validated by both providers */
export interface ExplanationResult {
  headline: string;
  summary: string;
  criticalTurningPointExplanation: string;
  topInsights: string[];
  recommendedActions: string[];
  disclaimer: string;
}

/** Whether the explanation came from Qwen or the deterministic fallback */
export type ExplanationSource = "qwen" | "deterministic";

/** Full response from the explanation layer */
export interface ExplanationResponse {
  explanation: ExplanationResult;
  source: ExplanationSource;
}

// ── Sanitized context sent to Qwen (no user-identifying info) ──

/** Sanitized scenario summary — only financial values, no personal notes */
export interface ScenarioSummary {
  propertyPrice: number;
  downPayment: number;
  loanAmount: number;
  loanTermYears: number;
  introductoryRate: number;
  postIntroductoryRate: number;
  introductoryPeriodMonths: number;
  monthlyIncome: number;
  currentSavings: number;
  monthlyLivingExpenses: number;
  monthlyOwnershipCosts: number;
  incomeDisruptionMonths: number;
  incomeDisruptionStartMonth: number;
  isFixedRate: boolean;
  additionalMonthlyDebt: number;
}

/** Sanitized calculated metrics */
export interface CalculatedMetrics {
  riskScore: number;
  riskLevel: string;
  criticalTurningPoint: number;
  hasCriticalBreak: boolean;
  introMonthlyPayment: number;
  postResetMonthlyPayment: number;
  paymentIncreasePct: number;
  paymentToIncomeRatio: number;
  totalHousingBurden: number;
  emergencyFundRunwayMonths: number;
}

/** Sanitized risk factor for Qwen context */
export interface RiskFactorSummary {
  id: string;
  contribution: number;
  maxContribution: number;
  triggered: boolean;
  sensitivity: string;
}

/** Sanitized timeline event for Qwen context */
export interface TimelineEventSummary {
  month: number;
  eventType: string;
  severity: string;
  monthlyPayment: number;
  monthlyCashFlow: number;
  emergencyFund: number;
  isDisruption: boolean;
  isRateReset: boolean;
}

/** Sanitized escape route for Qwen context */
export interface EscapeRouteSummary {
  id: string;
  newScore: number;
  isSmallestChange: boolean;
  isViable: boolean;
}

/** Applied stress test (if any) */
export interface AppliedStressSummary {
  type: string;
  value: number;
}

/**
 * The full sanitized context sent to the explanation layer.
 * Contains ONLY calculated financial data — no user names, notes,
 * or identifying information.
 */
export interface ExplanationContext {
  scenario: ScenarioSummary;
  metrics: CalculatedMetrics;
  riskFactors: RiskFactorSummary[];
  timelineEvents: TimelineEventSummary[];
  escapeRoutes: EscapeRouteSummary[];
  appliedStress: AppliedStressSummary | null;
  locale: Lang;
}

// ── Provider Interface ──

/**
 * Explanation provider interface.
 * Two implementations:
 * 1. QwenExplanationProvider — calls Alibaba Cloud Qwen (server-side only)
 * 2. DeterministicExplanationProvider — mandatory fallback, runs anywhere
 */
export interface ExplanationProvider {
  explainAnalysis(context: ExplanationContext): Promise<ExplanationResponse>;
}
