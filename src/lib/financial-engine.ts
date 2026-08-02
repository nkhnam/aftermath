import type {
  FinancialScenario,
  MonthlySimulation,
  ConsequenceEvent,
} from "./types";
import { round } from "./utils";

// ============================================================================
// Deterministic Financial Engine
// All calculations are pure functions. No external APIs, no randomness.
// Synthetic data only — not financial advice.
// ============================================================================

/**
 * Calculate the monthly payment for an amortizing loan.
 * Formula: P = L * r * (1+r)^n / ((1+r)^n - 1)
 */
export function calculateMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  termMonths: number,
): number {
  const r = annualRate / 12;
  if (r === 0) return loanAmount / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (loanAmount * r * factor) / (factor - 1);
}

/**
 * Calculate remaining balance after a number of payments at a given rate.
 */
export function remainingBalance(
  loanAmount: number,
  annualRate: number,
  termMonths: number,
  monthsElapsed: number,
  monthlyPayment: number,
): number {
  const r = annualRate / 12;
  if (r === 0) return Math.max(0, loanAmount - monthlyPayment * monthsElapsed);
  const factor = Math.pow(1 + r, monthsElapsed);
  return Math.max(0, loanAmount * factor - (monthlyPayment * (factor - 1)) / r);
}

/** Total monthly housing burden (mortgage + all housing costs) */
export function totalHousingBurden(scenario: FinancialScenario): number {
  return (
    scenario.monthlyMaintenance +
    scenario.monthlyInsurance +
    scenario.monthlyFurnishingRepair +
    scenario.monthlyManagementFees
  );
}

/**
 * Run a full month-by-month financial simulation.
 * Returns an array of MonthlySimulation for every month of the loan term.
 */
export function runMonthlySimulation(scenario: FinancialScenario): MonthlySimulation[] {
  const totalMonths = scenario.loanTermYears * 12;
  const introRate = scenario.introductoryRate;
  const postRate = scenario.isFixedRate
    ? scenario.introductoryRate
    : scenario.postIntroductoryRate;
  const introMonths = scenario.isFixedRate
    ? totalMonths
    : scenario.introductoryPeriodMonths;

  // Calculate payments
  const introPayment = calculateMonthlyPayment(
    scenario.loanAmount,
    introRate,
    totalMonths,
  );

  // Remaining balance after intro period
  const balanceAfterIntro = scenario.isFixedRate
    ? scenario.loanAmount
    : remainingBalance(
        scenario.loanAmount,
        introRate,
        totalMonths,
        introMonths,
        introPayment,
      );

  // Post-reset payment (re-amortize remaining balance over remaining term)
  const postResetPayment = scenario.isFixedRate
    ? introPayment
    : calculateMonthlyPayment(
        balanceAfterIntro,
        postRate,
        totalMonths - introMonths,
      );

  const housingCosts = totalHousingBurden(scenario);
  const monthlySim: MonthlySimulation[] = [];
  let emergencyFund = scenario.currentSavings;

  for (let month = 1; month <= totalMonths; month++) {
    const isIntro = month <= introMonths;
    const isRateReset = !scenario.isFixedRate && month === introMonths + 1;
    const monthlyPayment = isIntro ? introPayment : postResetPayment;

    const isDisruption =
      month >= scenario.incomeDisruptionStartMonth &&
      month < scenario.incomeDisruptionStartMonth + scenario.incomeDisruptionMonths;

    const income = isDisruption ? 0 : scenario.monthlyIncome;
    const expenses = scenario.monthlyLivingExpenses + housingCosts;
    const cashFlow = income - expenses - monthlyPayment;
    emergencyFund = Math.max(0, emergencyFund + cashFlow);

    const paymentToIncomeRatio = scenario.monthlyIncome > 0
      ? (monthlyPayment / scenario.monthlyIncome) * 100
      : 0;

    monthlySim.push({
      month,
      monthlyPayment: round(monthlyPayment),
      monthlyIncome: round(income),
      monthlyExpenses: round(expenses + monthlyPayment),
      monthlyCashFlow: round(cashFlow),
      emergencyFund: round(emergencyFund),
      isIntroPeriod: isIntro,
      isRateReset,
      isDisruption,
      paymentToIncomeRatio: round(paymentToIncomeRatio, 1),
    });
  }

  return monthlySim;
}

/**
 * Find the critical turning point — the most dangerous month.
 *
 * Primary: the first month AFTER income disruption ends, IF the emergency
 * fund is below 3 months of essential costs at that point (the moment the
 * household realises they cannot recover).
 *
 * Fallback: the first month the fund drops below 3 months of essential costs.
 * Fallback: the first month with permanently negative cash flow after intro.
 */
