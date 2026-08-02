# AfterMath — Product Specification

## Product

**Name:** AfterMath
**Tagline:** See the financial aftermath before you sign.
**Category:** AI Financial Pre-Mortem

## Core Idea

Before a person commits to a major loan, AfterMath simulates the financial
consequences they may not have considered:

- Hidden costs
- Interest-rate changes
- Cash-flow pressure
- Emergency scenarios
- The month where the decision becomes dangerous
- A safer alternative

This is **not** a chatbot, banking dashboard, investment advisor, loan approval
system, or official financial advisory service. It is a hackathon prototype
using **synthetic financial scenarios**.

## Primary Demo Story

A household considers buying an apartment in Vietnam.

| Input | Value |
|---|---|
| Property price | 3,200,000,000 VND |
| Down payment | 800,000,000 VND |
| Loan amount | 2,400,000,000 VND |
| Loan term | 20 years |
| Introductory rate | 6.8% annual |
| Post-introductory rate | 11.5% annual |
| Introductory period | 12 months |
| Monthly income | 48,000,000 VND |
| Current savings | 300,000,000 VND |
| Living expenses | 21,000,000 VND/month |
| Housing maintenance | 4,000,000 VND/month |
| Income disruption | 3 months |

### Expected reveal

- Loan appears affordable during introductory period
- Mortgage payment rises after interest-rate reset (+38%)
- Total housing burden becomes dangerous (>65% of income)
- 3-month income disruption rapidly consumes emergency fund
- Critical turning point: **Month 19**
- Regret-risk score: **81/100**
- Safer alternative score: **34/100**

## Three Application States

### State 1 — Decision Setup

- Premium opening statement with headline
- Preset selector (Risky / Safer)
- Editable scenario form
- Primary CTA: "Reveal the aftermath"

**Headline:** "This home looks affordable today. What happens after you sign?"

### State 2 — Live Pre-Mortem

Five agents analyze the decision sequentially:

1. **Terms Agent** — interest rates, reset timing, repayment structure
2. **Cashflow Agent** — payment-to-income ratio, remaining cash, runway
3. **Hidden Cost Agent** — maintenance, insurance, furnishing, management
4. **Shock Agent** — income disruption, emergency fund survival
5. **Decision Agent** — combined risk score, critical turning point, safer action

Agents appear with visible statuses: waiting → analyzing → completed / warning.

No hidden chain-of-thought. Only: finding, evidence, calculation summary,
confidence, user-facing explanation.

### State 3 — Aftermath Result

- Visually strong consequence timeline (Month 1 → Month 27+)
- Prominent risk score (81/100)
- Critical turning point (Month 19)
- Primary explanation
- "Find a safer version" button → animated score transition (81 → 34)
- Updated timeline with safer assumptions
- Before/after comparison
- Restart, replay, generate share card, presentation mode

## Deterministic Logic

The application works **without any external AI API**.

### Data Types

- `FinancialScenario` — all input parameters
- `AgentFinding` — agent output (finding, evidence, calculation, confidence)
- `ConsequenceEvent` — timeline month + severity + metrics
- `RiskFactor` — labeled contribution with visible points
- `SaferAlternative` — changed assumptions + new scenario + new score
- `AnalysisResult` — complete analysis output

### Scoring Engine

Seven risk factors, each with a visible contribution:

| Factor | Max Pts | Trigger |
|---|---|---|
| Post-reset housing burden > 50% of income | 20 | >50% |
| Emergency fund below 6 months of essential costs | 15 | <6mo |
| Large payment change (intro → post) | 15 | >20% |
| High loan-to-income relationship | 10 | >4× |
| Hidden housing costs excluded from mortgage | 10 | >15% of income |
| Income disruption consuming reserves | 18 | >40% consumed |
| No long fixed-rate protection | 12 | ≤24mo fixed |

Score is clamped 0–100. Every contribution is visible to the user.

## Visual Direction

- Dark navy / near-black base (#07090f)
- Warm white primary text (#f5f3ef)
- Muted gray supporting text (#8b94a8)
- Amber (#f5a623) and red (#e5484d) for financial danger
- Blue (#3b82f6) and green (#22c55e) for safe scenarios
- Strong typography, large numerical hierarchy
- Subtle borders, spacious composition, minimal navigation

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Recharts (when charts add value)
- Lucide Icons

## Working Rules

- No authentication
- No database
- No complex backend
- No OCR, bank connections, payment processing, or chat interface
- No features outside the agreed MVP
- Simpler reliable implementation when deadline risk emerges
