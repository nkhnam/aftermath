import { describe, expect, it } from "vitest";
import {
  calculateMonthlyPayment,
  findEarliestCriticalTurningPoint,
  getScenarioMetrics,
  remainingBalance,
  runMonthlySimulation,
} from "@/lib/financial-engine";
import { runAnalysis } from "@/lib/agents";
import { validateScenario } from "@/lib/scenario-validation";
import { riskyScenario } from "@/lib/scenarios";
import type { FinancialScenario } from "@/lib/types";

const safeScenario: FinancialScenario = {
  ...riskyScenario,
  id: "test-safe",
  propertyPrice: 2_000_000_000,
  downPayment: 1_000_000_000,
  loanAmount: 1_000_000_000,
  monthlyIncome: 100_000_000,
  currentSavings: 1_000_000_000,
  monthlyLivingExpenses: 25_000_000,
  monthlyMaintenance: 2_000_000,
  monthlyInsurance: 500_000,
  monthlyFurnishingRepair: 500_000,
  monthlyManagementFees: 500_000,
  introductoryRate: 0.06,
  postIntroductoryRate: 0.08,
  introductoryPeriodMonths: 24,
  incomeDisruptionMonths: 0,
};

const highRiskScenario: FinancialScenario = {
  ...riskyScenario,
  id: "test-high",
  propertyPrice: 4_000_000_000,
  downPayment: 400_000_000,
  loanAmount: 3_600_000_000,
  monthlyIncome: 30_000_000,
  currentSavings: 50_000_000,
  monthlyLivingExpenses: 20_000_000,
  postIntroductoryRate: 0.16,
  introductoryPeriodMonths: 12,
  incomeDisruptionMonths: 3,
  incomeDisruptionStartMonth: 16,
};

describe("mortgage and deterministic simulation", () => {
  it("handles zero interest", () => {
    expect(calculateMonthlyPayment(1_200_000_000, 0, 120)).toBe(10_000_000);
  });

  it("calculates a normal amortized payment", () => {
    expect(calculateMonthlyPayment(1_000_000_000, 0.12, 120)).toBeCloseTo(14_347_094, -1);
  });

  it("reduces principal during the introductory period", () => {
    const payment = calculateMonthlyPayment(1_000_000_000, 0.08, 240);
    const balance = remainingBalance(1_000_000_000, 0.08, 240, 24, payment);
    expect(balance).toBeLessThan(1_000_000_000);
    expect(balance).toBeGreaterThan(0);
  });

  it("re-amortizes the remaining balance after reset", () => {
    const metrics = getScenarioMetrics(riskyScenario);
    expect(metrics.postResetPayment).toBeGreaterThan(metrics.introPayment);
  });

  it("separates mortgage ratio, DTI, and total cash commitment", () => {
    const scenario = {
      ...safeScenario,
      monthlyIncome: 100_000_000,
      monthlyLivingExpenses: 20_000_000,
      additionalMonthlyDebt: 5_000_000,
    };
    const metrics = getScenarioMetrics(scenario);

    expect(metrics.housingToIncomeRatio).toBeGreaterThan(metrics.paymentToIncomeRatio);
    expect(metrics.debtToIncomeRatio).toBeGreaterThan(metrics.housingToIncomeRatio);
    expect(metrics.cashCommitmentRatio).toBeGreaterThan(metrics.debtToIncomeRatio);
    const nonDebtCashCosts =
      scenario.monthlyLivingExpenses +
      scenario.monthlyMaintenance +
      scenario.monthlyFurnishingRepair;
    expect(metrics.cashCommitmentRatio - metrics.debtToIncomeRatio).toBeCloseTo(
      (nonDebtCashCosts / scenario.monthlyIncome) * 100,
      1,
    );
  });

  it("keeps negative reserve balances to show accumulated shortfall", () => {
    const simulation = runMonthlySimulation(highRiskScenario);
    expect(simulation.some((point) => point.emergencyFund < 0)).toBe(true);
  });

  it("returns no invented critical month for a healthy scenario", () => {
    const critical = findEarliestCriticalTurningPoint(runMonthlySimulation(safeScenario), safeScenario);
    expect(critical).toEqual({ month: 0, hasCriticalBreak: false, reason: "none" });
  });

  it("caps simulation at 480 months", () => {
    expect(runMonthlySimulation({ ...safeScenario, loanTermYears: 40, simulationHorizonMonths: 999 }).length).toBe(480);
  });

  it("produces materially different safe and high-risk outputs", () => {
    const safe = runAnalysis(safeScenario);
    const high = runAnalysis(highRiskScenario);
    expect(safe.riskLevel).toBe("low");
    expect(safe.hasCriticalBreak).toBe(false);
    expect(high.riskLevel).toBe("critical");
    expect(high.hasCriticalBreak).toBe(true);
    expect(high.riskScore - safe.riskScore).toBeGreaterThan(40);
  });

  it("responds monotonically to income, savings, rates, and expenses", () => {
    const base = runAnalysis(riskyScenario).riskScore;
    expect(runAnalysis({ ...riskyScenario, monthlyIncome: riskyScenario.monthlyIncome * 1.5 }).riskScore).toBeLessThanOrEqual(base);
    expect(runAnalysis({ ...riskyScenario, currentSavings: riskyScenario.currentSavings * 2 }).riskScore).toBeLessThanOrEqual(base);
    expect(runAnalysis({ ...riskyScenario, postIntroductoryRate: riskyScenario.postIntroductoryRate + 0.03 }).riskScore).toBeGreaterThanOrEqual(base);
    expect(runAnalysis({ ...riskyScenario, monthlyLivingExpenses: riskyScenario.monthlyLivingExpenses + 10_000_000 }).riskScore).toBeGreaterThanOrEqual(base);
  });

  it("rejects invalid scenarios with language-independent identifiers", () => {
    const errors = validateScenario({ ...safeScenario, propertyPrice: 0, monthlyIncome: 0, loanTermYears: 41 });
    expect(errors.map((error) => error.errorType)).toEqual(expect.arrayContaining([
      "propertyPricePositive", "incomeMustBePositive", "loanTermRange",
    ]));
  });
});
