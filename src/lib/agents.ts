import type {
  FinancialScenario,
  AgentFinding,
  AnalysisResult,
  SensitivityResult,
} from "./types";
import type { StructuredEvidence } from "./i18n-types";
import {
  getScenarioMetrics,
  totalHousingBurden,
  runMonthlySimulation,
  findEarliestCriticalTurningPoint,
  generateConsequenceEvents,
} from "./financial-engine";
import { calculateRiskScore, getRiskLevel, so } from "./scoring-engine";
import { optimizeScenario } from "./optimizer";
import { generateSaferAlternative } from "./scenarios";

// ============================================================================
// AfterMath — Analysis Module Definitions
// Five deterministic analysis modules that evaluate the financial scenario.
// Transparent computation. No hidden AI. Only findings, evidence, and explanations.
//
// All output uses STRUCTURED DATA (type + raw values) for locale-aware
// rendering at display time.
// ============================================================================

/** Helper: build a StructuredEvidence */
function se(
  type: string,
  values: Record<string, string | number> = {},
): StructuredEvidence {
  return { type, values };
}

/** Build all 5 agent findings for a given scenario */
export function buildAgentFindings(scenario: FinancialScenario): AgentFinding[] {
  return [
    buildTermsAgent(scenario),
    buildCashflowAgent(scenario),
    buildHiddenCostAgent(scenario),
    buildShockAgent(scenario),
    buildDecisionAgent(scenario),
  ];
}

// 1. Terms Agent ----------------------------------------------------------
function buildTermsAgent(scenario: FinancialScenario): AgentFinding {
  const m = getScenarioMetrics(scenario);
  const isFixed = scenario.isFixedRate;

  const finding = isFixed
    ? so("agent.terms.finding.fixed", {})
    : so("agent.terms.finding.variable", {
        introRate: scenario.introductoryRate,
        postRate: scenario.postIntroductoryRate,
        months: scenario.introductoryPeriodMonths,
      });

  const evidence: StructuredEvidence[] = [
    se("agent.terms.evidence.introRate", { rate: scenario.introductoryRate }),
    ...(isFixed
      ? [se("agent.terms.evidence.fixedTerm", { years: scenario.loanTermYears })]
      : [
          se("agent.terms.evidence.postRate", { rate: scenario.postIntroductoryRate }),
          se("agent.terms.evidence.resetAt", { month: scenario.introductoryPeriodMonths + 1 }),
        ]),
    se("agent.terms.evidence.duration", {
      years: scenario.loanTermYears,
      months: scenario.loanTermYears * 12,
    }),
    se("agent.terms.evidence.amortizing", {}),
  ];

  const calculation = isFixed
    ? so("agent.terms.calc.fixed", {
        payment: m.introPayment,
        months: scenario.loanTermYears * 12,
      })
    : so("agent.terms.calc.variable", {
        introPay: m.introPayment,
        postPay: m.postResetPayment,
        pct: m.paymentIncreasePct,
      });

  const hasWarning = !isFixed && m.paymentIncreasePct > 20;

  const explanation = hasWarning
    ? so("agent.terms.explanation.warning", {
        pct: m.paymentIncreasePct,
        month: scenario.introductoryPeriodMonths + 1,
      })
    : so("agent.terms.explanation.stable", {});

  return {
    agentId: "terms",
    finding,
    evidence,
    calculation,
    explanation,
    status: hasWarning ? "warning" : "completed",
    iconName: "FileText",
    accentColor: hasWarning ? "amber" : "blue",
  };
}