export function findCriticalTurningPoint(
  simulation: MonthlySimulation[],
  scenario: FinancialScenario,
): number {
  const housingCosts = totalHousingBurden(scenario);
  const essentialMonthlyCosts =
    scenario.monthlyLivingExpenses + housingCosts +
    // Include the post-reset mortgage payment in essential costs
    (simulation.find((s) => !s.isIntroPeriod)?.monthlyPayment ?? 0);
  const criticalThreshold = essentialMonthlyCosts * 3;

  // Primary: check month after disruption ends
  if (scenario.incomeDisruptionMonths > 0) {
    const postDisruptionMonth =
      scenario.incomeDisruptionStartMonth + scenario.incomeDisruptionMonths;
    const postSim = simulation.find((s) => s.month === postDisruptionMonth);
    if (postSim && postSim.emergencyFund < criticalThreshold) {
      return postDisruptionMonth;
    }
  }

  // Fallback: first month fund drops below 3 months of essential costs
  for (const sim of simulation) {
    if (sim.emergencyFund < criticalThreshold && sim.emergencyFund > 0) {
      return sim.month;
    }
  }

  // Fallback: fund hits zero
  const zeroMonth = simulation.find((s) => s.emergencyFund <= 0);
  if (zeroMonth) return zeroMonth.month;

  // Fallback: first month with negative cash flow after intro period
  const firstNegative = simulation.find(
    (s) => !s.isIntroPeriod && s.monthlyCashFlow < 0,
  );
  return firstNegative?.month ?? scenario.introductoryPeriodMonths + 1;
}

/**
 * Generate key consequence events for the timeline.
 */
export function generateConsequenceEvents(
  simulation: MonthlySimulation[],
  scenario: FinancialScenario,
  criticalTurningPoint: number,
): ConsequenceEvent[] {
  const events: ConsequenceEvent[] = [];
  const totalMonths = simulation.length;
  const introMonths = scenario.isFixedRate
    ? totalMonths
    : scenario.introductoryPeriodMonths;
  const housingCosts = totalHousingBurden(scenario);
  const postResetPayment = simulation.find((s) => !s.isIntroPeriod)?.monthlyPayment ?? 0;
  const essentialMonthlyCosts =
    scenario.monthlyLivingExpenses + housingCosts + postResetPayment;

  // Month 1 — Start
  const m1 = simulation[0];
  events.push({
    month: 1,
    label: "Decision Begins",
    description: `Introductory period starts. Monthly payment: ₫${(m1.monthlyPayment / 1_000_000).toFixed(1)}M.`,
    severity: "safe",
    monthlyPayment: m1.monthlyPayment,
    monthlyCashFlow: m1.monthlyCashFlow,
    emergencyFund: m1.emergencyFund,
    isDisruption: false,
    isRateReset: false,
  });

  // Month 12 (or end of intro) — Rate reset
  if (!scenario.isFixedRate && introMonths < totalMonths) {
    const resetMonth = simulation.find((s) => s.isRateReset);
    if (resetMonth) {
      const prevMonth = simulation[resetMonth.month - 2];
      const increasePct = prevMonth
        ? ((resetMonth.monthlyPayment - prevMonth.monthlyPayment) /
            prevMonth.monthlyPayment) *
          100
        : 0;
      const prevPayM = ((prevMonth?.monthlyPayment ?? 0) / 1_000_000).toFixed(1);
      const resetPayM = (resetMonth.monthlyPayment / 1_000_000).toFixed(1);
      events.push({
        month: resetMonth.month,
        label: "Interest-Rate Reset",
        description: `Payment rises from ₫${prevPayM}M to ₫${resetPayM}M (+${increasePct.toFixed(0)}%).`,
        severity: increasePct > 30 ? "danger" : "caution",
        monthlyPayment: resetMonth.monthlyPayment,
        monthlyCashFlow: resetMonth.monthlyCashFlow,
        emergencyFund: resetMonth.emergencyFund,
        isDisruption: false,
        isRateReset: true,
      });
    }
  }

  // Critical turning point
  const ctSim = simulation.find((s) => s.month === criticalTurningPoint);
  if (ctSim) {
    const fundMonths = essentialMonthlyCosts > 0 ? ctSim.emergencyFund / essentialMonthlyCosts : 0;
    const isGenuinelyCritical = fundMonths < 3;
    const description = isGenuinelyCritical
      ? `Emergency reserve drops below 3 months of essential costs. Fund: ₫${(ctSim.emergencyFund / 1_000_000).toFixed(1)}M.`
      : ctSim.monthlyCashFlow < 0
        ? `Monthly cash flow turns negative during income disruption. Fund remains at ₫${(ctSim.emergencyFund / 1_000_000).toFixed(1)}M (${fundMonths.toFixed(0)} months of coverage).`
        : `Cash-flow pressure point. Fund: ₫${(ctSim.emergencyFund / 1_000_000).toFixed(1)}M.`;
    events.push({
      month: criticalTurningPoint,
      label: isGenuinelyCritical
        ? "Critical Cash-Flow Turning Point"
        : "Cash-Flow Pressure Point",
      description,
      severity: isGenuinelyCritical ? "critical" : "caution",
      monthlyPayment: ctSim.monthlyPayment,
      monthlyCashFlow: ctSim.monthlyCashFlow,
      emergencyFund: ctSim.emergencyFund,
      isDisruption: ctSim.isDisruption,
      isRateReset: ctSim.isRateReset,
    });
  }

  // Income disruption period
  if (scenario.incomeDisruptionMonths > 0) {
    const disruptionStart = simulation.find((s) => s.isDisruption);
    if (disruptionStart && disruptionStart.month !== criticalTurningPoint) {
      events.push({
        month: disruptionStart.month,
        label: "Income Disruption Begins",
        description: `${scenario.incomeDisruptionMonths}-month income loss begins. Zero income, full expenses continue.`,
        severity: "danger",
        monthlyPayment: disruptionStart.monthlyPayment,
        monthlyCashFlow: disruptionStart.monthlyCashFlow,
        emergencyFund: disruptionStart.emergencyFund,
        isDisruption: true,
        isRateReset: false,
      });
    }
  }

  // Month 27 or later — Emergency resilience weak
  const resilienceMonth = simulation.find(
    (s) => s.month >= 27 && s.emergencyFund < scenario.currentSavings * 0.5,
  );
  if (resilienceMonth && resilienceMonth.month !== criticalTurningPoint) {
    events.push({
      month: resilienceMonth.month,
      label: "Emergency Resilience Weak",
      description: `Reserve below 50% of original savings. Fund: ₫${(resilienceMonth.emergencyFund / 1_000_000).toFixed(1)}M.`,
      severity: "danger",
      monthlyPayment: resilienceMonth.monthlyPayment,
      monthlyCashFlow: resilienceMonth.monthlyCashFlow,
      emergencyFund: resilienceMonth.emergencyFund,
      isDisruption: resilienceMonth.isDisruption,
      isRateReset: resilienceMonth.isRateReset,
    });
  }

  // Sort by month and deduplicate
  const seen = new Set<number>();
  return events
    .sort((a, b) => a.month - b.month)
    .filter((e) => {
      if (seen.has(e.month)) return false;
      seen.add(e.month);
      return true;
    });
}

