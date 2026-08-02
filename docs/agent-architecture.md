# AfterMath — Agent Architecture

## Overview

AfterMath uses five deterministic agents that analyze a financial scenario
sequentially. Each agent is a pure TypeScript function that produces an
`AgentFinding` object. No external AI API is required.

## Agent Flow

```
User clicks "Reveal the aftermath"
         │
         ▼
  runAnalysis(scenario)
         │
         ├─▶ runMonthlySimulation()  →  MonthlySimulation[]
         ├─▶ findCriticalTurningPoint()
         ├─▶ generateConsequenceEvents()
         ├─▶ calculateRiskScore()    →  RiskFactor[]
         └─▶ buildAgentFindings()
                │
                ├─▶ Terms Agent
                ├─▶ Cashflow Agent
                ├─▶ Hidden Cost Agent
                ├─▶ Shock Agent
                └─▶ Decision Agent
         │
         ▼
  AnalysisResult (returned to UI)
```

## Agent Definitions

### 1. Terms Agent (`buildTermsAgent`)

**Role:** Loan terms & interest-rate analysis

**Checks:**
- Introductory interest rate
- Post-introductory interest rate
- Loan duration
- Rate-reset timing
- Repayment structure

**Output:** Finding about the interest-rate reset, including the percentage
increase from intro to post-reset payment.

### 2. Cashflow Agent (`buildCashflowAgent`)

**Role:** Monthly cash-flow & payment-to-income analysis

**Checks:**
- Monthly payment
- Payment-to-income ratio
- Living expenses
- Remaining monthly cash
- Emergency-fund runway

**Output:** Cash-flow warning if the household runs a monthly deficit
post-reset, with numerical evidence.

### 3. Hidden Cost Agent (`buildHiddenCostAgent`)

**Role:** Costs excluded from the headline mortgage payment

**Checks:**
- Maintenance
- Insurance
- Furnishing & repair
- Management fees

**Output:** The difference between the loan payment and the true total
housing burden, as a percentage of income.

### 4. Shock Agent (`buildShockAgent`)

**Role:** Income disruption & emergency resilience simulation

**Simulates:**
- Temporary income loss (N months)
- Full essential costs continuing during disruption

**Output:** How long the emergency fund survives the disruption, and how
many months of runway remain afterward.

### 5. Decision Agent (`buildDecisionAgent`)

**Role:** Combined risk assessment & recommendation

**Combines:**
- All risk factors from the scoring engine
- Critical turning point from the simulation
- Primary explanation

**Output:** Overall regret-risk score, critical turning point month,
key reason, and safer action recommendation.

## Agent Status States

Each agent cycles through visible states during the live pre-mortem:

| State | Visual | Meaning |
|---|---|---|
| `waiting` | Gray, dimmed | Agent not yet started |
| `analyzing` | Blue, spinner | Agent running |
| `completed` | Green, checkmark | No significant risk found |
| `warning` | Red, alert | Risk factor triggered |

## Transparency Rules

- **No hidden chain-of-thought** is displayed.
- Only: finding, evidence, calculation summary, confidence, explanation.
- Every risk factor contribution is visible in the score breakdown.
- The scoring formula is fully deterministic and reproducible.

## File Mapping

| File | Responsibility |
|---|---|
| `src/lib/agents.ts` | All 5 agent builders + `runAnalysis()` |
| `src/lib/financial-engine.ts` | Mortgage math, simulation, events |
| `src/lib/scoring-engine.ts` | Risk factor calculation, score clamping |
| `src/components/agent-card.tsx` | Agent UI with status + findings |
| `src/components/agent-workflow.tsx` | Sequential animation orchestration |
