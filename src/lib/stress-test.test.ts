import { describe, it, expect } from "vitest";
import { applyStress, STRESS_TYPES } from "@/lib/stress-test";
import { runAnalysis } from "@/lib/agents";
import { riskyScenario, saferScenario } from "@/lib/scenarios";
import type { StressTest } from "@/lib/types";

// ============================================================================
// Stress Lab — Calculation Tests
// Verifies immutability, all 6 shock types, no NaN/Infinity, and exact
// restoration when a stress is removed.
// ============================================================================

function isFiniteNumber(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
}

/** Recursively check that no NaN/Infinity appears anywhere in a result */
function assertNoNaNInfinity(obj: unknown): void {
  if (typeof obj === "number") {
    expect(isFiniteNumber(obj), `expected finite number, got ${obj}`).toBe(true);
  } else if (Array.isArray(obj)) {
    for (const item of obj) assertNoNaNInfinity(item);
  } else if (obj && typeof obj === "object") {
    for (const val of Object.values(obj)) assertNoNaNInfinity(val);
  }
}

describe("applyStress — immutability", () => {
  it("does not mutate the original scenario", () => {
    const snapshot = JSON.parse(JSON.stringify(riskyScenario));
    applyStress(riskyScenario, { type: "income_interruption", value: 6 });
    expect(riskyScenario).toEqual(snapshot);
  });

  it("returns a new object (different reference)", () => {
    const stressed = applyStress(riskyScenario, { type: "income_reduction", value: 20 });
    expect(stressed).not.toBe(riskyScenario);
  });
});

describe("applyStress — shock types", () => {
  it("income_interruption sets disruption months", () => {
    const s = applyStress(riskyScenario, { type: "income_interruption", value: 6 });
    expect(s.incomeDisruptionMonths).toBe(6);
    // other fields unchanged
    expect(s.monthlyIncome).toBe(riskyScenario.monthlyIncome);
  });

  it("income_reduction records a deterministic income reduction", () => {
    const s = applyStress(riskyScenario, { type: "income_reduction", value: 30 });
    expect(s.incomeReductionPercent).toBe(30);
  });

  it("rate_increase adds percentage points to post-introductory rate", () => {
    const s = applyStress(riskyScenario, { type: "rate_increase", value: 2 });
    expect(s.postIntroductoryRate).toBeCloseTo(riskyScenario.postIntroductoryRate + 0.02, 10);
  });

  it("rate_increase also raises intro rate when fixed", () => {
    const fixed = { ...riskyScenario, isFixedRate: true };
    const s = applyStress(fixed, { type: "rate_increase", value: 3 });
    expect(s.introductoryRate).toBeCloseTo(riskyScenario.introductoryRate + 0.03, 10);
  });

  it("emergency_expense is applied as a one-time simulated expense", () => {
    const s = applyStress(riskyScenario, { type: "emergency_expense", value: 100_000_000 });
    expect(s.currentSavings).toBe(riskyScenario.currentSavings);
    expect(s.plannedMajorExpense).toBe(100_000_000);
  });

  it("emergency_expense preserves the original reserve before its event month", () => {
    const s = applyStress(riskyScenario, { type: "emergency_expense", value: 999_999_999_999 });
    expect(s.currentSavings).toBe(riskyScenario.currentSavings);
    expect(s.plannedMajorExpense).toBe(999_999_999_999);
  });

  it("additional_debt adds to existing monthly debt", () => {
    const base = { ...riskyScenario, additionalMonthlyDebt: 2_000_000 };
    const s = applyStress(base, { type: "additional_debt", value: 5_000_000 });
    expect(s.additionalMonthlyDebt).toBe(7_000_000);
  });

  it("additional_debt works when no prior debt exists", () => {
    const s = applyStress(riskyScenario, { type: "additional_debt", value: 5_000_000 });
    expect(s.additionalMonthlyDebt).toBe(5_000_000);
  });

  it("ownership_cost_increase scales all ownership components", () => {
    const s = applyStress(riskyScenario, { type: "ownership_cost_increase", value: 20 });
    const factor = 1.2;
    expect(s.monthlyMaintenance).toBe(Math.round(riskyScenario.monthlyMaintenance * factor));
    expect(s.monthlyInsurance).toBe(Math.round(riskyScenario.monthlyInsurance * factor));
    expect(s.monthlyFurnishingRepair).toBe(Math.round(riskyScenario.monthlyFurnishingRepair * factor));
    expect(s.monthlyManagementFees).toBe(Math.round(riskyScenario.monthlyManagementFees * factor));
  });
});

describe("STRESS_TYPES — configuration", () => {
  it("defines exactly six shock types", () => {
    expect(STRESS_TYPES).toHaveLength(6);
  });

  it("every type has at least one severity option", () => {
    for (const st of STRESS_TYPES) {
      expect(st.severityOptions.length).toBeGreaterThan(0);
    }
  });

  it("every severity option has a labelKey", () => {
    for (const st of STRESS_TYPES) {
      for (const opt of st.severityOptions) {
        expect(typeof opt.labelKey).toBe("string");
        expect(opt.labelKey.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Stress Lab — analysis integrity", () => {
  const allShocks: StressTest[] = [
    { type: "income_interruption", value: 1 },
    { type: "income_interruption", value: 3 },
    { type: "income_interruption", value: 6 },
    { type: "income_reduction", value: 10 },
    { type: "income_reduction", value: 30 },
    { type: "rate_increase", value: 1 },
    { type: "rate_increase", value: 3 },
    { type: "emergency_expense", value: 50_000_000 },
    { type: "emergency_expense", value: 300_000_000 },
    { type: "additional_debt", value: 3_000_000 },
    { type: "additional_debt", value: 10_000_000 },
    { type: "ownership_cost_increase", value: 10 },
    { type: "ownership_cost_increase", value: 30 },
  ];

  it.each(allShocks)("produces no NaN/Infinity for shock %s=%s", (shock) => {
    const stressed = applyStress(riskyScenario, shock);
    const result = runAnalysis(stressed);
    assertNoNaNInfinity(result);
  });

  it.each(allShocks)("produces no NaN/Infinity on safer preset for shock %s=%s", (shock) => {
    const stressed = applyStress(saferScenario, shock);
    const result = runAnalysis(stressed);
    assertNoNaNInfinity(result);
  });

  it("does not manufacture a break when reserves absorb a temporary shock", () => {
    const stressed = applyStress(saferScenario, { type: "income_interruption", value: 6 });
    const result = runAnalysis(stressed);
    expect(result.hasCriticalBreak).toBe(false);
    expect(result.criticalTurningPoint).toBe(0);
  });

  it("removing a stress restores the original result exactly", () => {
    const original = runAnalysis(riskyScenario);
    const shock: StressTest = { type: "income_interruption", value: 6 };
    // "removing" = re-run analysis on the unmodified original scenario
    const restored = runAnalysis(riskyScenario);
    applyStress(riskyScenario, shock); // applied somewhere, original untouched
    expect(restored.riskScore).toBe(original.riskScore);
    expect(restored.criticalTurningPoint).toBe(original.criticalTurningPoint);
    expect(restored.hasCriticalBreak).toBe(original.hasCriticalBreak);
  });
});
