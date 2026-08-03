import type { FinancialScenario, EscapeRoute } from "./types";
import type { StructuredOutput } from "./i18n-types";
import { calculateRiskScore } from "./scoring-engine";
import {
  runMonthlySimulation,
  findEarliestCriticalTurningPoint,
  totalHousingBurden,
} from "./financial-engine";

// ============================================================================
// AfterMath — Smallest Change Optimizer
// Deterministic search for the smallest practical adjustment that lowers
// risk beneath a survivability threshold. Uses the same deterministic
// financial engine for all calculations.
//
// Survivability target:
//   AfterMath Risk < 50  OR  no critical reserve failure within the term
//
// Ranking method (transparent strategy-cost model):
//   1. Smallest normalized financial change
//      - Monetary: change / annual income
//      - Time: change months / loan term months
//      - Delay: delay months / 24
//   2. Greatest risk reduction (score points)
//   3. Removal or delay of the critical point
//
// All strategies have bounded iteration (max 20) to prevent excessive
// computation. The original scenario is never mutated.
// ============================================================================

const TARGET_SCORE = 50;
const MAX_ITERATIONS = 20;

/** Build a StructuredOutput */
function so(type: string, values: Record<string, string | number> = {}): StructuredOutput {
  return { type, values };
}

/** Evaluate a scenario: compute score and critical break */
function evaluateScenario(scenario: FinancialScenario): {
  score: number;
  hasCriticalBreak: boolean;
  criticalMonth: number;
} {
  const simulation = runMonthlySimulation(scenario);
  const { month, hasCriticalBreak } = findEarliestCriticalTurningPoint(simulation, scenario);
  const { score } = calculateRiskScore(scenario);
  return { score, hasCriticalBreak, criticalMonth: month };
}

/** Check if a scenario meets the survivability target */
function isViable(evaluation: { score: number; hasCriticalBreak: boolean }): boolean {
  return evaluation.score < TARGET_SCORE || !evaluation.hasCriticalBreak;
}

/** Normalize a change to a dimensionless cost for cross-strategy comparison */
function normalizeCost(
  strategy: string,
  changeAmount: number,
  scenario: FinancialScenario,
): number {
  const annualIncome = scenario.monthlyIncome * 12;
  const loanTermMonths = scenario.loanTermYears * 12;

  switch (strategy) {
    case "increase_down_payment":
    case "reduce_loan":
    case "reduce_price":
    case "increase_reserve":
      return annualIncome > 0 ? changeAmount / annualIncome : 1;
    case "reduce_debt":
    case "reduce_ownership":
      return annualIncome > 0 ? (changeAmount * 12) / annualIncome : 1;
    case "extend_fixed":
      return loanTermMonths > 0 ? changeAmount / loanTermMonths : 1;
    case "delay_purchase":
      return changeAmount / 24;
    default:
      return 1;
  }
}

interface CandidateRoute {
  route: EscapeRoute;
  normalizedCost: number;
  riskReduction: number;
  criticalRemoved: boolean;
}

/** Build an EscapeRoute from the evaluation results */
function buildRoute(
  id: string,
  originalScenario: FinancialScenario,
  newScenario: FinancialScenario,
  originalScore: number,
  evaluation: { score: number; hasCriticalBreak: boolean; criticalMonth: number },
  incrementsTested: number,
  viable: boolean,
  values: Record<string, string | number>,
): EscapeRoute {
  return {
    id,
    change: so(`optimizer.${id}.change`, values),
    impact: so("optimizer.common.impact", {
      from: originalScore,
      to: evaluation.score,
    }),
    tradeoff: so(`optimizer.${id}.tradeoff`, values),
    why: so(`optimizer.${id}.why`, values),
    newScore: evaluation.score,
    newScenario,
    isSmallestChange: false,
    newCriticalMonth: evaluation.hasCriticalBreak ? evaluation.criticalMonth : null,
    incrementsTested,
    isViable: viable,
  };
}