// 2. Cashflow Agent --------------------------------------------------------
function buildCashflowAgent(scenario: FinancialScenario): AgentFinding {
  const m = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);
  const additionalDebt = scenario.additionalMonthlyDebt ?? 0;
  const totalHousing = m.postResetPayment + housingCosts;
  const totalMonthly = totalHousing + scenario.monthlyLivingExpenses + additionalDebt;
  const remainingCash = scenario.monthlyIncome - totalMonthly;
  const ratio = (m.postResetPayment / scenario.monthlyIncome) * 100;
  const totalRatio = (totalHousing / scenario.monthlyIncome) * 100;

  const finding =
    remainingCash < 0
      ? so("agent.cashflow.finding.deficit", { deficit: Math.abs(remainingCash) })
      : so("agent.cashflow.finding.surplus", { surplus: remainingCash });

  const evidence: StructuredEvidence[] = [
    se("agent.cashflow.evidence.monthlyPayment", { payment: m.postResetPayment }),
    se("agent.cashflow.evidence.paymentIncomeRatio", { ratio }),
    se("agent.cashflow.evidence.totalHousingIncome", { ratio: totalRatio }),
    se("agent.cashflow.evidence.livingExpenses", { expenses: scenario.monthlyLivingExpenses }),
    se("agent.cashflow.evidence.remainingCash", { cash: remainingCash }),
    se("agent.cashflow.evidence.emergencyRunway", { months: m.emergencyRunway }),
  ];

  const calculation = so("agent.cashflow.calc", {
    income: scenario.monthlyIncome,
    housing: totalHousing,
    living: scenario.monthlyLivingExpenses,
    cash: remainingCash,
  });

  const hasWarning = remainingCash < 0 || totalRatio > 50;

  const explanation = hasWarning
    ? remainingCash < 0
      ? so("agent.cashflow.explanation.warning.deficit", { ratio: totalRatio })
      : so("agent.cashflow.explanation.warning.thin", { ratio: totalRatio })
    : so("agent.cashflow.explanation.healthy", {});

  return {
    agentId: "cashflow",
    finding,
    evidence,
    calculation,
    explanation,
    status: hasWarning ? "warning" : "completed",
    iconName: "Wallet",
    accentColor: hasWarning ? "red" : "green",
  };
}

// 3. Hidden Cost Agent -----------------------------------------------------
function buildHiddenCostAgent(scenario: FinancialScenario): AgentFinding {
  const m = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);
  const totalHousing = m.postResetPayment + housingCosts;
  const hiddenPct = (housingCosts / totalHousing) * 100;
  const incomePct = (housingCosts / scenario.monthlyIncome) * 100;

  const finding = so("agent.hidden-cost.finding", {
    costs: housingCosts,
    pct: hiddenPct,
  });

  const evidence: StructuredEvidence[] = [
    se("agent.hidden-cost.evidence.maintenance", { value: scenario.monthlyMaintenance }),
    se("agent.hidden-cost.evidence.insurance", { value: scenario.monthlyInsurance }),
    se("agent.hidden-cost.evidence.furnishing", { value: scenario.monthlyFurnishingRepair }),
    se("agent.hidden-cost.evidence.management", { value: scenario.monthlyManagementFees }),
    se("agent.hidden-cost.evidence.totalHidden", { value: housingCosts }),
    se("agent.hidden-cost.evidence.mortgagePayment", { value: m.postResetPayment }),
    se("agent.hidden-cost.evidence.trueTotal", { value: totalHousing }),
  ];

  const calculation = so("agent.hidden-cost.calc", {
    mortgage: m.postResetPayment,
    hidden: housingCosts,
    total: totalHousing,
    pct: incomePct,
  });

  const hasWarning = incomePct > 15;

  const explanation = hasWarning
    ? so("agent.hidden-cost.explanation.warning", {
        pct: incomePct,
        total: totalHousing,
        mortgage: m.postResetPayment,
      })
    : so("agent.hidden-cost.explanation.healthy", {});

  return {
    agentId: "hidden-cost",
    finding,
    evidence,
    calculation,
    explanation,
    status: hasWarning ? "warning" : "completed",
    iconName: "Search",
    accentColor: hasWarning ? "amber" : "blue",
  };
}

