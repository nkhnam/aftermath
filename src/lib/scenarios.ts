import type { FinancialScenario } from "./types";

// ============================================================================
// AfterMath — Synthetic Demo Scenarios
// All data is synthetic. Not real financial data.
// ============================================================================

/** Preset 1: Risky apartment purchase — expected score ~81 */
export const riskyScenario: FinancialScenario = {
  id: "risky-apartment",
  label: "Risky Apartment Purchase",
  description:
    "A household buys an apartment with a teaser-rate mortgage, thin savings, and high hidden costs.",
  propertyPrice: 3_200_000_000,
  downPayment: 800_000_000,
  loanAmount: 2_400_000_000,
  loanTermYears: 20,
  introductoryRate: 0.068,
  postIntroductoryRate: 0.115,
  introductoryPeriodMonths: 12,
  monthlyIncome: 48_000_000,
  currentSavings: 300_000_000,
  monthlyLivingExpenses: 21_000_000,
  monthlyMaintenance: 4_000_000,
  monthlyInsurance: 1_500_000,
  monthlyFurnishingRepair: 1_500_000,
  monthlyManagementFees: 1_000_000,
  incomeDisruptionMonths: 3,
  incomeDisruptionStartMonth: 16,
  isFixedRate: false,
  dataType: "synthetic",
};

/** Preset 2: Safer apartment purchase — expected score ~34 */
export const saferScenario: FinancialScenario = {
  id: "safer-apartment",
  label: "Safer Apartment Purchase",
  description:
    "The same household buys a more affordable apartment with a longer fixed-rate period, larger emergency fund, and lower hidden costs.",
  propertyPrice: 2_600_000_000,
  downPayment: 900_000_000,
  loanAmount: 1_700_000_000,
  loanTermYears: 20,
  introductoryRate: 0.075,
  postIntroductoryRate: 0.095,
  introductoryPeriodMonths: 60,
  monthlyIncome: 48_000_000,
  currentSavings: 400_000_000,
  monthlyLivingExpenses: 21_000_000,
  monthlyMaintenance: 3_500_000,
  monthlyInsurance: 1_200_000,
  monthlyFurnishingRepair: 1_200_000,
  monthlyManagementFees: 800_000,
  incomeDisruptionMonths: 3,
  incomeDisruptionStartMonth: 66,
  isFixedRate: false,
  dataType: "synthetic",
};

/** All available presets */
export const presetScenarios: FinancialScenario[] = [riskyScenario, saferScenario];

/**
 * Generate the safer alternative from a risky scenario.
 * This is used by the "Find a safer version" button.
 */
export function generateSaferAlternative(
  original: FinancialScenario,
): FinancialScenario {
  return {
    ...saferScenario,
    // Keep the same income and living expenses
    monthlyIncome: original.monthlyIncome,
    monthlyLivingExpenses: original.monthlyLivingExpenses,
  };
}
