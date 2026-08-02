import type { FinancialScenario, AgentFinding, AnalysisResult, SensitivityResult } from "./types";
import { getScenarioMetrics, totalHousingBurden } from "./financial-engine";
import { calculateRiskScore } from "./scoring-engine";
import { formatVND, formatPct } from "./utils";

// ============================================================================
// AfterMath — Analysis Module Definitions
// Five deterministic analysis modules that evaluate the financial scenario.
// Transparent computation. No hidden AI. Only findings, evidence, and explanations.
// ============================================================================

/** Build all 5 agent findings for a given scenario */
export function buildAgentFindings(
  scenario: FinancialScenario,
): AgentFinding[] {
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
    ? "The loan has a fixed rate for the full term — no reset risk."
    : `The introductory rate of ${formatPct(scenario.introductoryRate)} resets to ${formatPct(scenario.postIntroductoryRate)} after ${scenario.introductoryPeriodMonths} months.`;

  const evidence: string[] = [
    `Introductory rate: ${formatPct(scenario.introductoryRate)}`,
    ...(isFixed
      ? [`Fixed for full ${scenario.loanTermYears}-year term`]
      : [
          `Post-introductory rate: ${formatPct(scenario.postIntroductoryRate)}`,
          `Rate resets at: month ${scenario.introductoryPeriodMonths + 1}`,
        ]),
    `Loan duration: ${scenario.loanTermYears} years (${scenario.loanTermYears * 12} months)`,
    `Repayment structure: fully amortizing`,
  ];

  const calculationSummary = isFixed
    ? `Fixed payment of ${formatVND(m.introPayment)}/month for ${scenario.loanTermYears * 12} months.`
    : `Intro payment ${formatVND(m.introPayment)} → Post-reset payment ${formatVND(m.postResetPayment)} (+${m.paymentIncreasePct.toFixed(0)}%).`;

  const hasWarning = !isFixed && m.paymentIncreasePct > 20;

  return {
    agentId: "terms",
    agentName: "Terms Analysis",
    agentRole: "Loan terms & interest-rate analysis",
    finding,
    evidence,
    calculationSummary,
    confidence: 95,
    explanation: hasWarning
      ? `The ${m.paymentIncreasePct.toFixed(0)}% payment increase at month ${scenario.introductoryPeriodMonths + 1} is significant. The household should verify they can sustain the higher payment.`
      : "The loan terms are stable with no rate-reset risk.",
    status: hasWarning ? "warning" : "completed",
    iconName: "FileText",
    accentColor: hasWarning ? "amber" : "blue",
  };
}

// 2. Cashflow Agent --------------------------------------------------------
function buildCashflowAgent(scenario: FinancialScenario): AgentFinding {
  const m = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);
  const totalHousing = m.postResetPayment + housingCosts;
  const totalMonthly = totalHousing + scenario.monthlyLivingExpenses;
  const remainingCash = scenario.monthlyIncome - totalMonthly;
  const ratio = (m.postResetPayment / scenario.monthlyIncome) * 100;
  const totalRatio = (totalHousing / scenario.monthlyIncome) * 100;

  const finding =
    remainingCash < 0
      ? `The household runs a monthly deficit of ${formatVND(Math.abs(remainingCash))} after the rate reset.`
      : `The household has ${formatVND(remainingCash)} remaining after all costs.`;

  const evidence: string[] = [
    `Monthly payment: ${formatVND(m.postResetPayment)}`,
    `Payment-to-income ratio: ${ratio.toFixed(0)}% (mortgage only)`,
    `Total housing-to-income: ${totalRatio.toFixed(0)}%`,
    `Living expenses: ${formatVND(scenario.monthlyLivingExpenses)}`,
    `Remaining monthly cash: ${formatVND(remainingCash)}`,
    `Emergency-fund runway: ${m.emergencyRunway} months`,
  ];

  const calculationSummary =
    `Income ${formatVND(scenario.monthlyIncome)} − Housing ${formatVND(totalHousing)} − Living ${formatVND(scenario.monthlyLivingExpenses)} = ${formatVND(remainingCash)}/month`;

  const hasWarning = remainingCash < 0 || totalRatio > 50;

  return {
    agentId: "cashflow",
    agentName: "Cashflow Analysis",
    agentRole: "Monthly cash-flow & payment-to-income analysis",
    finding,
    evidence,
    calculationSummary,
    confidence: 92,
    explanation: hasWarning
      ? `With total housing consuming ${totalRatio.toFixed(0)}% of income and a ${remainingCash < 0 ? "negative" : "thin"} monthly surplus, the household has little buffer for unexpected costs.`
      : "Cash flow is healthy with adequate surplus each month.",
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

  const finding = `Hidden housing costs of ${formatVND(housingCosts)}/month represent ${hiddenPct.toFixed(0)}% of total housing costs.`;

  const evidence: string[] = [
    `Maintenance: ${formatVND(scenario.monthlyMaintenance)}`,
    `Insurance: ${formatVND(scenario.monthlyInsurance)}`,
    `Furnishing & repair: ${formatVND(scenario.monthlyFurnishingRepair)}`,
    `Management fees: ${formatVND(scenario.monthlyManagementFees)}`,
    `Total hidden: ${formatVND(housingCosts)}/month`,
    `Mortgage payment: ${formatVND(m.postResetPayment)}`,
    `True total housing: ${formatVND(totalHousing)}/month`,
  ];

  const calculationSummary =
    `Mortgage ${formatVND(m.postResetPayment)} + Hidden ${formatVND(housingCosts)} = ${formatVND(totalHousing)}/month total housing burden (${incomePct.toFixed(0)}% of income).`;

  const hasWarning = incomePct > 15;

  return {
    agentId: "hidden-cost",
    agentName: "Hidden Cost Analysis",
    agentRole: "Costs excluded from the headline mortgage payment",
    finding,
    evidence,
    calculationSummary,
    confidence: 88,
    explanation: hasWarning
      ? `These costs are ${incomePct.toFixed(0)}% of income and are often overlooked. The true housing burden is ${formatVND(totalHousing)}/month, not just the mortgage of ${formatVND(m.postResetPayment)}.`
      : "Hidden costs are a manageable share of income.",
    status: hasWarning ? "warning" : "completed",
    iconName: "Search",
    accentColor: hasWarning ? "amber" : "blue",
  };
}

