// ============================================================================
// AfterMath — Core Data Types
// All financial data is synthetic. No real financial advice is provided.
// ============================================================================

/** A financial scenario representing a loan decision. */
export interface FinancialScenario {
  id: string;
  label: string;
  description: string;
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
}

/** Status of an agent during analysis */
export type AgentStatus = "waiting" | "analyzing" | "completed" | "warning";

/** A single agent's finding */
export interface AgentFinding {
  agentId: string;
  agentName: string;
  agentRole: string;
  finding: string;
  evidence: string[];
  calculationSummary: string;
  confidence: number; // 0–100
  explanation: string;
  status: AgentStatus;
  iconName: string;
  accentColor: "amber" | "red" | "blue" | "green" | "slate";
}

/** A month-by-month consequence event in the timeline */
export interface ConsequenceEvent {
  month: number;
  label: string;
  description: string;
  severity: "safe" | "caution" | "danger" | "critical";
  monthlyPayment: number;
  monthlyCashFlow: number;
  emergencyFund: number;
  isDisruption: boolean;
  isRateReset: boolean;
}

/** A single risk factor contributing to the overall score */
export interface RiskFactor {
  id: string;
  label: string;
  description: string;
  maxContribution: number;
  contribution: number;
  triggered: boolean;
  evidence: string;
}

/** A single parameter's impact on the risk score */
export interface SensitivityResult {
  label: string;
  scoreWith: number;
  reduction: number;
}

/** A safer alternative scenario */
export interface SaferAlternative {
  id: string;
  label: string;
  changes: string[];
  newScenario: FinancialScenario;
  newScore: number;
  explanation: string;
  /** Which single parameter change had the most impact */
  sensitivityRanking: SensitivityResult[];
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
}

/** The complete analysis result */
export interface AnalysisResult {
  scenario: FinancialScenario;
  riskScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  criticalTurningPoint: number;
  primaryExplanation: string;
  findings: AgentFinding[];
  consequenceEvents: ConsequenceEvent[];
  riskFactors: RiskFactor[];
  saferAlternative: SaferAlternative;
  monthlySimulation: MonthlySimulation[];
  totalHousingBurden: number;
  paymentToIncomeRatio: number;
  introMonthlyPayment: number;
  postResetMonthlyPayment: number;
  paymentIncreasePct: number;
  emergencyFundRunwayMonths: number;
}

/** Application state machine */
export type AppState = "intro" | "analyzing" | "result";

/** Story beat in the five-beat narrative structure */
export interface StoryBeat {
  id: string;
  title: string;
  subtitle: string;
  beat: "dream" | "affordable" | "hidden-change" | "shock" | "breaking-point" | "escape";
}

/** Share card aspect ratio variant */
export type ShareVariant = "16:9" | "1:1" | "9:16";
