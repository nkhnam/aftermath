import type { ExplanationResult } from "./explanation-types";

// ============================================================================
// Qwen Explanation Response Validation
// Validates that a model response conforms to the required schema before it
// is rendered. Invalid responses fall back to the deterministic provider.
// Extracted into a lib module so it can be unit-tested independently of the
// server route.
// ============================================================================

/**
 * Validate that an unknown value conforms to the ExplanationResult schema.
 * Returns true only when every required string field is a non-empty string
 * and every required array field is a non-empty array of strings.
 */
export function validateExplanation(data: unknown): data is ExplanationResult {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  const allowedFields = new Set([
    "headline",
    "summary",
    "criticalTurningPointExplanation",
    "topInsights",
    "recommendedActions",
    "disclaimer",
  ]);
  if (Object.keys(obj).some((field) => !allowedFields.has(field))) return false;

  // Required string fields
  const stringFields = [
    "headline",
    "summary",
    "criticalTurningPointExplanation",
    "disclaimer",
  ];
  for (const field of stringFields) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim().length === 0) {
      return false;
    }
  }

  // Required array fields
  const arrayFields = ["topInsights", "recommendedActions"];
  for (const field of arrayFields) {
    if (!Array.isArray(obj[field])) return false;
    if (obj[field].length === 0) return false;
    if (!obj[field].every((item) => typeof item === "string" && item.trim().length > 0)) return false;
  }

  return true;
}
