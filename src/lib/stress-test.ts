import type { FinancialScenario, StressTest } from "./types";

// ============================================================================
// AfterMath — Stress Test Engine
// Applies a single financial shock to a scenario and returns a new modified
// scenario. The original scenario is never mutated.
// ============================================================================

/**
 * Apply a stress test to a scenario, returning a new modified scenario.
 * The original scenario is not mutated.
 */
export function applyStress(scenario: FinancialScenario, stress: StressTest): FinancialScenario {
  const s: FinancialScenario = { ...scenario };

  switch (stress.type) {
    case "income_interruption":
      s.incomeDisruptionMonths = stress.value;
      break;

    case "income_reduction":
      s.monthlyIncome = Math.round(scenario.monthlyIncome * (1 - stress.value / 100));
      break;

    case "rate_increase":
      // Add percentage points to the post-introductory rate (and intro if fixed)
      s.postIntroductoryRate = scenario.postIntroductoryRate + stress.value / 100;
      if (scenario.isFixedRate) {
        s.introductoryRate = scenario.introductoryRate + stress.value / 100;
      }
      break;

    case "emergency_expense":
      s.currentSavings = Math.max(0, scenario.currentSavings - stress.value);
      break;

    case "additional_debt":
      s.additionalMonthlyDebt = (scenario.additionalMonthlyDebt ?? 0) + stress.value;
      break;

    case "ownership_cost_increase": {
      const factor = 1 + stress.value / 100;
      s.monthlyMaintenance = Math.round(scenario.monthlyMaintenance * factor);
      s.monthlyInsurance = Math.round(scenario.monthlyInsurance * factor);
      s.monthlyFurnishingRepair = Math.round(scenario.monthlyFurnishingRepair * factor);
      s.monthlyManagementFees = Math.round(scenario.monthlyManagementFees * factor);
      break;
    }
  }

  return s;
}

/**
 * Stress test type definitions with their severity options.
 * Used by the UI to render selectors.
 */
export const STRESS_TYPES: {
  type: StressTest["type"];
  severityOptions: { value: number; labelKey: string }[];
}[] = [
  {
    type: "income_interruption",
    severityOptions: [
      { value: 1, labelKey: "stress.severity.1month" },
      { value: 3, labelKey: "stress.severity.3months" },
      { value: 6, labelKey: "stress.severity.6months" },
    ],
  },
  {
    type: "income_reduction",
    severityOptions: [
      { value: 10, labelKey: "stress.severity.10pct" },
      { value: 20, labelKey: "stress.severity.20pct" },
      { value: 30, labelKey: "stress.severity.30pct" },
    ],
  },
  {
    type: "rate_increase",
    severityOptions: [
      { value: 1, labelKey: "stress.severity.1pp" },
      { value: 2, labelKey: "stress.severity.2pp" },
      { value: 3, labelKey: "stress.severity.3pp" },
    ],
  },
  {
    type: "emergency_expense",
    severityOptions: [
      { value: 50_000_000, labelKey: "stress.severity.50m" },
      { value: 100_000_000, labelKey: "stress.severity.100m" },
      { value: 200_000_000, labelKey: "stress.severity.200m" },
      { value: 300_000_000, labelKey: "stress.severity.300m" },
    ],
  },
  {
    type: "additional_debt",
    severityOptions: [
      { value: 3_000_000, labelKey: "stress.severity.3m_month" },
      { value: 5_000_000, labelKey: "stress.severity.5m_month" },
      { value: 10_000_000, labelKey: "stress.severity.10m_month" },
    ],
  },
  {
    type: "ownership_cost_increase",
    severityOptions: [
      { value: 10, labelKey: "stress.severity.10pct" },
      { value: 20, labelKey: "stress.severity.20pct" },
      { value: 30, labelKey: "stress.severity.30pct" },
    ],
  },
];
