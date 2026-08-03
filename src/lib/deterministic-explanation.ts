import type { Lang } from "./i18n-types";
import { formatValue } from "./formatters";
import { en } from "./i18n-en";
import { vi } from "./i18n-vi";
import type {
  ExplanationContext,
  ExplanationResponse,
} from "./explanation-types";

// ============================================================================
// Deterministic Explanation Provider
// The mandatory fallback. Composes high-quality localized explanations
// from structured translation keys and calculated findings.
// Runs on both server (API route) and client (network-error fallback).
// ============================================================================

const translations: Record<Lang, Record<string, string>> = { en, vi };
const INTERP_REGEX = /\{(\w+)(?::(\w+))?\}/g;

/** Translate a key with optional interpolation params (standalone, no React) */
function tr(
  key: string,
  params: Record<string, string | number> | undefined,
  lang: Lang,
): string {
  let text = translations[lang][key] ?? translations.en[key] ?? key;
  if (params) {
    text = text.replace(
      INTERP_REGEX,
      (_match, k: string, hint: string | undefined) => {
        const value = params[k];
        if (value === undefined) return _match;
        if (hint) {
          return formatValue(value, hint, lang);
        }
        return String(value);
      },
    );
  }
  return text;
}

/** Map risk factor IDs to insight template keys */
const INSIGHT_KEYS: Record<string, string> = {
  "post-reset-burden": "explain.det.insight.burden",
  "emergency-fund-low": "explain.det.insight.reserve",
  "payment-jump": "explain.det.insight.payment",
  "loan-to-income": "explain.det.insight.loanToIncome",
  "hidden-costs": "explain.det.insight.hiddenCosts",
  "income-disruption": "explain.det.insight.disruption",
  "no-fixed-rate": "explain.det.insight.noFixedRate",
};

/**
 * Generate a deterministic explanation from the analysis context.
 * Composes dynamic, localized content from calculated findings.
 */
export function generateDeterministicExplanation(
  context: ExplanationContext,
): ExplanationResponse {
  const { scenario, metrics, riskFactors, escapeRoutes, locale } =
    context;
  const lang = locale;

  // ── Headline ──
  let headlineKey: string;
  if (metrics.riskScore >= 70) headlineKey = "explain.det.headline.high";
  else if (metrics.riskScore >= 50) headlineKey = "explain.det.headline.elevated";
  else if (metrics.riskScore >= 30) headlineKey = "explain.det.headline.manageable";
  else headlineKey = "explain.det.headline.low";

  const headline = tr(headlineKey, undefined, lang);

  // ── Summary ──
  let summary: string;
  if (metrics.riskScore < 30) {
    summary = tr("explain.det.summary.safe", undefined, lang);
  } else if (metrics.hasCriticalBreak) {
    summary = tr("explain.det.summary.critical", {
      resetMonth: scenario.introductoryPeriodMonths + 1,
      criticalMonth: metrics.criticalTurningPoint,
    }, lang);
  } else if (metrics.totalHousingBurdenRatio > 50) {
    summary = tr("explain.det.summary.burden", {
      ratio: metrics.totalHousingBurdenRatio,
    }, lang);
  } else {
    summary = tr("explain.det.summary.nocritical", {
      resetMonth: scenario.introductoryPeriodMonths + 1,
    }, lang);
  }

  // ── Critical turning point explanation ──
  let criticalTurningPointExplanation: string;
  if (metrics.hasCriticalBreak) {
    criticalTurningPointExplanation = tr("explain.det.critical.has", {
      criticalMonth: metrics.criticalTurningPoint,
      payment: metrics.postResetMonthlyPayment,
      disruptionMonth: scenario.incomeDisruptionStartMonth,
    }, lang);
  } else {
    criticalTurningPointExplanation = tr("explain.det.critical.none", undefined, lang);
  }

  // ── Top insights (from triggered risk factors, top 3 by contribution) ──
  const triggeredFactors = riskFactors
    .filter((f) => f.triggered)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  const topInsights: string[] = [];

  for (const factor of triggeredFactors) {
    const insightKey = INSIGHT_KEYS[factor.id];
    if (!insightKey) continue;

    const params: Record<string, string | number> = {};
    switch (factor.id) {
      case "post-reset-burden":
        params.ratio = metrics.totalHousingBurdenRatio;
        break;
      case "emergency-fund-low":
        params.months = Math.round(metrics.emergencyFundRunwayMonths);
        break;
      case "payment-jump":
        params.pct = metrics.paymentIncreasePct;
        break;
      case "loan-to-income": {
        const annualIncome = scenario.monthlyIncome * 12;
        const years = Math.round(scenario.loanAmount / annualIncome);
        params.years = years;
        break;
      }
      case "hidden-costs":
        params.ratio = Math.round(
          metrics.totalHousingBurdenRatio - metrics.paymentToIncomeRatio,
        );
        break;
      case "income-disruption":
        params.n = scenario.incomeDisruptionMonths;
        params.startMonth = scenario.incomeDisruptionStartMonth;
        break;
      // no-fixed-rate has no params
    }

    topInsights.push(tr(insightKey, params, lang));
  }

  // If fewer than 3 insights, add general ones
  if (topInsights.length < 3) {
    if (!scenario.isFixedRate && !topInsights.some((s) => s.includes("fixed"))) {
      topInsights.push(tr("explain.det.insight.noFixedRate", undefined, lang));
    }
    if (metrics.paymentIncreasePct > 0 && !topInsights.some((s) => s.includes("increases"))) {
      topInsights.push(
        tr("explain.det.insight.payment", { pct: metrics.paymentIncreasePct }, lang),
      );
    }
  }

  // ── Recommended actions ──
  const recommendedActions: string[] = [];

  if (escapeRoutes.length > 0) {
    // Recommend the smallest viable route
    const bestRoute = escapeRoutes.find((r) => r.isSmallestChange) ?? escapeRoutes[0];
    recommendedActions.push(
      tr("explain.det.action.route", {
        from: metrics.riskScore,
        to: bestRoute.newScore,
      }, lang),
    );
  }

  if (metrics.riskScore < 30) {
    recommendedActions.push(tr("explain.det.action.maintain", undefined, lang));
  } else {
    // Add contextual suggestions
    if (!scenario.isFixedRate) {
      recommendedActions.push(tr("explain.det.action.extendFixed", undefined, lang));
    }
    if (metrics.emergencyFundRunwayMonths < 6) {
      recommendedActions.push(tr("explain.det.action.increaseReserve", undefined, lang));
    }
    if (metrics.paymentToIncomeRatio > 40) {
      recommendedActions.push(tr("explain.det.action.reducePrice", undefined, lang));
    }
  }

  // Ensure at least 2 actions
  if (recommendedActions.length < 2) {
    recommendedActions.push(tr("explain.det.action.maintain", undefined, lang));
  }

  // ── Disclaimer ──
  const disclaimer = tr("explain.det.disclaimer", undefined, lang);

  return {
    explanation: {
      headline,
      summary,
      criticalTurningPointExplanation,
      topInsights: topInsights.slice(0, 3),
      recommendedActions: recommendedActions.slice(0, 3),
      disclaimer,
    },
    source: "deterministic",
  };
}
