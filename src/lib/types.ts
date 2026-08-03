import type { StructuredOutput, StructuredEvidence } from "./i18n-types";

// ============================================================================
// AfterMath — Core Data Types
// All financial data is synthetic. No real financial advice is provided.
//
// Engine output uses STRUCTURED DATA (type + raw values) rather than
// pre-formatted English strings. This allows locale-aware rendering at
// display time without re-running the engine when language changes.
// ============================================================================

/** A financial scenario representing a loan decision. */
export interface FinancialScenario {
  id: string;
  /** Language-independent identifier for label lookup */
  labelKey?: string;
  /** Total property/asset price in VND */
  propertyPrice: number;
  /** Upfront down payment in VND */
  downPayment: number;
  /** Loan principal in VND */
  loanAmount: number;
  /** Loan term in years */
  loanTermYears: number;
  /** Introductory annual interest rate (decimal, e.g. 0.068 = 6.8%) */
  introductoryRate: number;
  /** Post-introductory annual interest rate (decimal, e.g. 0.115 = 11.5%) */
  postIntroductoryRate: number;
  /** Number of months the introductory rate lasts */
  introductoryPeriodMonths: number;
  /** Household gross monthly income in VND */
  monthlyIncome: number;
  /** Current savings / emergency fund in VND */
  currentSavings: number;
  /** Estimated monthly living expenses in VND */
  monthlyLivingExpenses: number;
  /** Monthly housing maintenance & management in VND */
  monthlyMaintenance: number;
  /** Monthly property insurance in VND */
  monthlyInsurance: number;
  /** Monthly furnishing & repair amortization in VND */
  monthlyFurnishingRepair: number;
  /** Monthly management fees in VND */
  monthlyManagementFees: number;
  /** Number of months of income disruption to simulate */
  incomeDisruptionMonths: number;
  /** Month at which income disruption begins (1-indexed) */
  incomeDisruptionStartMonth: number;
  /** If true, the rate is fixed for the entire term (no reset) */
  isFixedRate: boolean;
  /** Data type label */
  dataType: "synthetic";
  /** Optional: additional monthly debt payments */
  additionalMonthlyDebt?: number;
  /** Optional: number of financial dependants */
  dependants?: number;
  /** Optional: expected annual income growth (decimal) */
  incomeGrowthRate?: number;
  /** Optional: planned major expense (one-time) */
  plannedMajorExpense?: number;
  unexpectedEmergencyExpenseMonth?: number;
  incomeReductionPercent?: number;
  simulationHorizonMonths?: number;
  /** Optional: personal scenario note */
  scenarioNote?: string;
  /** Whether this is a custom (user-provided) scenario */
  isCustom?: boolean;
}

/** Status of an agent during analysis */
export type AgentStatus = "waiting" | "analyzing" | "completed" | "warning";

/** A single agent's finding — structured for locale-aware rendering */
export interface AgentFinding {
  agentId: string;
  /** Structured finding output (type + raw values for localization) */
  finding: StructuredOutput;
  /** Structured evidence items */
  evidence: StructuredEvidence[];
  /** Structured calculation summary */
  calculation: StructuredOutput;
  /** Structured explanation */
  explanation: StructuredOutput;
  status: AgentStatus;
  iconName: string;
  accentColor: "amber" | "red" | "blue" | "green" | "slate";
}

/** A month-by-month consequence event in the timeline — structured */
export interface ConsequenceEvent {
  month: number;
  /** Event type identifier: "decision-begins", "rate-reset", etc. */
  eventType: string;
  /** Structured description (type + raw values for localization) */
  description: StructuredOutput;
  severity: "safe" | "caution" | "danger" | "critical";
  monthlyPayment: number;
  monthlyCashFlow: number;
  emergencyFund: number;
  isDisruption: boolean;
  isRateReset: boolean;
}

/** A single risk factor contributing to the overall score — structured */
export interface RiskFactor {
  id: string;
  /** Structured description (type + raw values for localization) */
  description: StructuredOutput;
  /** Structured reason — why this factor matters */
  reason: StructuredOutput;
  maxContribution: number;
  contribution: number;
  triggered: boolean;
  /** Structured evidence (type + raw values for localization) */
  evidence: StructuredOutput;
  /** Source type identifier: "verified_calc" | "user_assumption" | "stress_test" | "missing_info" */
  sourceType: string;
  /** Sensitivity level: "high" | "medium" | "low" */
  sensitivity: string;
}

/** A single parameter's impact on the risk score — structured */
export interface SensitivityResult {
  /** Language-independent type for label lookup */
  type: string;
  /** Parameter key that was changed */
  param: string;
  scoreWith: number;
  reduction: number;
}

