# AfterMath Build Log

## Milestone 1 — Stress Lab

Status: PASS (2026-08-03)

- Six single-shock types are implemented with immutable derived scenarios.
- Risk analysis, critical point, cash flow, reserve runway, housing burden, timeline, and risk factors are recalculated by the deterministic engine.
- Fixed a zero-month re-amortization boundary when the introductory period reaches the full loan term. This previously allowed `NaN` values into optimizer routes for a subset of stressed scenarios.
- Added finite-number regression coverage across risky and safer presets and all supported shock categories.
- Verification: `npm test` (45/45), `npm run lint`, and `npm run build` all pass.
- Next.js 16 route-handler documentation was located in `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` for the later server-only explanation API audit.

Manual bilingual/browser matrix remains part of the final release audit after all milestones are code-complete.

## Milestone 2 — Smallest Change Optimizer

Status: PASS (2026-08-03)

- Eight bounded deterministic strategies are searched with the same financial engine; viable routes stop at the first successful increment per strategy.
- Viable routes are ranked using normalized cost, risk reduction, and critical-point removal.
- Fixed the no-viable-route branch, which previously could not return partial improvements because only already-viable candidates were retained.
- The fallback now evaluates bounded strategy endpoints and returns up to two calculated partial improvements with `isViable: false`; it never claims those routes meet the target.
- Added optimizer regression coverage for immutability, safe scenarios, route count/ranking, 20-iteration bounds, full-term fixed-period calculations, Custom Scenario adaptation, and impossible single-route cases.
- Verification: `npm test` (51/51), `npm run lint`, and `npm run build` all pass.

## Milestone 3 — Qwen Explanation Layer

Status: PASS with deterministic fallback verified (2026-08-03)

- The optional Qwen call is isolated in a Next.js App Router POST Route Handler and reads `DASHSCOPE_API_KEY` only on the server.
- Qwen output is schema-validated; unknown fields, blank strings, empty arrays, malformed JSON, provider failures, timeouts, and missing configuration all resolve to the deterministic provider.
- The client validates the API response again before rendering and caches successful/fallback explanations by sanitized context hash.
- Context tests confirm scenario identifiers and personal notes are excluded. Cache keys vary with locale and calculated results.
- Fixed a fallback unit mismatch found by browser testing: housing burden currency was incorrectly rendered as a percentage. A dedicated `totalHousingBurdenRatio` is now supplied and regression-tested.
- README and `.env.example` document secure server-side configuration and credential-free operation.
- Verification: `npm test` (62/62), `npm run lint`, and `npm run build` all pass.

## Browser smoke audit

- Playwright, Chromium, `http://localhost:3000`, Vietnamese and English.
- Risky preset retained the official Month 19 and 81/100 result.
- Stress Lab: applied a six-month income interruption, observed 81→89 and updated timeline/reserve, then removed it and restored 81/Month 19.
- Language switch after stress removal produced fully localized English controls and content.
- Missing-key explanation returned the localized deterministic attribution and content.
- Browser console: 0 errors, 0 warnings during the tested flow.

## Qwen model update

- Updated the server-side explanation model from `qwen-plus` to `qwen3.7-plus` on 2026-08-03.
- The API key remains server-only and all deterministic fallback behavior is unchanged.