/**
 * Calculate emergency fund runway in months (how long the fund lasts
 * if income stops today, based on current essential costs).
 */
export function calculateEmergencyRunway(
  scenario: FinancialScenario,
  postResetPayment: number,
): number {
  const housingCosts = totalHousingBurden(scenario);
  const monthlyNeed = scenario.monthlyLivingExpenses + housingCosts + postResetPayment;
  return Math.floor(scenario.currentSavings / monthlyNeed);
}

/**
 * Get summary metrics from a scenario.
 */
export function getScenarioMetrics(scenario: FinancialScenario) {
  const totalMonths = scenario.loanTermYears * 12;
  const introPayment = calculateMonthlyPayment(
    scenario.loanAmount,
    scenario.introductoryRate,
    totalMonths,
  );

  const introMonths = scenario.isFixedRate
    ? totalMonths
    : scenario.introductoryPeriodMonths;

  const balanceAfterIntro = scenario.isFixedRate
    ? scenario.loanAmount
    : remainingBalance(
        scenario.loanAmount,
        scenario.introductoryRate,
        totalMonths,
        introMonths,
        introPayment,
      );

  const postResetPayment = scenario.isFixedRate
    ? introPayment
    : calculateMonthlyPayment(
        balanceAfterIntro,
        scenario.isFixedRate ? scenario.introductoryRate : scenario.postIntroductoryRate,
        totalMonths - introMonths,
      );

  const housingCosts = totalHousingBurden(scenario);
  const totalHousingPost = postResetPayment + housingCosts;
  const paymentToIncome = (postResetPayment / scenario.monthlyIncome) * 100;
  const paymentIncreasePct =
    introPayment > 0
      ? ((postResetPayment - introPayment) / introPayment) * 100
      : 0;

  return {
    introPayment: round(introPayment),
    postResetPayment: round(postResetPayment),
    housingCosts: round(housingCosts),
    totalHousingPost: round(totalHousingPost),
    paymentToIncomeRatio: round(paymentToIncome, 1),
    paymentIncreasePct: round(paymentIncreasePct, 1),
    loanToIncomeRatio: round(
      scenario.loanAmount / (scenario.monthlyIncome * 12),
      1,
    ),
    emergencyRunway: calculateEmergencyRunway(scenario, postResetPayment),
  };
}