/** A safer alternative scenario — structured */
export interface SaferAlternative {
  id: string;
  /** Structured changes (each has type for localization) */
  changes: StructuredOutput[];
  newScenario: FinancialScenario;
  newScore: number;
  /** Structured explanation */
  explanation: StructuredOutput;
  /** Which single parameter change had the most impact */
  sensitivityRanking: SensitivityResult[];
}

/** An escape route — a single actionable change to reduce risk */
export interface EscapeRoute {
  id: string;
  /** Structured change description */
  change: StructuredOutput;
  /** Structured expected impact */
  impact: StructuredOutput;
  /** Structured trade-off */
  tradeoff: StructuredOutput;
  /** Structured why it helps */
  why: StructuredOutput;
  newScore: number;
  newScenario: FinancialScenario;
  /** Whether this is the smallest viable adjustment */
  isSmallestChange: boolean;
  /** New critical month after applying this route (null = no critical break) */
  newCriticalMonth?: number | null;
  /** Number of increments tested to find this route */
  incrementsTested?: number;
  /** Whether this route meets the survivability target (score < 50 or no critical break) */
  isViable?: boolean;
}

/** Monthly simulation row */
export interface MonthlySimulation {
  month: number;
  monthlyPayment: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  emergencyFund: number;
  isIntroPeriod: boolean;
  isRateReset: boolean;
  isDisruption: boolean;
  paymentToIncomeRatio: number;
  oneTimeExpenses: number;
  activeEvents: string[];
}

/** The complete analysis result */
export interface AnalysisResult {
  scenario: FinancialScenario;
  riskScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  criticalTurningPoint: number;
  /** Whether a genuine critical break was found */
  hasCriticalBreak: boolean;
  /** Structured primary explanation */
  primaryExplanation: StructuredOutput;
  findings: AgentFinding[];
  consequenceEvents: ConsequenceEvent[];
  riskFactors: RiskFactor[];
  saferAlternative: SaferAlternative;
  /** Up to 3 personalized escape routes */
  escapeRoutes: EscapeRoute[];
  monthlySimulation: MonthlySimulation[];
  totalHousingBurden: number;
  /** Mortgage payment only, divided by monthly income. */
  paymentToIncomeRatio: number;
  /** Mortgage plus recurring ownership costs, divided by monthly income. */
  housingToIncomeRatio: number;
  /** Mortgage, recurring insurance/management fees, and other debt divided by income. */
  debtToIncomeRatio: number;
  /** DTI obligations plus living expenses, divided by monthly income. */
  cashCommitmentRatio: number;
  introMonthlyPayment: number;
  postResetMonthlyPayment: number;
  paymentIncreasePct: number;
  emergencyFundRunwayMonths: number;
}

/** Application state machine */
export type AppState = "intro" | "custom" | "analyzing" | "result";

/** Story beat in the five-beat narrative structure */
export interface StoryBeat {
  id: string;
  title: string;
  subtitle: string;
  beat: "dream" | "affordable" | "hidden-change" | "shock" | "breaking-point" | "escape";
}

/** Share card aspect ratio variant */
export type ShareVariant = "16:9" | "1:1" | "9:16";

// ============================================================================
// Custom Scenario Types
// ============================================================================

/** Form state for the custom scenario input */
export interface CustomScenarioForm {
  scenarioName: string;
  propertyPrice: number;
  downPayment: number;
  loanAmount: number;
  loanTermYears: number;
  /** As percentage (e.g. 6.8) */
  introductoryRate: number;
  /** As percentage (e.g. 11.5) */
  postIntroductoryRate: number;
  introductoryPeriodMonths: number;
  monthlyIncome: number;
  currentSavings: number;
  monthlyLivingExpenses: number;
  /** Combined ownership & maintenance costs */
  monthlyOwnershipCosts: number;
  incomeDisruptionMonths: number;
  incomeDisruptionStartMonth: number;
  incomeReductionPercent: number;
  unexpectedEmergencyExpense: number;
  isFixedRate: boolean;
  // Optional fields
  additionalMonthlyDebt: number;
  dependants: number;
  scenarioNote: string;
}

/** A quick-start persona for custom scenario */
export interface Persona {
  id: string;
  formValues: Partial<CustomScenarioForm>;
}

/** Validation error for a form field */
export interface ValidationError {
  field: string;
  errorType: string;
  values?: Record<string, string | number>;
}

/** A stress test that can be applied to a scenario */
export interface StressTest {
  type: "income_interruption" | "income_reduction" | "rate_increase" | "emergency_expense" | "additional_debt" | "ownership_cost_increase";
  value: number;
}