// 4. Shock Agent -----------------------------------------------------------
function buildShockAgent(scenario: FinancialScenario): AgentFinding {
  const m = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);
  const additionalDebt = scenario.additionalMonthlyDebt ?? 0;
  const essentialMonthly =
    scenario.monthlyLivingExpenses + housingCosts + m.postResetPayment + additionalDebt;
  const disruptionDrain = essentialMonthly * scenario.incomeDisruptionMonths;
  const fundAfter = scenario.currentSavings - disruptionDrain;
  const fundSurvives = fundAfter > 0;
  const survivalMonths = fundSurvives ? Math.floor(fundAfter / essentialMonthly) : 0;

  const finding = fundSurvives
    ? so("agent.shock.finding.survives", {
        months: scenario.incomeDisruptionMonths,
        fund: fundAfter,
        runway: survivalMonths,
      })
    : so("agent.shock.finding.exhausted", {
        months: scenario.incomeDisruptionMonths,
      });

  const evidence: StructuredEvidence[] = [
    se("agent.shock.evidence.disruption", { months: scenario.incomeDisruptionMonths }),
    se("agent.shock.evidence.essentialCosts", { costs: essentialMonthly }),
    se("agent.shock.evidence.disruptionDrain", { drain: disruptionDrain }),
    se("agent.shock.evidence.emergencyFund", { fund: scenario.currentSavings }),
    se("agent.shock.evidence.fundAfter", { fund: Math.max(0, fundAfter) }),
    se("agent.shock.evidence.runway", { months: survivalMonths }),
  ];

  const calculation = so("agent.shock.calc", {
    fund: scenario.currentSavings,
    drain: disruptionDrain,
    remaining: Math.max(0, fundAfter),
    months: survivalMonths,
  });

  const hasWarning = survivalMonths < 3 || !fundSurvives;

  const explanation = hasWarning
    ? !fundSurvives
      ? so("agent.shock.explanation.warning.exhausted", {
          months: scenario.incomeDisruptionMonths,
          costs: essentialMonthly,
        })
      : so("agent.shock.explanation.warning.survives", {
          months: scenario.incomeDisruptionMonths,
          costs: essentialMonthly,
          runway: survivalMonths,
        })
    : so("agent.shock.explanation.healthy", {});

  return {
    agentId: "shock",
    finding,
    evidence,
    calculation,
    explanation,
    status: hasWarning ? "warning" : "completed",
    iconName: "Zap",
    accentColor: hasWarning ? "red" : "green",
  };
}

// 5. Decision Agent --------------------------------------------------------
function buildDecisionAgent(scenario: FinancialScenario): AgentFinding {
  const { score, factors } = calculateRiskScore(scenario);
  const triggered = factors.filter((f) => f.triggered);
  const topFactor = triggered.sort((a, b) => b.contribution - a.contribution)[0];

  const levelKey =
    score >= 70 ? "result.highRegret" :
    score >= 50 ? "result.elevated" :
    score >= 30 ? "result.manageable" :
    "result.lowRisk";

  const finding =
    triggered.length === 1
      ? so("agent.decision.finding.single", { level: levelKey, score })
      : so("agent.decision.finding.plural", { level: levelKey, score, count: triggered.length });

  const evidence: StructuredEvidence[] = factors
    .filter((f) => f.triggered)
    .map((f) =>
      se("agent.decision.evidence.factor", {
        label: `riskfactor.${f.id}.label`,
        contribution: f.contribution,
      }),
    );

  const triggeredPts = triggered.reduce((s, f) => s + f.contribution, 0);
  const maxPts = factors.reduce((s, f) => s + f.maxContribution, 0);

  const calculation = so("agent.decision.calc", {
    score,
    triggered: triggered.length,
    total: factors.length,
    triggeredPts,
    maxPts,
  });

  const hasWarning = score >= 50;

  const explanation = topFactor
    ? so("agent.decision.explanation.hasTopFactor", {
        label: `riskfactor.${topFactor.id}.label`,
      })
    : so("agent.decision.explanation.noFactors", {});

  return {
    agentId: "decision",
    finding,
    evidence,
    calculation,
    explanation,
    status: hasWarning ? "warning" : "completed",
    iconName: "Scale",
    accentColor:
      score >= 70 ? "red" : score >= 50 ? "amber" : score >= 30 ? "amber" : "green",
  };
}

// ============================================================================
// Sensitivity Analysis
// ============================================================================

/**
 * Compute sensitivity ranking — tests each key parameter change individually
 * against the original scenario to show which single adjustment has the most
 * impact on the risk score.
 */