// 4. Shock Agent -----------------------------------------------------------
function buildShockAgent(scenario: FinancialScenario): AgentFinding {
  const m = getScenarioMetrics(scenario);
  const housingCosts = totalHousingBurden(scenario);
  const essentialMonthly =
    scenario.monthlyLivingExpenses + housingCosts + m.postResetPayment;
  const disruptionDrain = essentialMonthly * scenario.incomeDisruptionMonths;
  const fundAfter = scenario.currentSavings - disruptionDrain;
  const fundSurvives = fundAfter > 0;
  const survivalMonths = Math.floor(fundAfter / essentialMonthly);

  const finding = fundSurvives
    ? `A ${scenario.incomeDisruptionMonths}-month income loss would leave ${formatVND(fundAfter)} — about ${survivalMonths} months of runway.`
    : `A ${scenario.incomeDisruptionMonths}-month income loss would exhaust the emergency fund.`;

  const evidence: string[] = [
    `Income disruption: ${scenario.incomeDisruptionMonths} months`,
    `Monthly essential costs: ${formatVND(essentialMonthly)}`,
    `Total disruption drain: ${formatVND(disruptionDrain)}`,
    `Emergency fund: ${formatVND(scenario.currentSavings)}`,
    `Fund after disruption: ${formatVND(Math.max(0, fundAfter))}`,
    `Runway remaining: ${survivalMonths} months`,
  ];

  const calculationSummary =
    `Fund ${formatVND(scenario.currentSavings)} − Disruption ${formatVND(disruptionDrain)} = ${formatVND(Math.max(0, fundAfter))} remaining (${survivalMonths} months).`;

  const hasWarning = survivalMonths < 3 || !fundSurvives;

  return {
    agentId: "shock",
    agentName: "Shock Analysis",
    agentRole: "Income disruption & emergency resilience simulation",
    finding,
    evidence,
    calculationSummary,
    confidence: 85,
    explanation: hasWarning
      ? `During a ${scenario.incomeDisruptionMonths}-month disruption, the household must cover ${formatVND(essentialMonthly)}/month with zero income. ${fundSurvives ? `The fund survives but only ${survivalMonths} months of runway remain.` : "The fund is exhausted."}`
      : "The emergency fund comfortably absorbs the disruption.",
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

  const riskLevel =
    score >= 70 ? "HIGH REGRET RISK" :
    score >= 50 ? "ELEVATED RISK" :
    score >= 30 ? "MANAGEABLE WITH SAFEGUARDS" :
    "LOW RISK";

  const finding = `${riskLevel} — Score ${score}/100. ${triggered.length} risk factor${triggered.length !== 1 ? "s" : ""} triggered.`;

  const evidence: string[] = factors
    .filter((f) => f.triggered)
    .map((f) => `${f.label}: +${f.contribution} pts`);

  const calculationSummary =
    `Risk score: ${score}/100 — ${triggered.length} of ${factors.length} factors triggered (${triggered.reduce((s, f) => s + f.contribution, 0)} of ${factors.reduce((s, f) => s + f.maxContribution, 0)} max points).`;

  const hasWarning = score >= 50;

  return {
    agentId: "decision",
    agentName: "Decision Engine",
    agentRole: "Combined risk scoring & recommendation",
    finding,
    evidence,
    calculationSummary,
    confidence: 90,
    explanation: topFactor
      ? `Primary risk driver: ${topFactor.label}. ${topFactor.description}`
      : "No significant risk factors triggered.",
    status: hasWarning ? "warning" : "completed",
    iconName: "Scale",
    accentColor: score >= 70 ? "red" : score >= 50 ? "amber" : score >= 30 ? "amber" : "green",
  };
}

// ============================================================================
// Full Analysis Engine — ties everything together
// ============================================================================

import { runMonthlySimulation, findCriticalTurningPoint, generateConsequenceEvents } from "./financial-engine";
import { getRiskLevel } from "./scoring-engine";
import { saferScenario } from "./scenarios";

/**
 * Compute sensitivity ranking — tests each key parameter change individually
 * against the original scenario to show which single adjustment has the most
 * impact on the risk score. This addresses the "engineered scenario" critique.
 */
function computeSensitivityRanking(
  scenario: FinancialScenario,
): SensitivityResult[] {
  const originalScore = calculateRiskScore(scenario).score;

  const tests: { label: string; param: keyof FinancialScenario; value: number | string | boolean }[] = [
    { label: "Reduce loan principal", param: "loanAmount", value: saferScenario.loanAmount },
    { label: "Longer fixed-rate period", param: "introductoryPeriodMonths", value: saferScenario.introductoryPeriodMonths },
    { label: "Larger emergency fund", param: "currentSavings", value: saferScenario.currentSavings },
  ];

  return tests
    .map((test) => {
      const modified = { ...scenario, [test.param]: test.value };
      const scoreWith = calculateRiskScore(modified).score;
      return {
        label: test.label,
        scoreWith,
        reduction: originalScore - scoreWith,
      };
    })
    .sort((a, b) => b.reduction - a.reduction);
}

/**
 * Run a complete analysis on a scenario.
 * Returns the full AnalysisResult with all analysis findings, risk factors,
 * consequence events, and monthly simulation data.
 */
export function runAnalysis(scenario: FinancialScenario): AnalysisResult {
  const simulation = runMonthlySimulation(scenario);
  const criticalTurningPoint = findCriticalTurningPoint(simulation, scenario);
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

  const primaryExplanation =
    score >= 50
      ? `A ${scenario.incomeDisruptionMonths}-month income disruption combined with the interest-rate reset could exhaust the household's emergency reserve.`
      : "The scenario is manageable with the current safeguards in place.";

  // Sensitivity analysis — test each parameter change individually
  // to show which single adjustment has the most impact on the score
  const sensitivityRanking = computeSensitivityRanking(scenario);

  const saferAlt = {
    id: "safer-version",
    label: "Safer Apartment Purchase",
    changes: [
      "Reduce the loan principal",
      "Maintain a larger emergency fund",
      "Obtain a longer fixed-rate period",
      "Reduce the property budget",
      "Keep housing costs below 40% of income",
    ],
    newScenario: { ...saferScenario, monthlyIncome: scenario.monthlyIncome, monthlyLivingExpenses: scenario.monthlyLivingExpenses },
    newScore: calculateRiskScore({ ...saferScenario, monthlyIncome: scenario.monthlyIncome, monthlyLivingExpenses: scenario.monthlyLivingExpenses }).score,
    explanation:
      "A lower loan principal, longer fixed-rate period, and larger emergency fund reduce the risk score significantly while keeping the home purchase achievable.",
    sensitivityRanking,
  };

  return {
    scenario,
    riskScore: score,
    riskLevel,
    criticalTurningPoint,
    primaryExplanation,
    findings,
    consequenceEvents,
    riskFactors: factors,
    saferAlternative: saferAlt,
    monthlySimulation: simulation,
    totalHousingBurden: Math.round(m.postResetPayment + housingCosts),
    paymentToIncomeRatio: m.paymentToIncomeRatio,
    introMonthlyPayment: m.introPayment,
    postResetMonthlyPayment: m.postResetPayment,
    paymentIncreasePct: m.paymentIncreasePct,
    emergencyFundRunwayMonths: m.emergencyRunway,
  };
}
