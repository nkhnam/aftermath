"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle, Lightbulb, ListChecks, Info } from "lucide-react";
import type { AnalysisResult, EscapeRoute } from "@/lib/types";
import type { ExplanationResult, ExplanationSource } from "@/lib/explanation-types";
import { buildExplanationContext, explanationCacheHash } from "@/lib/explanation-context";
import { generateDeterministicExplanation } from "@/lib/deterministic-explanation";
import { validateExplanation } from "@/lib/explanation-validation";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ============================================================================
// Explanation Panel — optional Qwen-powered explanation with deterministic fallback
//
// - Button is secondary (not auto-called during cinematic demo)
// - Calls /api/explain server route (key never reaches browser)
// - Falls back to deterministic on network error
// - Caches by stable hash of context
// ============================================================================

interface ExplanationPanelProps {
  result: AnalysisResult;
  appliedRoute: EscapeRoute | null;
}

// Module-level cache: hash → { explanation, source }
const explanationCache = new Map<string, { explanation: ExplanationResult; source: ExplanationSource }>();

type ExplainState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; explanation: ExplanationResult; source: ExplanationSource }
  | { status: "error"; explanation: ExplanationResult; source: ExplanationSource };

export function ExplanationPanel({ result, appliedRoute }: ExplanationPanelProps) {
  const { t, lang } = useT();
  const [state, setState] = useState<ExplainState>({ status: "idle" });
  const lastHashRef = useRef<string | null>(null);

  const handleExplain = useCallback(async () => {
    setState({ status: "loading" });

    const context = buildExplanationContext(result, lang, null, appliedRoute);
    const hash = explanationCacheHash(context);

    // Check cache first
    const cached = explanationCache.get(hash);
    if (cached) {
      setState({ status: "success", ...cached });
      lastHashRef.current = hash;
      return;
    }

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const explanation: ExplanationResult = data.explanation;
      const source: ExplanationSource = data.source;
      if (!validateExplanation(explanation) || (source !== "qwen" && source !== "deterministic")) {
        throw new Error("Invalid explanation response");
      }

      // Cache the result
      explanationCache.set(hash, { explanation, source });
      lastHashRef.current = hash;
      setState({ status: "success", explanation, source });
    } catch {
      // Network error or API failure — fall back to deterministic on client
      const fallback = generateDeterministicExplanation(context);
      explanationCache.set(hash, { explanation: fallback.explanation, source: fallback.source });
      lastHashRef.current = hash;
      setState({ status: "error", explanation: fallback.explanation, source: fallback.source });
    }
  }, [result, lang, appliedRoute]);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      {/* Button + privacy note — shown when idle */}
      {state.status === "idle" && (
        <div>
          <button
            onClick={handleExplain}
            className="flex items-center gap-2 rounded-lg border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5 px-4 py-2.5 text-sm font-medium text-[var(--accent-blue)] transition-all hover:bg-[var(--accent-blue)]/10"
          >
            <Sparkles className="h-4 w-4" />
            {t("explain.button")}
          </button>
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            {t("explain.privacyNote")}
          </p>
        </div>
      )}

      {/* Loading state */}
      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-blue)]" />
          {t("explain.loading")}
        </div>
      )}

      {/* Success or error (fallback) state */}
      <AnimatePresence mode="wait">
        {(state.status === "success" || state.status === "error") && (
          <motion.div
            key="explanation-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Attribution */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-medium text-[var(--text-muted)]">
                {t("explain.sectionTitle")}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-medium",
                  state.source === "qwen"
                    ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                    : "bg-[var(--text-muted)]/10 text-[var(--text-muted)]",
                )}
              >
                {state.source === "qwen"
                  ? t("explain.qwenAttribution")
                  : t("explain.fallbackAttribution")}
              </span>
            </div>

            {/* Error message (if fallback was used due to error) */}
            {state.status === "error" && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-amber)]" />
                <span>{t("explain.error")}</span>
              </div>
            )}

            {/* Headline */}
            <h3 className="mb-2 text-base font-bold text-[var(--text-primary)]">
              {state.explanation.headline}
            </h3>

            {/* Summary */}
            <div className="mb-3">
              <p className="text-xs font-medium text-[var(--text-muted)]">{t("explain.summary")}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {state.explanation.summary}
              </p>
            </div>

            {/* Critical turning point */}
            <div className="mb-3">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                {t("explain.criticalPoint")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {state.explanation.criticalTurningPointExplanation}
              </p>
            </div>

            {/* Key insights */}
            {state.explanation.topInsights.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {t("explain.insights")}
                  </p>
                </div>
                <ul className="space-y-1">
                  {state.explanation.topInsights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      <span className="mt-0.5 text-[var(--text-muted)]">▸</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended actions */}
            {state.explanation.recommendedActions.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-[var(--accent-green)]" />
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {t("explain.actions")}
                  </p>
                </div>
                <ol className="space-y-1">
                  {state.explanation.recommendedActions.map((action, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      <span className="mt-0.5 font-medium text-[var(--accent-green)]">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 border-t border-[var(--border-subtle)] pt-2">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)]" />
              <p className="text-[10px] text-[var(--text-muted)]">
                {state.explanation.disclaimer}
              </p>
            </div>

            {/* Retry button (only on error/fallback) */}
            {state.status === "error" && (
              <button
                onClick={handleExplain}
                className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-[var(--accent-blue)] hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                {t("explain.retry")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
