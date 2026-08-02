"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, ArrowRight, RotateCcw } from "lucide-react";
import type { FinancialScenario, AnalysisResult, StressTest } from "@/lib/types";
import { applyStress, STRESS_TYPES } from "@/lib/stress-test";
import { runAnalysis } from "@/lib/agents";
import { useT } from "@/lib/i18n";
import { formatCurrencyShort, formatMonthRef } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ============================================================================
// Stress Lab — Interactive "what if" shock simulator
// Allows the user to apply one financial shock to the current scenario
// and immediately see how survivability changes. Uses immutable derived
// state — the original scenario is never mutated.
// ============================================================================

interface StressLabProps {
  scenario: FinancialScenario;
  originalResult: AnalysisResult;
}

export function StressLab({ scenario, originalResult }: StressLabProps) {
  const { t, ts, lang } = useT();
  const [selectedType, setSelectedType] = useState<StressTest["type"] | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [appliedStress, setAppliedStress] = useState<StressTest | null>(null);

  // Compute stressed result via immutable derived state
  const stressedResult = useMemo(() => {
    if (!appliedStress) return null;
    const stressedScenario = applyStress(scenario, appliedStress);
    return runAnalysis(stressedScenario);
  }, [appliedStress, scenario]);

  const severityOptions = useMemo(
    () => STRESS_TYPES.find((st) => st.type === selectedType)?.severityOptions ?? [],
    [selectedType],
  );

  const handleTypeChange = (value: string) => {
    setSelectedType((value || null) as StressTest["type"] | null);
    setSelectedValue(null);
  };

  const handleApply = () => {
    if (selectedType && selectedValue !== null) {
      setAppliedStress({ type: selectedType, value: selectedValue });
    }
  };

  const handleRemove = () => {
    setAppliedStress(null);
    setSelectedType(null);
    setSelectedValue(null);
  };

  // Determine if the stress caused a material change
  const hasMaterialChange = stressedResult
    ? Math.abs(stressedResult.riskScore - originalResult.riskScore) >= 2 ||
      stressedResult.criticalTurningPoint !== originalResult.criticalTurningPoint ||
      stressedResult.hasCriticalBreak !== originalResult.hasCriticalBreak
    : false;

  // Extract comparison metrics from a result
  function getMetrics(result: AnalysisResult) {
    const criticalMonth = result.hasCriticalBreak ? result.criticalTurningPoint : null;
    const simAtCritical = result.monthlySimulation.find(
      (s) => s.month === result.criticalTurningPoint,
    );
    return {
      riskScore: result.riskScore,
      criticalMonth,
      emergencyReserve: simAtCritical?.emergencyFund ?? result.scenario.currentSavings,
      cashFlow: simAtCritical?.monthlyCashFlow ?? 0,
      housingBurden: result.totalHousingBurden,
    };
  }

  const before = getMetrics(originalResult);
  const after = stressedResult ? getMetrics(stressedResult) : null;

  // Identify events that are new or changed in the stressed timeline
  const originalEventKeys = new Set(
    originalResult.consequenceEvents.map((e) => `${e.month}-${e.eventType}`),
  );

  const canApply = selectedType !== null && selectedValue !== null;

  const severityColors: Record<string, string> = {
    safe: "var(--accent-green)",
    caution: "var(--accent-amber)",
    danger: "var(--accent-red)",
    critical: "var(--accent-red)",
  };

  // Find the label for the applied severity
  const appliedSeverityLabel = appliedStress
    ? STRESS_TYPES.find((st) => st.type === appliedStress.type)
        ?.severityOptions.find((opt) => opt.value === appliedStress.value)?.labelKey
    : null;

  return (
    <div className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 lg:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-blue)]/10">
          <FlaskConical className="h-4 w-4 text-[var(--accent-blue)]" />
        </div>
        <div>
          <h3 className="text-sm font-bold">{t("stress.title")}</h3>
          <p className="text-xs text-[var(--text-muted)]">{t("stress.subtitle")}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!appliedStress ? (
          /* ── Selector ── */
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-[var(--text-muted)]">
                  {t("stress.selectType")}
                </label>
                <select
                  value={selectedType ?? ""}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="form-input"
                >
                  <option value="">—</option>
                  {STRESS_TYPES.map((st) => (
                    <option key={st.type} value={st.type}>
                      {t(`stress.type.${st.type}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-[var(--text-muted)]">
                  {t("stress.selectSeverity")}
                </label>
                <select
                  value={selectedValue ?? ""}
                  onChange={(e) =>
                    setSelectedValue(e.target.value ? Number(e.target.value) : null)
                  }
                  className="form-input"
                  disabled={!selectedType}
                >
                  <option value="">—</option>
                  {severityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleApply}
              disabled={!canApply}
              className={cn(
                "mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                canApply
                  ? "bg-[var(--accent-blue)] text-[var(--bg-base)] hover:bg-[var(--accent-blue)]/90"
                  : "cursor-not-allowed bg-[var(--border-subtle)] text-[var(--text-muted)]",
              )}
            >
              {t("stress.apply")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : (
          /* ── Results ── */
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Applied stress badge */}
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-[var(--accent-blue)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent-blue)]">
                {t(`stress.type.${appliedStress.type}`)}
              </span>
              {appliedSeverityLabel && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {t(appliedSeverityLabel)}
                </span>
              )}
            </div>

            {after && (
              <>
                {/* Before / After comparison table */}
                <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                  <div className="grid grid-cols-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                    <span></span>
                    <span className="text-center">{t("stress.before")}</span>
                    <span className="text-center">{t("stress.after")}</span>
                  </div>

                  <ComparisonRow
                    label={t("stress.riskScore")}
                    before={`${before.riskScore}/100`}
                    after={`${after.riskScore}/100`}
                    changed={before.riskScore !== after.riskScore}
                    afterColor={
                      after.riskScore > before.riskScore
                        ? "var(--accent-red)"
                        : "var(--accent-green)"
                    }
                  />

                  <ComparisonRow
                    label={t("stress.criticalPoint")}
                    before={
                      before.criticalMonth
                        ? t("stress.month", { n: before.criticalMonth })
                        : t("stress.none")
                    }
                    after={
                      after.criticalMonth
                        ? t("stress.month", { n: after.criticalMonth })
                        : t("stress.none")
                    }
                    changed={before.criticalMonth !== after.criticalMonth}
                    afterColor={
                      after.criticalMonth &&
                      (!before.criticalMonth ||
                        after.criticalMonth < before.criticalMonth)
                        ? "var(--accent-red)"
                        : "var(--accent-green)"
                    }
                  />

                  <ComparisonRow
                    label={t("stress.emergencyReserve")}
                    before={formatCurrencyShort(before.emergencyReserve, lang)}
                    after={formatCurrencyShort(after.emergencyReserve, lang)}
                    changed={before.emergencyReserve !== after.emergencyReserve}
                    afterColor={
                      after.emergencyReserve < before.emergencyReserve
                        ? "var(--accent-red)"
                        : "var(--accent-green)"
                    }
                  />

                  <ComparisonRow
                    label={t("stress.cashFlow")}
                    before={formatCurrencyShort(before.cashFlow, lang)}
                    after={formatCurrencyShort(after.cashFlow, lang)}
                    changed={before.cashFlow !== after.cashFlow}
                    afterColor={
                      after.cashFlow < before.cashFlow
                        ? "var(--accent-red)"
                        : "var(--accent-green)"
                    }
                  />

                  <ComparisonRow
                    label={t("stress.housingBurden")}
                    before={formatCurrencyShort(before.housingBurden, lang)}
                    after={formatCurrencyShort(after.housingBurden, lang)}
                    changed={before.housingBurden !== after.housingBurden}
                    afterColor={
                      after.housingBurden > before.housingBurden
                        ? "var(--accent-red)"
                        : "var(--accent-green)"
                    }
                  />
                </div>

                {/* No material change message */}
                {!hasMaterialChange && (
                  <p className="mb-3 text-xs italic text-[var(--text-muted)]">
                    {t("stress.noChange")}
                  </p>
                )}

                {/* Stressed timeline events */}
                {hasMaterialChange && stressedResult && (
                  <div className="mb-3">
                    <p className="mb-2 text-[10px] font-medium text-[var(--text-muted)]">
                      {t("stress.after")}
                    </p>
                    <div className="space-y-1.5">
                      {stressedResult.consequenceEvents.map((event) => {
                        const isNew = !originalEventKeys.has(
                          `${event.month}-${event.eventType}`,
                        );
                        const color =
                          severityColors[event.severity] ?? "var(--text-muted)";
                        return (
                          <div
                            key={`${event.month}-${event.eventType}`}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border px-3 py-1.5 text-xs",
                              isNew
                                ? "border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5"
                                : "border-[var(--border-subtle)]",
                            )}
                          >
                            <span
                              className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="shrink-0 font-medium tabular-nums text-[var(--text-secondary)]">
                              {formatMonthRef(event.month, lang)}
                            </span>
                            <span className="text-[var(--text-muted)]">
                              {ts(event.description)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
            >
              <RotateCcw className="h-3 w-3" />
              {t("stress.remove")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Comparison row — before/after metric with animation on changed values
// ============================================================================

function ComparisonRow({
  label,
  before,
  after,
  changed,
  afterColor,
}: {
  label: string;
  before: string;
  after: string;
  changed: boolean;
  afterColor: string;
}) {
  return (
    <div className="grid grid-cols-3 items-center border-b border-[var(--border-subtle)] px-3 py-2 last:border-b-0">
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      <span className="text-center text-xs tabular-nums text-[var(--text-secondary)]">
        {before}
      </span>
      {changed ? (
        <motion.span
          key={after}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-xs font-bold tabular-nums"
          style={{ color: afterColor }}
        >
          {after}
        </motion.span>
      ) : (
        <span className="text-center text-xs tabular-nums text-[var(--text-secondary)]">
          {after}
        </span>
      )}
    </div>
  );
}
