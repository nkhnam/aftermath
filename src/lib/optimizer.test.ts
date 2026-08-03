import { describe, expect, it } from "vitest";
import { optimizeScenario } from "@/lib/optimizer";
import { calculateRiskScore } from "@/lib/scoring-engine";
import { riskyScenario, saferScenario } from "@/lib/scenarios";
import type { FinancialScenario } from "@/lib/types";

function expectFiniteRoutes(scenario: FinancialScenario): void {
  for (const route of optimizeScenario(scenario)) {
    expect(Number.isFinite(route.newScore)).toBe(true);
    expect(route.newScore).toBe(calculateRiskScore(route.newScenario).score);
    expect(route.incrementsTested).toBeGreaterThan(0);
    expect(route.incrementsTested).toBeLessThanOrEqual(20);
  }
}

describe("smallest change optimizer", () => {
  it("does not mutate the original scenario", () => {
    const original = structuredClone(riskyScenario);
    optimizeScenario(riskyScenario);
    expect(riskyScenario).toEqual(original);
  });

  it("does not propose unnecessary changes for a safe scenario", () => {
    expect(optimizeScenario(saferScenario)).toEqual([]);
  });

  it("returns at most three ranked viable routes", () => {
    const routes = optimizeScenario(riskyScenario);
    expect(routes.length).toBeLessThanOrEqual(3);
    if (routes.some((route) => route.isViable)) {
      expect(routes.every((route) => route.isViable)).toBe(true);
      expect(routes[0].isSmallestChange).toBe(true);
    } else {
      expect(routes.length).toBeLessThanOrEqual(2);
      expect(routes.every((route) => route.isViable === false)).toBe(true);
    }
  });

  it("keeps every tested result finite at full-term fixed-period boundary", () => {
    expectFiniteRoutes({
      ...riskyScenario,
      introductoryPeriodMonths: riskyScenario.loanTermYears * 12 - 12,
    });
  });

  it("adapts routes to a custom scenario", () => {
    const custom: FinancialScenario = {
      ...riskyScenario,
      id: "optimizer-custom",
      isCustom: true,
    };
    const routes = optimizeScenario(custom);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((route) => route.newScenario.id === custom.id)).toBe(true);
    expectFiniteRoutes(custom);
  });

  it("returns up to two partial improvements when no single route is viable", () => {
    const impossible: FinancialScenario = {
      ...riskyScenario,
      id: "optimizer-impossible",
      monthlyIncome: 5_000_000,
      monthlyLivingExpenses: 20_000_000,
      additionalMonthlyDebt: 100_000_000,
      currentSavings: 0,
    };
    const routes = optimizeScenario(impossible);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.length).toBeLessThanOrEqual(2);
    expect(routes.every((route) => route.isViable === false)).toBe(true);
  });
});