function computeSensitivityRanking(
  scenario: FinancialScenario,
): SensitivityResult[] {
  const originalScore = calculateRiskScore(scenario).score;

  const tests: { type: string; param: keyof FinancialScenario; value: number | string | boolean }[] = [
    { type: "reduce_loan", param: "loanAmount", value: Math.round(scenario.loanAmount * 0.7) },
    {
      type: "longer_fixed",
      param: "introductoryPeriodMonths",
      value: Math.max(scenario.introductoryPeriodMonths, 60),
    },
    { type: "larger_fund", param: "currentSavings", value: Math.round(scenario.currentSavings * 1.3) },
  ];

  return tests
    .map((test) => {
      const modified = { ...scenario, [test.param]: test.value };
      const scoreWith = calculateRiskScore(modified).score;
      return {
        type: test.type,
        param: test.param,
        scoreWith,
        reduction: originalScore - scoreWith,
      } as SensitivityResult;
    })
    .sort((a, b) => b.reduction - a.reduction);
}

// ============================================================================
// Safer Alternative Generation
// ============================================================================

/**
 * Build a safer version of any scenario by applying multiple improvements:
 * lower loan, larger fund, longer fixed period, lower hidden costs.
 */
// ============================================================================
// Full Analysis Engine — ties everything together
// ============================================================================

/**
 * Run a complete analysis on a scenario.
 * Returns the full AnalysisResult with all analysis findings, risk factors,
 * consequence events, escape routes, and monthly simulation data.
 */
export function runAnalysis(scenario: FinancialScenario): AnalysisResult {
  const simulation = runMonthlySimulation(scenario);
  const { month: criticalTurningPoint, hasCriticalBreak } = findEarliestCriticalTurningPoint(
    simulation,
    scenario,
  );
  const consequenceEvents = generateConsequenceEvents(
    simulation,
    scenario,
    criticalTurningPoint,
  );
  const { score, factors } = calculateRiskScore(scenario);
  const riskLevel = getRiskLevel(score);
  const findings = buildAgentFindings(scenario);
  const m = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);

  // Structured primary explanation
  const primaryExplanation = !hasCriticalBreak
    ? so("result.explanation.noBreak", {})
    : score >= 50
      ? so("result.explanation.high", { months: scenario.incomeDisruptionMonths })
      : so("result.explanation.low", {});

  // Sensitivity analysis
  const sensitivityRanking = computeSensitivityRanking(scenario);

  // Generate escape routes via deterministic optimizer
  const escapeRoutes = optimizeScenario(scenario);

  // Safer alternative (dynamic — works for any scenario)
  const saferScenarioObj = generateSaferAlternative(scenario);
  const saferScore = calculateRiskScore(saferScenarioObj).score;

  const saferAlt = {
    id: "safer-version",
    changes: [
      so("escape.change.reduce_loan", {}),
      so("escape.change.larger_fund", {}),
      so("escape.change.longer_fixed", {}),
      so("escape.change.reduce_budget", {}),
      so("escape.change.keep_below_40", {}),
    ],
    newScenario: saferScenarioObj,
    newScore: saferScore,
    explanation: so("escape.explanation", {}),
    sensitivityRanking,
  };

  return {
    scenario,
    riskScore: score,
    riskLevel,
    criticalTurningPoint,
    hasCriticalBreak,
    primaryExplanation,
    findings,
    consequenceEvents,
    riskFactors: factors,
    saferAlternative: saferAlt,
    escapeRoutes,
    monthlySimulation: simulation,
    totalHousingBurden: Math.round(m.postResetPayment + housingCosts),
    paymentToIncomeRatio: m.paymentToIncomeRatio,
    housingToIncomeRatio: m.housingToIncomeRatio,
    debtToIncomeRatio: m.debtToIncomeRatio,
    cashCommitmentRatio: m.cashCommitmentRatio,
    introMonthlyPayment: m.introPayment,
    postResetMonthlyPayment: m.postResetPayment,
    paymentIncreasePct: m.paymentIncreasePct,
    emergencyFundRunwayMonths: m.emergencyRunway,
  };
}