/** Calculate bounded end-points for the honest "no viable route" state. */
function findPartialImprovements(
  scenario: FinancialScenario,
  originalEval: { score: number; hasCriticalBreak: boolean; criticalMonth: number },
): EscapeRoute[] {
  const ownership = totalHousingBurden(scenario);
  const loanReduction = Math.min(1_000_000_000, Math.max(0, scenario.loanAmount - 1));
  const priceReduction = Math.min(Math.round(scenario.propertyPrice * 0.3), loanReduction);
  const fixedExtension = scenario.isFixedRate
    ? 0
    : Math.min(240, Math.max(0, scenario.loanTermYears * 12 - scenario.introductoryPeriodMonths));
  const endpoints: Array<{
    id: string;
    next: FinancialScenario;
    amount: number;
    increments: number;
    values: Record<string, string | number>;
  }> = [
    {
      id: "reduce_loan",
      next: { ...scenario, loanAmount: scenario.loanAmount - loanReduction },
      amount: loanReduction,
      increments: Math.min(MAX_ITERATIONS, Math.ceil(loanReduction / 50_000_000)),
      values: { amount: loanReduction, from: scenario.loanAmount, to: scenario.loanAmount - loanReduction },
    },
    {
      id: "reduce_price",
      next: {
        ...scenario,
        propertyPrice: scenario.propertyPrice - priceReduction,
        loanAmount: scenario.loanAmount - priceReduction,
      },
      amount: priceReduction,
      increments: Math.min(MAX_ITERATIONS, Math.ceil(priceReduction / 100_000_000)),
      values: { amount: priceReduction, from: scenario.propertyPrice, to: scenario.propertyPrice - priceReduction },
    },
    {
      id: "increase_reserve",
      next: { ...scenario, currentSavings: scenario.currentSavings + 1_000_000_000 },
      amount: 1_000_000_000,
      increments: MAX_ITERATIONS,
      values: { amount: 1_000_000_000, from: scenario.currentSavings, to: scenario.currentSavings + 1_000_000_000 },
    },
    {
      id: "extend_fixed",
      next: { ...scenario, introductoryPeriodMonths: scenario.introductoryPeriodMonths + fixedExtension },
      amount: fixedExtension,
      increments: Math.min(MAX_ITERATIONS, Math.ceil(fixedExtension / 12)),
      values: { from: scenario.introductoryPeriodMonths, to: scenario.introductoryPeriodMonths + fixedExtension, months: fixedExtension },
    },
    {
      id: "reduce_ownership",
      next: {
        ...scenario,
        monthlyMaintenance: 0,
        monthlyInsurance: 0,
        monthlyFurnishingRepair: 0,
        monthlyManagementFees: 0,
      },
      amount: ownership,
      increments: Math.min(MAX_ITERATIONS, Math.ceil(ownership / 1_000_000)),
      values: { amount: ownership, from: ownership, to: 0 },
    },
  ];

  return endpoints
    .filter((candidate) => candidate.amount > 0 && candidate.increments > 0)
    .map((candidate) => {
      const evaluation = evaluateScenario(candidate.next);
      return {
        route: buildRoute(
          candidate.id, scenario, candidate.next, originalEval.score, evaluation,
          candidate.increments, false, candidate.values,
        ),
        reduction: originalEval.score - evaluation.score,
        criticalDelay: evaluation.hasCriticalBreak
          ? evaluation.criticalMonth - originalEval.criticalMonth
          : Number.MAX_SAFE_INTEGER,
      };
    })
    .filter((candidate) => candidate.reduction > 0 || candidate.criticalDelay > 0)
    .sort((a, b) => b.reduction - a.reduction || b.criticalDelay - a.criticalDelay)
    .slice(0, 2)
    .map((candidate) => candidate.route);
}

/**
 * Optimize a scenario by testing incremental changes across multiple
 * strategies. Returns up to 3 viable escape routes ranked by smallest
 * normalized cost, or 2 most effective partial improvements if no viable
 * route is found. Returns empty array if the scenario is already safe.
 */
