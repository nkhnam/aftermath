import { describe, expect, it } from "vitest";
import { runAnalysis } from "@/lib/agents";
import { riskyScenario } from "@/lib/scenarios";
import { buildExplanationContext, explanationCacheHash } from "@/lib/explanation-context";
import { generateDeterministicExplanation } from "@/lib/deterministic-explanation";
import { validateExplanation } from "@/lib/explanation-validation";

const valid = {
  headline: "Headline",
  summary: "Summary",
  criticalTurningPointExplanation: "Turning point",
  topInsights: ["One", "Two", "Three"],
  recommendedActions: ["One", "Two", "Three"],
  disclaimer: "Disclaimer",
};

describe("explanation boundary", () => {
  it("accepts the exact structured output", () => {
    expect(validateExplanation(valid)).toBe(true);
  });

  it.each([
    null,
    {},
    { ...valid, headline: "" },
    { ...valid, topInsights: [] },
    { ...valid, recommendedActions: [""] },
    { ...valid, riskScore: 1 },
  ])("rejects malformed or expanded model output", (value) => {
    expect(validateExplanation(value)).toBe(false);
  });

  it("strips identifying notes from the provider context", () => {
    const result = runAnalysis({ ...riskyScenario, scenarioNote: "private note", id: "person-name" });
    const serialized = JSON.stringify(buildExplanationContext(result, "en"));
    expect(serialized).not.toContain("private note");
    expect(serialized).not.toContain("person-name");
  });

  it("changes the cache key when locale or calculated data changes", () => {
    const result = runAnalysis(riskyScenario);
    const en = buildExplanationContext(result, "en");
    const vi = buildExplanationContext(result, "vi");
    expect(explanationCacheHash(en)).not.toBe(explanationCacheHash(vi));
    expect(explanationCacheHash(en)).not.toBe(
      explanationCacheHash({ ...en, metrics: { ...en.metrics, riskScore: en.metrics.riskScore - 1 } }),
    );
  });

  it.each(["en", "vi"] as const)("generates a valid deterministic %s fallback", (locale) => {
    const context = buildExplanationContext(runAnalysis(riskyScenario), locale);
    const response = generateDeterministicExplanation(context);
    expect(response.source).toBe("deterministic");
    expect(validateExplanation(response.explanation)).toBe(true);
    expect(JSON.stringify(response.explanation)).not.toContain("33317360%");
    expect(response.explanation.topInsights.join(" ")).toContain(
      Math.round(context.metrics.totalHousingBurdenRatio).toString(),
    );
  });
});
