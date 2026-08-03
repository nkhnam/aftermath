"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Share2,
  Presentation,
  ArrowRight,
  TrendingDown,
  Home,
  Eye,
  Zap,
  AlertOctagon,
  LifeBuoy,
  ChevronDown,
  Cpu,
} from "lucide-react";
import type { AnalysisResult, EscapeRoute } from "@/lib/types";
import { runAnalysis } from "@/lib/agents";
import { cn } from "@/lib/utils";
import {
  formatCurrencyShort,
  formatPctLocalized,
  formatMonthRef,
  formatDecimal,
} from "@/lib/formatters";
import { ConsequenceTimeline } from "./consequence-timeline";
import { ShareCard } from "./share-card";
import { StressLab } from "./stress-lab";
import { ExplanationPanel } from "./explanation-panel";
import { MethodologyPanel } from "./methodology-panel";
import { useT } from "@/lib/i18n";

interface AftermathResultProps {
  result: AnalysisResult;
  onDemo: () => void;
  onReplay: () => void;
  presentationMode: boolean;
  onTogglePresentation: () => void;
  onShowArchitecture: () => void;
}

const STORY_BEATS = [
  { id: "dream", icon: Home, labelKey: "beat.dream" },
  { id: "affordable", icon: Eye, labelKey: "beat.affordable" },
  { id: "hidden", icon: Zap, labelKey: "beat.hidden" },
  { id: "shock", icon: AlertOctagon, labelKey: "beat.shock" },
  { id: "breaking", icon: ShieldAlert, labelKey: "beat.breaking" },
  { id: "escape", icon: LifeBuoy, labelKey: "beat.escape" },
] as const;

