import type { FinancialScenario, CustomScenarioForm, Persona } from "./types";

// ============================================================================
// AfterMath — Synthetic Demo Scenarios
// All data is synthetic. Not real financial data.
// ============================================================================

/** Preset 1: Risky apartment purchase. */
export const riskyScenario: FinancialScenario = {
  id: "risky-apartment",
  labelKey: "intro.riskyApt",
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

/** Preset 2: Safer apartment purchase. */
export const saferScenario: FinancialScenario = {
  id: "safer-apartment",
  labelKey: "intro.saferApt",
  propertyPrice: 2_600_000_000,
  downPayment: 900_000_000,
  loanAmount: 1_700_000_000,
  loanTermYears: 20,
  introductoryRate: 0.075,
  postIntroductoryRate: 0.095,
  introductoryPeriodMonths: 60,
  monthlyIncome: 70_000_000,
  currentSavings: 400_000_000,
  monthlyLivingExpenses: 21_000_000,
  monthlyMaintenance: 3_500_000,
  monthlyInsurance: 1_200_000,
  monthlyFurnishingRepair: 1_200_000,
  monthlyManagementFees: 800_000,
  incomeDisruptionMonths: 0,
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
  const newDownPayment = Math.round(original.downPayment * 1.2);
  const newLoan = Math.round(original.loanAmount * 0.7);
  return {
    ...original,
    id: original.id + "-safer",
    loanAmount: newLoan,
    propertyPrice: newDownPayment + newLoan,
    downPayment: newDownPayment,
    currentSavings: Math.round(original.currentSavings * 1.3),
    introductoryPeriodMonths: original.isFixedRate
      ? original.introductoryPeriodMonths
      : Math.max(original.introductoryPeriodMonths, 60),
    monthlyMaintenance: Math.round(original.monthlyMaintenance * 0.85),
    monthlyInsurance: Math.round(original.monthlyInsurance * 0.8),
    monthlyFurnishingRepair: Math.round(original.monthlyFurnishingRepair * 0.8),
    monthlyManagementFees: Math.round(original.monthlyManagementFees * 0.8),
  };
}

// ============================================================================
// Custom Scenario Support
// ============================================================================

/** Default form values for custom scenario */
export function getDefaultForm(): CustomScenarioForm {
  return {
    scenarioName: "",
    propertyPrice: 3_000_000_000,
    downPayment: 800_000_000,
    loanAmount: 2_200_000_000,
    loanTermYears: 20,
    introductoryRate: 7.0,
    postIntroductoryRate: 11.0,
    introductoryPeriodMonths: 24,
    monthlyIncome: 45_000_000,
    currentSavings: 300_000_000,
    monthlyLivingExpenses: 20_000_000,
    monthlyOwnershipCosts: 6_000_000,
    incomeDisruptionMonths: 3,
    incomeDisruptionStartMonth: 28,
    incomeReductionPercent: 0,
    unexpectedEmergencyExpense: 0,
    isFixedRate: false,
    additionalMonthlyDebt: 0,
    dependants: 0,
    scenarioNote: "",
  };
}

/** Quick-start personas for custom scenario */
export const personas: Persona[] = [
  {
    id: "young_family",
    formValues: {
      scenarioName: "",
      propertyPrice: 3_000_000_000,
      downPayment: 800_000_000,
      loanAmount: 2_200_000_000,
      loanTermYears: 25,
      introductoryRate: 7.5,
      postIntroductoryRate: 11.0,
      introductoryPeriodMonths: 24,
      monthlyIncome: 45_000_000,
      currentSavings: 300_000_000,
      monthlyLivingExpenses: 20_000_000,
      monthlyOwnershipCosts: 6_000_000,
      incomeDisruptionMonths: 3,
      isFixedRate: false,
      additionalMonthlyDebt: 0,
      dependants: 1,
    },
  },
  {
    id: "single_professional",
    formValues: {
      scenarioName: "",
      propertyPrice: 2_200_000_000,
      downPayment: 700_000_000,
      loanAmount: 1_500_000_000,
      loanTermYears: 20,
      introductoryRate: 7.0,
      postIntroductoryRate: 10.5,
      introductoryPeriodMonths: 36,
      monthlyIncome: 40_000_000,
      currentSavings: 350_000_000,
      monthlyLivingExpenses: 15_000_000,
      monthlyOwnershipCosts: 4_500_000,
      incomeDisruptionMonths: 2,
      isFixedRate: false,
      additionalMonthlyDebt: 0,
      dependants: 0,
    },
  },
  {
    id: "small_business_owner",
    formValues: {
      scenarioName: "",
      propertyPrice: 3_500_000_000,
      downPayment: 1_000_000_000,
      loanAmount: 2_500_000_000,
      loanTermYears: 20,
      introductoryRate: 8.0,
      postIntroductoryRate: 12.0,
      introductoryPeriodMonths: 12,
      monthlyIncome: 55_000_000,
      currentSavings: 400_000_000,
      monthlyLivingExpenses: 22_000_000,
      monthlyOwnershipCosts: 7_000_000,
      incomeDisruptionMonths: 4,
      isFixedRate: false,
      additionalMonthlyDebt: 3_000_000,
      dependants: 2,
    },
  },
];

/**
 * Convert a CustomScenarioForm to a FinancialScenario for analysis.
 * Splits combined ownership costs into components and derives the
 * income disruption start month.
 */
export function formToScenario(form: CustomScenarioForm): FinancialScenario {
  const totalMonths = form.loanTermYears * 12;

  const disruptionStart = Math.min(
    Math.max(1, form.incomeDisruptionStartMonth),
    Math.max(1, totalMonths - form.incomeDisruptionMonths + 1),
  );

  // Split combined ownership costs into approximate components
  const maintenance = Math.round(form.monthlyOwnershipCosts * 0.4);
  const insurance = Math.round(form.monthlyOwnershipCosts * 0.15);
  const furnishing = Math.round(form.monthlyOwnershipCosts * 0.3);
  const management = Math.round(form.monthlyOwnershipCosts * 0.15);

  return {
    id: "custom-scenario",
    labelKey: "custom.title",
    propertyPrice: form.propertyPrice,
    downPayment: form.downPayment,
    loanAmount: form.loanAmount,
    loanTermYears: form.loanTermYears,
    introductoryRate: form.introductoryRate / 100,
    postIntroductoryRate: form.postIntroductoryRate / 100,
    introductoryPeriodMonths: form.introductoryPeriodMonths,
    monthlyIncome: form.monthlyIncome,
    currentSavings: form.currentSavings,
    monthlyLivingExpenses: form.monthlyLivingExpenses,
    monthlyMaintenance: maintenance,
    monthlyInsurance: insurance,
    monthlyFurnishingRepair: furnishing,
    monthlyManagementFees: management,
    incomeDisruptionMonths: form.incomeDisruptionMonths,
    incomeDisruptionStartMonth: disruptionStart,
    incomeReductionPercent: form.incomeReductionPercent,
    plannedMajorExpense: form.unexpectedEmergencyExpense,
    unexpectedEmergencyExpenseMonth: disruptionStart,
    simulationHorizonMonths: Math.min(totalMonths, 480),
    isFixedRate: form.isFixedRate,
    dataType: "synthetic",
    additionalMonthlyDebt: form.additionalMonthlyDebt || undefined,
    dependants: form.dependants || undefined,
    scenarioNote: form.scenarioNote || undefined,
    isCustom: true,
  };
}
