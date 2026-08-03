import type { FinancialScenario, ValidationError } from "./types";

/** Language-independent validation used before deterministic analysis. */
export function validateScenario(scenario: FinancialScenario): ValidationError[] {
  const errors: ValidationError[] = [];
  const totalMonths = scenario.loanTermYears * 12;
  const horizon = Math.min(totalMonths, scenario.simulationHorizonMonths ?? totalMonths, 480);
  const nonNegative: Array<keyof FinancialScenario> = [
    "downPayment", "currentSavings", "monthlyLivingExpenses", "monthlyMaintenance",
    "monthlyInsurance", "monthlyFurnishingRepair", "monthlyManagementFees",
    "additionalMonthlyDebt", "plannedMajorExpense",
  ];
  if (!(scenario.propertyPrice > 0)) errors.push({ field: "propertyPrice", errorType: "propertyPricePositive" });
  if (scenario.downPayment < 0 || scenario.downPayment >= scenario.propertyPrice) errors.push({ field: "downPayment", errorType: "downPaymentRange" });
  if (!(scenario.loanAmount > 0)) errors.push({ field: "loanAmount", errorType: "loanAmountPositive" });
  if (!(scenario.monthlyIncome > 0)) errors.push({ field: "monthlyIncome", errorType: "incomeMustBePositive" });
  if (scenario.loanTermYears < 1 || scenario.loanTermYears > 40) errors.push({ field: "loanTermYears", errorType: "loanTermRange" });
  if (scenario.introductoryRate < 0 || scenario.introductoryRate > 0.4) errors.push({ field: "introductoryRate", errorType: "rateRange" });
  if (scenario.postIntroductoryRate < 0 || scenario.postIntroductoryRate > 0.4) errors.push({ field: "postIntroductoryRate", errorType: "rateRange" });
  if (scenario.introductoryPeriodMonths > totalMonths) errors.push({ field: "introductoryPeriodMonths", errorType: "introExceedsTerm" });
  for (const field of nonNegative) {
    const value = scenario[field];
    if (typeof value === "number" && value < 0) errors.push({ field, errorType: "valueNegative" });
  }
  const reduction = scenario.incomeReductionPercent ?? 0;
  if (reduction < 0 || reduction > 100) errors.push({ field: "incomeReductionPercent", errorType: "incomeReductionRange" });
  if (scenario.incomeDisruptionMonths < 0 || scenario.incomeDisruptionStartMonth + scenario.incomeDisruptionMonths - 1 > horizon) {
    errors.push({ field: "incomeDisruptionMonths", errorType: "stressExceedsHorizon" });
  }
  return errors;
}