export function AftermathResult({
  result,
  onDemo,
  onReplay,
  presentationMode,
  onTogglePresentation,
  onShowArchitecture,
}: AftermathResultProps) {
  const { t, ts, tLabel, lang } = useT();
  const [showShare, setShowShare] = useState(false);
  const [saferApplied, setSaferApplied] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [appliedRoute, setAppliedRoute] = useState<EscapeRoute | null>(null);

  // Compute safer result once on mount
  const saferResult = useMemo(() => runAnalysis(result.saferAlternative.newScenario), [result]);

  // Compute route result when a route is applied
  const routeResult = useMemo(
    () => (appliedRoute ? runAnalysis(appliedRoute.newScenario) : null),
    [appliedRoute],
  );

  // Breaking Point always shows the risky scenario (the "before" state)
  // Escape Route handles the safer comparison separately
  const displayResult = result;

  // Animate score count-up
  useEffect(() => {
    const target = displayResult.riskScore;
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, stepDuration);
    return () => clearInterval(interval);
  }, [displayResult.riskScore]);

  const scoreColor =
    displayResult.riskScore >= 70
      ? "var(--accent-red)"
      : displayResult.riskScore >= 50
        ? "var(--accent-amber)"
        : displayResult.riskScore >= 30
          ? "var(--accent-amber)"
          : "var(--accent-green)";

  const riskLabel =
    displayResult.riskScore >= 70
      ? t("result.highRegret")
      : displayResult.riskScore >= 50
        ? t("result.elevated")
        : displayResult.riskScore >= 30
          ? t("result.manageable")
          : t("result.lowRisk");

  const handleSaferClick = () => {
    setSaferApplied(true);
  };

  const primaryRiskFactors = displayResult.riskFactors
    .filter((factor) => factor.triggered)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  return (
    <div className={cn("mx-auto max-w-4xl px-6", presentationMode ? "py-6" : "py-8 lg:py-12")}>
      {/* Top bar — minimal */}
      {presentationMode ? (
        <div className="mb-8 flex items-center justify-end">
          <button
            onClick={onTogglePresentation}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)]"
          >
            <Presentation className="h-3.5 w-3.5" />
            {t("result.exitPresent")}
          </button>
        </div>
      ) : (
        <div className="mb-8 flex items-center justify-between pt-10 sm:pt-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-red)]" />
            <span className="hidden font-semibold sm:inline">AfterMath</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDemo}
              aria-label={t("result.home")}
              title={t("result.home")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("result.home")}</span>
            </button>
            <button
              onClick={onReplay}
              aria-label={t("result.replay")}
              title={t("result.replay")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("result.replay")}</span>
            </button>
            <button
              onClick={() => setShowShare(true)}
              aria-label={t("result.share")}
              title={t("result.share")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("result.share")}</span>
            </button>
            <button
              onClick={onShowArchitecture}
              aria-label={t("result.architecture")}
              title={t("result.architecture")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("result.architecture")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Decision summary — conclusion first, evidence second */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-5 overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 sm:p-7"
        aria-labelledby="decision-summary-title"
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: scoreColor }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: scoreColor }}
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: scoreColor,
                  backgroundColor: `color-mix(in srgb, ${scoreColor} 8%, transparent)`,
                }}
              >
                {displayResult.riskScore >= 50 ? (
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {riskLabel}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t("result.decisionSummary")}
              </span>
            </div>

            <div className="mt-4 flex items-end gap-4">
              <div className="flex items-baseline gap-1">
                <span
                  className="text-6xl font-bold leading-none tracking-[-0.05em] tabular-nums sm:text-7xl"
                  style={{ color: scoreColor }}
                >
                  {displayScore}
                </span>
                <span className="text-sm text-[var(--text-muted)]">/100</span>
              </div>
              <div className="mb-1 h-10 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
              <div className="mb-0.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {t("result.criticalPoint")}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {displayResult.hasCriticalBreak
                    ? formatMonthRef(displayResult.criticalTurningPoint, lang)
                    : t("result.noCriticalBreak")}
                </p>
              </div>
            </div>

            <h1 id="decision-summary-title" className="mt-5 max-w-xl text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl">
              {displayResult.hasCriticalBreak
                ? t("result.summaryCritical", { month: displayResult.criticalTurningPoint })
                : t("result.summaryStable")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {ts(displayResult.primaryExplanation)}
            </p>

            <a
              href="#escape-route"
              className="group mt-5 flex w-full items-center justify-between rounded-xl bg-[var(--accent-green)] px-4 py-3 text-sm font-semibold text-[#06120a] transition-transform hover:-translate-y-0.5 lg:hidden"
            >
              {t("result.findSaferNow")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </a>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t("result.topReasons")}
              </p>
              <div className="space-y-2">
                {primaryRiskFactors.map((factor) => (
                  <div key={factor.id} className="flex items-start justify-between gap-4 text-xs">
                    <span className="flex items-start gap-2 text-[var(--text-secondary)]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-red)]" />
                      {tLabel("riskfactor", factor.id, "label")}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--accent-red)]">
                      +{factor.contribution}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)]/55 p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t("result.decisionNumbers")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--border-subtle)]">
                <SummaryMetric
                  label={t("result.paymentToday")}
                  value={formatCurrencyShort(displayResult.introMonthlyPayment, lang)}
                  tone="var(--accent-green)"
                />
                <SummaryMetric
                  label={t("result.paymentAfterReset")}
                  value={formatCurrencyShort(displayResult.postResetMonthlyPayment, lang)}
                  tone="var(--accent-red)"
                />
                <SummaryMetric
                  label={t("result.paymentChange")}
                  value={`+${formatDecimal(displayResult.paymentIncreasePct, lang, 0)}%`}
                  tone="var(--accent-amber)"
                />
                <SummaryMetric
                  label={t("result.reserveRunway")}
                  value={t("result.monthCount", { n: formatDecimal(displayResult.emergencyFundRunwayMonths, lang, 1) })}
                  tone="var(--text-primary)"
                />
              </div>
            </div>

            <div className="mt-5 hidden lg:block">
              <p className="mb-2 text-[10px] leading-4 text-[var(--text-muted)]">
                {t("result.nextStepHint")}
              </p>
              <a
                href="#escape-route"
                className="group flex w-full items-center justify-between rounded-xl bg-[var(--accent-green)] px-4 py-3 text-sm font-semibold text-[#06120a] transition-transform hover:-translate-y-0.5"
              >
                {t("result.findSaferNow")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      {!presentationMode && <MethodologyPanel result={displayResult} />}

      <button
        type="button"
        onClick={() => setShowDetailedAnalysis((visible) => !visible)}
        className="mb-8 flex w-full items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)]"
        aria-expanded={showDetailedAnalysis}
        aria-controls="detailed-analysis"
      >
        <span>
          <span className="block text-sm font-medium text-[var(--text-primary)]">
            {showDetailedAnalysis ? t("result.hideEvidence") : t("result.viewEvidence")}
          </span>
          <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
            {t("result.evidenceHint")}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-[var(--text-muted)] transition-transform", showDetailedAnalysis && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {showDetailedAnalysis && (
          <motion.div
            id="detailed-analysis"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >

      {/* STORY BEAT 1: DREAM */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <BeatHeader beat={STORY_BEATS[0]} />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-2xl font-bold lg:text-3xl">
            {t("beat1.title")}
          </p>
          <span className="text-lg text-[var(--text-secondary)]">
            {formatCurrencyShort(displayResult.scenario.propertyPrice, lang)}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("beat1.monthlyIncome")}: {formatCurrencyShort(displayResult.scenario.monthlyIncome, lang)} ·
          {t("beat1.savings")}: {formatCurrencyShort(displayResult.scenario.currentSavings, lang)} ·
          {t("beat1.loan")}: {formatCurrencyShort(displayResult.scenario.loanAmount, lang)} ({t("beat1.years", { n: displayResult.scenario.loanTermYears })})
        </p>
      </motion.section>

      {/* STORY BEAT 2: LOOKS AFFORDABLE */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <BeatHeader beat={STORY_BEATS[1]} />
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <span className="text-sm text-[var(--text-muted)]">{t("beat2.introRate")}</span>
            <p className="text-xl font-bold text-[var(--accent-green)]">
              {formatPctLocalized(displayResult.scenario.introductoryRate, lang)}
            </p>
          </div>
          <div>
            <span className="text-sm text-[var(--text-muted)]">{t("beat2.monthlyPayment")}</span>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrencyShort(displayResult.introMonthlyPayment, lang)}
            </p>
          </div>
          <div>
            <span className="text-sm text-[var(--text-muted)]">{t("beat2.forFirst")}</span>
            <p className="text-xl font-bold">
              {t("beat2.months", { n: displayResult.scenario.introductoryPeriodMonths })}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--accent-green)]">
          {t("beat2.manageable")}
        </p>
      </motion.section>

      {/* STORY BEAT 3: HIDDEN CHANGE */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <BeatHeader beat={STORY_BEATS[2]} />
        <p className="text-lg font-semibold text-[var(--accent-amber)]">
          {formatMonthRef(displayResult.scenario.introductoryPeriodMonths + 1, lang)}:{" "}
          {t("beat3.rateResets")} {formatPctLocalized(displayResult.scenario.postIntroductoryRate, lang)}
        </p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="tabular-nums text-[var(--text-muted)] line-through">
            {formatCurrencyShort(displayResult.introMonthlyPayment, lang)}/mo
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--accent-red)]" />
          <span className="tabular-nums font-bold text-[var(--accent-red)]">
            {formatCurrencyShort(displayResult.postResetMonthlyPayment, lang)}/mo
          </span>
          <span className="rounded-full bg-[var(--accent-red)]/10 px-2 py-0.5 text-xs font-bold text-[var(--accent-red)]">
            +{formatDecimal(displayResult.paymentIncreasePct, lang, 0)}%
          </span>
        </div>
      </motion.section>

      {/* STORY BEAT 4: FINANCIAL SHOCK */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <BeatHeader beat={STORY_BEATS[3]} />
        <p className="text-lg font-semibold text-[var(--accent-red)]">
          {formatMonthRef(displayResult.scenario.incomeDisruptionStartMonth, lang)}: {t("beat4.incomeDisrupted", { n: displayResult.scenario.incomeDisruptionMonths })}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("beat4.zeroIncome")}
        </p>
      </motion.section>

      {/* STORY BEAT 5: BREAKING POINT — TIMELINE CENTERPIECE */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <BeatHeader beat={STORY_BEATS[4]} />
        <ConsequenceTimeline
          events={displayResult.consequenceEvents}
          criticalTurningPoint={displayResult.criticalTurningPoint}
          simulation={displayResult.monthlySimulation}
          initialFund={displayResult.scenario.currentSavings}
        />

        {/* Score reveal — after timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-between rounded-2xl border p-6"
          style={{
            borderColor: `${scoreColor}40`,
            backgroundColor: `${scoreColor}08`,
          }}
        >
          <div>
            <div className="mb-1 flex items-center gap-2">
              {displayResult.riskScore >= 50 ? (
                <ShieldAlert className="h-5 w-5" style={{ color: scoreColor }} />
              ) : (
                <ShieldCheck className="h-5 w-5" style={{ color: scoreColor }} />
              )}
              <span className="text-sm font-bold tracking-wide" style={{ color: scoreColor }}>
                {riskLabel}
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {ts(displayResult.primaryExplanation)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)] italic">
              {t("result.scoreDisclaimer")}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span
                className="text-7xl font-bold tabular-nums leading-none lg:text-8xl"
                style={{ color: scoreColor }}
              >
                {displayScore}
              </span>
              <span className="text-xl text-[var(--text-muted)]">/100</span>
            </div>
            <button
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {t("result.scoreBreakdown")}
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", showScoreBreakdown && "rotate-180")}
              />
            </button>
          </div>
        </motion.div>

        {/* Score breakdown — collapsible */}
        <AnimatePresence>
          {showScoreBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <p className="mb-2 text-[10px] font-medium text-[var(--text-muted)]">
                  {t("result.transparentScoring")}
                </p>
                {displayResult.riskFactors.map((factor) => (
                  <div key={factor.id} className="flex items-center gap-3">
                    <div className="w-48 shrink-0">
                      <span
                        className={cn(
                          "text-xs",
                          factor.triggered
                            ? "text-[var(--text-secondary)]"
                            : "text-[var(--text-muted)]",
                        )}
                      >
                        {factor.triggered ? "● " : "○ "}
                        {tLabel("riskfactor", factor.id, "label")}
                      </span>
                    </div>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-base)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(factor.contribution / factor.maxContribution) * 100}%`,
                        }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: factor.triggered
                            ? "var(--accent-red)"
                            : "var(--border-strong)",
                        }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-[var(--text-muted)]">
                      +{factor.contribution}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* STRESS LAB — interactive "what if" shock simulator */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        <StressLab scenario={result.scenario} originalResult={result} />
      </motion.section>

          </motion.div>
        )}
      </AnimatePresence>

      {/* STORY BEAT 6: ESCAPE ROUTE */}
      <motion.section
        id="escape-route"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <BeatHeader beat={STORY_BEATS[5]} />
        <AnimatePresence mode="wait">
          {!saferApplied ? (
            <motion.div key="before" exit={{ opacity: 0, y: -10 }}>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                {ts(result.saferAlternative.explanation)}
              </p>

              {/* Changes list — compact */}
              <div className="mb-4 flex flex-wrap gap-2">
                {result.saferAlternative.changes.map((change, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
                  >
                    {ts(change)}
                  </span>
                ))}
              </div>

              {/* Sensitivity ranking — which single change matters most */}
              {result.saferAlternative.sensitivityRanking && result.saferAlternative.sensitivityRanking.length > 0 && (
              <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <p className="mb-2 text-[10px] font-medium text-[var(--text-muted)]">
                  {t("result.sensitivityTitle")}
                </p>
                <div className="space-y-1.5">
                  {result.saferAlternative.sensitivityRanking.map((item) => (
                    <div key={item.type} className="flex items-center gap-2">
                      <span className="w-40 shrink-0 text-xs text-[var(--text-secondary)]">
                        {t("sensitivity." + item.type)}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-base)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent-green)]"
                          style={{
                            width: `${Math.max(5, (item.reduction / 50) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-[var(--accent-green)]">
                        −{item.reduction}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                  {t("result.mostImpactful")}: <span className="font-medium text-[var(--text-secondary)]">{result.saferAlternative.sensitivityRanking[0] ? t("sensitivity." + result.saferAlternative.sensitivityRanking[0].type) : ""}</span> ({t("result.reducesScore", { n: result.saferAlternative.sensitivityRanking[0]?.reduction ?? 0 })})
                </p>
              </div>
              )}

              {!appliedRoute ? (
                <>
              {/* Escape Routes — optimizer recommendations */}
              {result.escapeRoutes && result.escapeRoutes.length > 0 && (
                <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="mb-1 text-[10px] font-medium text-[var(--text-muted)]">
                    {result.escapeRoutes.some((r) => r.isViable)
                      ? t("optimizer.heading")
                      : t("optimizer.partial")}
                  </p>
                  <p className="mb-3 text-[10px] text-[var(--text-muted)]">
                    {t("optimizer.target")}
                  </p>
                  {!result.escapeRoutes.some((r) => r.isViable) && (
                    <p className="mb-3 rounded-lg border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      {t("optimizer.noViable")}
                    </p>
                  )}
                  <div className="space-y-3">
                    {result.escapeRoutes.map((route) => (
                      <div
                        key={route.id}
                        className={cn(
                          "rounded-lg border p-3",
                          route.isSmallestChange
                            ? "border-[var(--accent-green)]/40 bg-[var(--accent-green)]/5"
                            : "border-[var(--border-subtle)]",
                        )}
                      >
                        {route.isSmallestChange && (
                          <span className="mb-1 inline-block rounded-full bg-[var(--accent-green)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent-green)]">
                            {t("optimizer.smallestChange")}
                          </span>
                        )}
                        <p className="text-xs font-medium text-[var(--text-secondary)]">
                          {ts(route.change)}
                        </p>
                        <div className="mt-1.5 space-y-0.5 text-[10px] text-[var(--text-muted)]">
                          <p><span className="font-medium text-[var(--text-secondary)]">{t("escape.route.impact")}:</span> {ts(route.impact)}</p>
                          <p><span className="font-medium text-[var(--text-secondary)]">{t("escape.route.tradeoff")}:</span> {ts(route.tradeoff)}</p>
                          <p><span className="font-medium text-[var(--text-secondary)]">{t("escape.route.why")}:</span> {ts(route.why)}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-muted)]">{t("escape.route.newScore")}</span>
                          <span className="text-sm font-bold text-[var(--accent-green)]">{route.newScore}/100</span>
                          <span className="text-[10px] text-[var(--text-muted)]">(&minus;{result.riskScore - route.newScore})</span>
                          {route.incrementsTested && (
                            <span className="ml-auto text-[9px] text-[var(--text-muted)]">
                              {t("optimizer.incrementsTested", { n: route.incrementsTested })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setAppliedRoute(route)}
                          className="mt-2 flex items-center gap-1 rounded-lg bg-[var(--accent-green)]/10 px-3 py-1.5 text-[10px] font-semibold text-[var(--accent-green)] transition-all hover:bg-[var(--accent-green)]/20"
                        >
                          {t("optimizer.apply")}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.riskScore <= 40 ? (
                <div className="rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 px-6 py-4">
                  <p className="text-sm font-medium text-[var(--accent-green)]">
                    {t("result.alreadyManageable")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {t("result.alreadyManageableDesc", { score: result.riskScore })}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSaferClick}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent-green)] px-6 py-3 font-semibold text-[var(--bg-base)] transition-all hover:bg-[var(--accent-green)]/90 hover:shadow-lg hover:shadow-[var(--accent-green)]/20"
                >
                  {t("result.findSafer")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
                </>
              ) : (
                <motion.div
                  key="route-applied"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <SaferScoreTransition
                    oldScore={result.riskScore}
                    newScore={appliedRoute.newScore}
                  />
                  {/* What changed */}
                  <div className="mb-4 rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 p-4">
                    <p className="mb-1 text-[10px] font-medium text-[var(--text-muted)]">
                      {t("optimizer.applied")}
                    </p>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      {ts(appliedRoute.change)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {ts(appliedRoute.impact)}
                    </p>
                    {routeResult && (
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                        <span>
                          {t("optimizer.newCriticalMonth")}:{" "}
                          {appliedRoute.newCriticalMonth
                            ? t("stress.month", { n: appliedRoute.newCriticalMonth })
                            : t("optimizer.noCritical")}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Updated timeline */}
                  {routeResult && (
                    <div className="mb-4">
                      <ConsequenceTimeline
                        events={routeResult.consequenceEvents}
                        criticalTurningPoint={routeResult.criticalTurningPoint}
                        simulation={routeResult.monthlySimulation}
                        initialFund={routeResult.scenario.currentSavings}
                      />
                    </div>
                  )}
                  {/* Undo button */}
                  <button
                    onClick={() => setAppliedRoute(null)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("optimizer.undo")}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SaferScoreTransition
                oldScore={result.riskScore}
                newScore={saferResult?.riskScore ?? result.riskScore}
              />
              <SaferComparison originalResult={result} saferResult={saferResult} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Qwen Explanation Layer — optional, user-initiated */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-8"
      >
        <ExplanationPanel result={result} appliedRoute={appliedRoute} />
      </motion.section>

      {/* Share card modal */}
      <AnimatePresence>
        {showShare && (
          <ShareCard result={saferApplied && saferResult ? saferResult : result} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Beat header — compact story beat label
// ============================================================================

function SummaryMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-[var(--bg-card-solid)] p-3 sm:p-4">
      <p className="text-[9px] leading-3 text-[var(--text-muted)]">{label}</p>
      <p className="mt-1.5 text-base font-semibold tabular-nums sm:text-lg" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

function BeatHeader({
  beat,
}: {
  beat: (typeof STORY_BEATS)[number];
}) {
  const { t } = useT();
  const Icon = beat.icon;
  const beatColors: Record<string, string> = {
    dream: "var(--accent-blue)",
    affordable: "var(--accent-green)",
    hidden: "var(--accent-amber)",
    shock: "var(--accent-red)",
    breaking: "var(--accent-red)",
    escape: "var(--accent-green)",
  };
  const color = beatColors[beat.id] ?? "var(--text-muted)";
  return (
    <div className="mb-3 flex items-center gap-2">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {t(beat.labelKey)}
      </span>
    </div>
  );
}

// ============================================================================
// Dynamic score transition for an applied safer scenario.
// ============================================================================

function SaferScoreTransition({
  oldScore,
  newScore,
}: {
  oldScore: number;
  newScore: number;
}) {
  const { t } = useT();
  const [displayOld, setDisplayOld] = useState(oldScore);
  const [transitioning, setTransitioning] = useState(true);
  const scoreDiff = oldScore - newScore;

  useEffect(() => {
    // Animate old score down to new score
    const duration = 1500;
    const steps = 50;
    const stepDuration = duration / steps;
    const decrement = (oldScore - newScore) / steps;
    let current = oldScore;

    const interval = setInterval(() => {
      current -= decrement;
      if (current <= newScore) {
        setDisplayOld(newScore);
        setTransitioning(false);
        clearInterval(interval);
      } else {
        setDisplayOld(Math.round(current));
      }
    }, stepDuration);
    return () => clearInterval(interval);
  }, [oldScore, newScore]);

  const currentScore = transitioning ? displayOld : newScore;
  const currentColor =
    currentScore >= 70
      ? "var(--accent-red)"
      : currentScore >= 50
        ? "var(--accent-amber)"
        : currentScore >= 30
          ? "var(--accent-amber)"
          : "var(--accent-green)";

  return (
    <div className="mb-6 flex flex-col items-center gap-4 py-6">
      <motion.div
        animate={
          transitioning
            ? { scale: [1, 1.03, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="flex items-baseline gap-2">
          <span
            className="text-7xl font-bold tabular-nums leading-none transition-colors duration-300"
            style={{ color: currentColor }}
          >
            {currentScore}
          </span>
          <span className="text-2xl text-[var(--text-muted)]">/100</span>
        </div>
      </motion.div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-muted)]">
          {t("result.was")} <span className="tabular-nums font-bold text-[var(--accent-red)]">{oldScore}</span>
        </span>
        <TrendingDown className="h-5 w-5 text-[var(--accent-green)]" />
        <span className="text-sm font-bold text-[var(--accent-green)]">
          −{scoreDiff} {t("result.points")}
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          {t("result.now")}{" "}
          <span className="tabular-nums font-bold text-[var(--accent-green)]">{newScore}</span>
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        {t("result.riskReduced", { from: oldScore >= 70 ? t("result.highRegret") : t("result.elevated"), to: newScore >= 30 ? t("result.manageable") : t("result.lowRisk") })}
      </p>
    </div>
  );
}

// ============================================================================
// Safer comparison — before/after metrics
// ============================================================================

function SaferComparison({
  originalResult,
  saferResult,
}: {
  originalResult: AnalysisResult;
  saferResult: AnalysisResult | null;
}) {
  const { t, lang } = useT();
  if (!saferResult) return null;

  const oldScore = originalResult.riskScore;
  const newScore = saferResult.riskScore;

  const metrics: {
    label: string;
    oldValue: string;
    newValue: string;
  }[] = [
    {
      label: t("metric.riskScore"),
      oldValue: `${oldScore}/100`,
      newValue: `${newScore}/100`,
    },
    {
      label: t("metric.monthlyPayment"),
      oldValue: formatCurrencyShort(originalResult.postResetMonthlyPayment, lang),
      newValue: formatCurrencyShort(saferResult.postResetMonthlyPayment, lang),
    },
    {
      label: t("metric.paymentIncrease"),
      oldValue: `+${formatDecimal(originalResult.paymentIncreasePct, lang, 0)}%`,
      newValue: `+${formatDecimal(saferResult.paymentIncreasePct, lang, 0)}%`,
    },
    {
      label: t("metric.mortgageIncome"),
      oldValue: `${formatDecimal(originalResult.paymentToIncomeRatio, lang, 0)}%`,
      newValue: `${formatDecimal(saferResult.paymentToIncomeRatio, lang, 0)}%`,
    },
    {
      label: t("metric.fixedPeriod"),
      oldValue: `${originalResult.scenario.introductoryPeriodMonths} ${t("metric.mo")}`,
      newValue: `${saferResult.scenario.introductoryPeriodMonths} ${t("metric.mo")}`,
    },
    {
      label: t("metric.emergencyFund"),
      oldValue: formatCurrencyShort(originalResult.scenario.currentSavings, lang),
      newValue: formatCurrencyShort(saferResult.scenario.currentSavings, lang),
    },
  ];

  return (
    <div>
      {/* Metrics comparison — compact */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2"
          >
            <p className="text-[10px] text-[var(--text-muted)]">{m.label}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs tabular-nums text-[var(--text-muted)] line-through">
                {m.oldValue}
              </span>
              <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
              <span className="text-xs font-medium tabular-nums text-[var(--accent-green)]">
                {m.newValue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
