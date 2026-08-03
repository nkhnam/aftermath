import { describe, expect, it } from "vitest";
import { applyStress } from "@/lib/stress-test";
import { runAnalysis } from "@/lib/agents";
import { riskyScenario } from "@/lib/scenarios";

function findNaNPaths(obj: unknown, path: string = "root"): string[] {
  const results: string[] = [];
  if (typeof obj === "number") {
    if (!Number.isFinite(obj)) results.push(`${path} = ${obj}`);
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...findNaNPaths(obj[i], `${path}[${i}]`));
    }
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      results.push(...findNaNPaths(v, `${path}.${k}`));
    }
  }
  return results;
}

describe("diagnose NaN", () => {
  it("prints NaN paths for rate_increase 3", () => {
    const stressed = applyStress(riskyScenario, { type: "rate_increase", value: 3 });
    const result = runAnalysis(stressed);
    const paths = findNaNPaths(result);
    expect(paths).toEqual([]);
  });

  it("prints NaN paths for emergency_expense 50M", () => {
    const stressed = applyStress(riskyScenario, { type: "emergency_expense", value: 50_000_000 });
    const result = runAnalysis(stressed);
    const paths = findNaNPaths(result);
    expect(paths).toEqual([]);
  });

  it("prints NaN paths for ownership_cost_increase 10", () => {
    const stressed = applyStress(riskyScenario, { type: "ownership_cost_increase", value: 10 });
    const result = runAnalysis(stressed);
    const paths = findNaNPaths(result);
    expect(paths).toEqual([]);
  });
});