export function optimizeScenario(scenario: FinancialScenario): EscapeRoute[] {
  const originalEval = evaluateScenario(scenario);

  // If already safe, no routes needed
  if (isViable(originalEval)) {
    return [];
  }

  const originalScore = originalEval.score;
  const candidates: CandidateRoute[] = [];

  // ── Strategy 1: Increase down payment (50M increments, max 40% of original) ──
  {
    const maxIncrease = Math.round(scenario.downPayment * 0.4);
    const increment = 50_000_000;
    let tested = 0;
    for (let increase = increment; increase <= maxIncrease && tested < MAX_ITERATIONS; increase += increment) {
      tested++;
      const newDownPayment = scenario.downPayment + increase;
      const newLoan = Math.max(0, scenario.loanAmount - increase);
      const newScenario: FinancialScenario = {
        ...scenario,
        downPayment: newDownPayment,
        loanAmount: newLoan,
      };
      const evaluation = evaluateScenario(newScenario);
      const viable = isViable(evaluation);
      if (viable) {
        candidates.push({
          route: buildRoute(
            "increase_down_payment", scenario, newScenario, originalScore,
            evaluation, tested, viable, { amount: increase, from: scenario.downPayment, to: newDownPayment },
          ),
          normalizedCost: normalizeCost("increase_down_payment", increase, scenario),
          riskReduction: originalScore - evaluation.score,
          criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
        });
        break;
      }
    }
  }

  // ── Strategy 2: Reduce loan principal (50M increments) ──
  {
    const increment = 50_000_000;
    let tested = 0;
    for (let reduction = increment; reduction < scenario.loanAmount && tested < MAX_ITERATIONS; reduction += increment) {
      tested++;
      const newLoan = scenario.loanAmount - reduction;
      const newScenario: FinancialScenario = { ...scenario, loanAmount: newLoan };
      const evaluation = evaluateScenario(newScenario);
      const viable = isViable(evaluation);
      if (viable) {
        candidates.push({
          route: buildRoute(
            "reduce_loan", scenario, newScenario, originalScore,
            evaluation, tested, viable, { amount: reduction, from: scenario.loanAmount, to: newLoan },
          ),
          normalizedCost: normalizeCost("reduce_loan", reduction, scenario),
          riskReduction: originalScore - evaluation.score,
          criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
        });
        break;
      }
    }
  }

  // ── Strategy 3: Reduce property price (100M increments, max 30% reduction) ──
  {
    const maxReduction = Math.round(scenario.propertyPrice * 0.3);
    const increment = 100_000_000;
    let tested = 0;
    for (let reduction = increment; reduction <= maxReduction && tested < MAX_ITERATIONS; reduction += increment) {
      tested++;
      const newPrice = scenario.propertyPrice - reduction;
      const newLoan = Math.max(0, scenario.loanAmount - reduction);
      const newScenario: FinancialScenario = {
        ...scenario,
        propertyPrice: newPrice,
        loanAmount: newLoan,
      };
      const evaluation = evaluateScenario(newScenario);
      const viable = isViable(evaluation);
      if (viable) {
        candidates.push({
          route: buildRoute(
            "reduce_price", scenario, newScenario, originalScore,
            evaluation, tested, viable, { amount: reduction, from: scenario.propertyPrice, to: newPrice },
          ),
          normalizedCost: normalizeCost("reduce_price", reduction, scenario),
          riskReduction: originalScore - evaluation.score,
          criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
        });
        break;
      }
    }
  }

  // ── Strategy 4: Extend fixed-rate period (12-month increments, skip if already fixed) ──
  if (!scenario.isFixedRate) {
    const totalMonths = scenario.loanTermYears * 12;
    const increment = 12;
    let tested = 0;
    for (let ext = increment; scenario.introductoryPeriodMonths + ext <= totalMonths && tested < MAX_ITERATIONS; ext += increment) {
      tested++;
      const newIntroMonths = scenario.introductoryPeriodMonths + ext;
      const newScenario: FinancialScenario = { ...scenario, introductoryPeriodMonths: newIntroMonths };
      const evaluation = evaluateScenario(newScenario);
      const viable = isViable(evaluation);
      if (viable) {
        candidates.push({
          route: buildRoute(
            "extend_fixed", scenario, newScenario, originalScore,
            evaluation, tested, viable, { from: scenario.introductoryPeriodMonths, to: newIntroMonths, months: ext },
          ),
          normalizedCost: normalizeCost("extend_fixed", ext, scenario),
          riskReduction: originalScore - evaluation.score,
          criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
        });
        break;
      }
    }
  }

  // ── Strategy 5: Increase emergency reserve (50M increments) ──
  {
    const increment = 50_000_000;
    let tested = 0;
    for (let increase = increment; tested < MAX_ITERATIONS; increase += increment) {
      tested++;
      const newSavings = scenario.currentSavings + increase;
      const newScenario: FinancialScenario = { ...scenario, currentSavings: newSavings };
      const evaluation = evaluateScenario(newScenario);
      const viable = isViable(evaluation);
      if (viable) {
        candidates.push({
          route: buildRoute(
            "increase_reserve", scenario, newScenario, originalScore,
            evaluation, tested, viable, { amount: increase, from: scenario.currentSavings, to: newSavings },
          ),
          normalizedCost: normalizeCost("increase_reserve", increase, scenario),
          riskReduction: originalScore - evaluation.score,
          criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
        });
        break;
      }
    }
  }

  // ── Strategy 6: Reduce additional monthly debt (1M increments, skip if no debt) ──
  if ((scenario.additionalMonthlyDebt ?? 0) > 0) {
    const increment = 1_000_000;
    let tested = 0;
    const currentDebt = scenario.additionalMonthlyDebt ?? 0;
    for (let reduction = increment; reduction <= currentDebt && tested < MAX_ITERATIONS; reduction += increment) {
      tested++;
      const newDebt = currentDebt - reduction;
      const newScenario: FinancialScenario = { ...scenario, additionalMonthlyDebt: newDebt };
      const evaluation = evaluateScenario(newScenario);
      const viable = isViable(evaluation);
      if (viable) {
        candidates.push({
          route: buildRoute(
            "reduce_debt", scenario, newScenario, originalScore,
            evaluation, tested, viable, { amount: reduction, from: currentDebt, to: newDebt },
          ),
          normalizedCost: normalizeCost("reduce_debt", reduction, scenario),
          riskReduction: originalScore - evaluation.score,
          criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
        });
        break;
      }
    }
  }

  // ── Strategy 7: Reduce monthly ownership costs (1M total increments) ──
  {
    const currentOwnership = totalHousingBurden(scenario);
    if (currentOwnership > 1_000_000) {
      const increment = 1_000_000;
      let tested = 0;
      let totalReduction = 0;
      for (let i = 1; i <= MAX_ITERATIONS; i++) {
        totalReduction += increment;
        tested = i;
        const newTotal = currentOwnership - totalReduction;
        if (newTotal < 0) break;
        const factor = currentOwnership > 0 ? newTotal / currentOwnership : 0;
        const newScenario: FinancialScenario = {
          ...scenario,
          monthlyMaintenance: Math.round(scenario.monthlyMaintenance * factor),
          monthlyInsurance: Math.round(scenario.monthlyInsurance * factor),
          monthlyFurnishingRepair: Math.round(scenario.monthlyFurnishingRepair * factor),
          monthlyManagementFees: Math.round(scenario.monthlyManagementFees * factor),
        };
        const evaluation = evaluateScenario(newScenario);
        const viable = isViable(evaluation);
        if (viable) {
          candidates.push({
            route: buildRoute(
              "reduce_ownership", scenario, newScenario, originalScore,
              evaluation, tested, viable, { amount: totalReduction, from: currentOwnership, to: newTotal },
            ),
            normalizedCost: normalizeCost("reduce_ownership", totalReduction, scenario),
            riskReduction: originalScore - evaluation.score,
            criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
          });
          break;
        }
      }
    }
  }

  // ── Strategy 8: Delay purchase while increasing savings ──
  {
    const savingCapacity = scenario.monthlyIncome - scenario.monthlyLivingExpenses;
    if (savingCapacity > 0) {
      let tested = 0;
      for (let delay = 1; delay <= 24 && tested < MAX_ITERATIONS; delay++) {
        tested++;
        const additionalSavings = savingCapacity * delay;
        const newSavings = scenario.currentSavings + additionalSavings;
        const newScenario: FinancialScenario = { ...scenario, currentSavings: newSavings };
        const evaluation = evaluateScenario(newScenario);
        const viable = isViable(evaluation);
        if (viable) {
          candidates.push({
            route: buildRoute(
              "delay_purchase", scenario, newScenario, originalScore,
              evaluation, tested, viable, { months: delay, amount: additionalSavings, capacity: savingCapacity },
            ),
            normalizedCost: normalizeCost("delay_purchase", delay, scenario),
            riskReduction: originalScore - evaluation.score,
            criticalRemoved: originalEval.hasCriticalBreak && !evaluation.hasCriticalBreak,
          });
          break;
        }
      }
    }
  }

  // ── Rank and select ──

  // Separate viable and non-viable candidates
  const viableCandidates = candidates.filter((c) => c.route.isViable);
  const nonViableCandidates = candidates.filter((c) => !c.route.isViable);

  if (viableCandidates.length > 0) {
    // Rank viable routes: smallest cost first, then greatest reduction, then critical removed
    viableCandidates.sort((a, b) => {
      if (Math.abs(a.normalizedCost - b.normalizedCost) > 0.01) {
        return a.normalizedCost - b.normalizedCost;
      }
      if (a.riskReduction !== b.riskReduction) {
        return b.riskReduction - a.riskReduction;
      }
      return (b.criticalRemoved ? 1 : 0) - (a.criticalRemoved ? 1 : 0);
    });

    const top3 = viableCandidates.slice(0, 3).map((c) => c.route);
    // Mark the first as smallest viable change
    if (top3.length > 0) {
      top3[0].isSmallestChange = true;
    }
    return top3;
  }

  // No viable route — return 2 most effective partial improvements
  if (nonViableCandidates.length > 0) {
    nonViableCandidates.sort((a, b) => b.riskReduction - a.riskReduction);
    return nonViableCandidates.slice(0, 2).map((c) => c.route);
  }

  // No candidates at all — strategies didn't produce any improvements
  return findPartialImprovements(scenario, originalEval);
}
