// ============================================================================
// AfterMath — i18n Type Definitions
// Separated from i18n.tsx to avoid circular imports.
// ============================================================================

export type Lang = "en" | "vi";

/** Format hints for typed interpolation in translation strings */
export type FormatHint =
  | "pct"
  | "cur"
  | "curCompact"
  | "num"
  | "month"
  | "months"
  | "years"
  | "x"
  | "int"
  | "plain";

/** A structured value for localized output (type + raw numeric values) */
export interface StructuredOutput {
  type: string;
  values: Record<string, string | number>;
}

/** A structured evidence item */
export interface StructuredEvidence {
  type: string;
  values: Record<string, string | number>;
}
