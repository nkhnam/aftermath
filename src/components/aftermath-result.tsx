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
import type { AnalysisResult } from "@/lib/types";
import { runAnalysis } from "@/lib/agents";
import { formatVND, formatPct, cn } from "@/lib/utils";
import { ConsequenceTimeline } from "./consequence-timeline";
import { ShareCard } from "./share-card";

interface AftermathResultProps {
  result: AnalysisResult;
  onRestart: () => void;
  onReplay: () => void;
  presentationMode: boolean;
  onTogglePresentation: () => void;
  onShowArchitecture: () => void;
}

const STORY_BEATS = [
  { id: "dream", icon: Home, label: "The Dream" },
  { id: "affordable", icon: Eye, label: "Looks Affordable" },
  { id: "hidden", icon: Zap, label: "Hidden Change" },
  { id: "shock", icon: AlertOctagon, label: "Financial Shock" },
  { id: "breaking", icon: ShieldAlert, label: "Breaking Point" },
  { id: "escape", icon: LifeBuoy, label: "Escape Route" },
] as const;

export function AftermathResult({
  result,
  onRestart,
  onReplay,
  presentationMode,
  onTogglePresentation,
  onShowArchitecture,
}: AftermathResultProps) {
  const [showShare, setShowShare] = useState(false);
  const [saferApplied, setSaferApplied] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(true);

  // Compute safer result once on mount
  const saferResult = useMemo(() => runAnalysis(result.saferAlternative.newScenario), [result]);

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
      ? "HIGH REGRET RISK"
      : displayResult.riskScore >= 50
        ? "ELEVATED RISK"
        : displayResult.riskScore >= 30
          ? "MANAGEABLE WITH SAFEGUARDS"
          : "LOW RISK";

  const handleSaferClick = () => {
    setSaferApplied(true);
  };

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
            Exit Present
          </button>
        </div>
      ) : (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-red)]" />
            <span className="hidden font-semibold sm:inline">AfterMath</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={onShowArchitecture}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Architecture</span>
            </button>
            <button
              onClick={onTogglePresentation}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <Presentation className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Present</span>
            </button>
            <button
              onClick={onReplay}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Replay</span>
            </button>
            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] sm:px-3"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
        </div>
      )}

      {/* STORY BEAT 1: DREAM */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <BeatHeader beat={STORY_BEATS[0]} />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-2xl font-bold lg:text-3xl">
            A household is about to buy an apartment.
          </p>
          <span className="text-lg text-[var(--text-secondary)]">
            {formatVND(displayResult.scenario.propertyPrice)}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Monthly income: {formatVND(displayResult.scenario.monthlyIncome)} ·
          Savings: {formatVND(displayResult.scenario.currentSavings)} ·
          Loan: {formatVND(displayResult.scenario.loanAmount)} ({displayResult.scenario.loanTermYears} years)
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
            <span className="text-sm text-[var(--text-muted)]">Introductory rate</span>
            <p className="text-xl font-bold text-[var(--accent-green)]">
              {formatPct(displayResult.scenario.introductoryRate)}
            </p>
          </div>
          <div>
            <span className="text-sm text-[var(--text-muted)]">Monthly payment</span>
            <p className="text-xl font-bold tabular-nums">
              {formatVND(displayResult.introMonthlyPayment)}
            </p>
          </div>
          <div>
            <span className="text-sm text-[var(--text-muted)]">for first</span>
            <p className="text-xl font-bold">
              {displayResult.scenario.introductoryPeriodMonths} months
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--accent-green)]">
          Looks manageable. The bank approved it. The family is ready to sign.
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
          Month {displayResult.scenario.introductoryPeriodMonths + 1}:{" "}
          Rate resets to {formatPct(displayResult.scenario.postIntroductoryRate)}
        </p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="tabular-nums text-[var(--text-muted)] line-through">
            {formatVND(displayResult.introMonthlyPayment)}/mo
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--accent-red)]" />
          <span className="tabular-nums font-bold text-[var(--accent-red)]">
            {formatVND(displayResult.postResetMonthlyPayment)}/mo
          </span>
          <span className="rounded-full bg-[var(--accent-red)]/10 px-2 py-0.5 text-xs font-bold text-[var(--accent-red)]">
            +{displayResult.paymentIncreasePct.toFixed(0)}%
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
          Month {displayResult.scenario.incomeDisruptionStartMonth}: Income disrupted for{" "}
          {displayResult.scenario.incomeDisruptionMonths} months
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Zero income. Full expenses continue. The emergency fund starts draining.
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
              {displayResult.primaryExplanation}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)] italic">
              Score ≥70 indicates a high probability of financial regret under stress conditions.
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
              Score breakdown
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
                  EVERY CONTRIBUTION IS VISIBLE — TRANSPARENT SCORING
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
                        {factor.label}
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

      {/* STORY BEAT 6: ESCAPE ROUTE */}
      <motion.section
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
                {result.saferAlternative.explanation}
              </p>

              {/* Changes list — compact */}
              <div className="mb-4 flex flex-wrap gap-2">
                {result.saferAlternative.changes.map((change, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
                  >
                    {change}
                  </span>
                ))}
              </div>

              {/* Sensitivity ranking — which single change matters most */}
              {result.saferAlternative.sensitivityRanking && result.saferAlternative.sensitivityRanking.length > 0 && (
              <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <p className="mb-2 text-[10px] font-medium text-[var(--text-muted)]">
                  IMPACT OF EACH INDIVIDUAL CHANGE (SENSITIVITY)
                </p>
                <div className="space-y-1.5">
                  {result.saferAlternative.sensitivityRanking.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-40 shrink-0 text-xs text-[var(--text-secondary)]">
                        {item.label}
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
                  Most impactful single change: <span className="font-medium text-[var(--text-secondary)]">{result.saferAlternative.sensitivityRanking[0]?.label}</span> (reduces score by {result.saferAlternative.sensitivityRanking[0]?.reduction} points)
                </p>
              </div>
              )}

              {result.riskScore <= 40 ? (
                <div className="rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 px-6 py-4">
                  <p className="text-sm font-medium text-[var(--accent-green)]">
                    This scenario is already manageable.
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Risk score is {result.riskScore}/100 — no critical changes needed. Try the Risky Apartment preset to see the full pre-mortem analysis.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSaferClick}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent-green)] px-6 py-3 font-semibold text-[var(--bg-base)] transition-all hover:bg-[var(--accent-green)]/90 hover:shadow-lg hover:shadow-[var(--accent-green)]/20"
                >
                  Find a safer version
                  <ArrowRight className="h-4 w-4" />
                </button>
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
                newScore={saferResult?.riskScore ?? 34}
              />
              <SaferComparison originalResult={result} saferResult={saferResult} />
            </motion.div>
          )}
        </AnimatePresence>
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

function BeatHeader({
  beat,
}: {
  beat: (typeof STORY_BEATS)[number];
}) {
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
        {beat.label}
      </span>
    </div>
  );
}

// ============================================================================
// 81→34 Score Transition — the visual payoff
// ============================================================================

function SaferScoreTransition({
  oldScore,
  newScore,
}: {
  oldScore: number;
  newScore: number;
}) {
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
          Was <span className="tabular-nums font-bold text-[var(--accent-red)]">{oldScore}</span>
        </span>
        <TrendingDown className="h-5 w-5 text-[var(--accent-green)]" />
        <span className="text-sm font-bold text-[var(--accent-green)]">
          −{scoreDiff} points
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          Now{" "}
          <span className="tabular-nums font-bold text-[var(--accent-green)]">{newScore}</span>
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        Risk reduced from{" "}
        {oldScore >= 70 ? "HIGH REGRET" : "ELEVATED"} to{" "}
        {newScore >= 30 ? "MANAGEABLE" : "LOW"}
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
  if (!saferResult) return null;

  const oldScore = originalResult.riskScore;
  const newScore = saferResult.riskScore;

  const metrics: {
    label: string;
    oldValue: string;
    newValue: string;
  }[] = [
    {
      label: "Risk score",
      oldValue: `${oldScore}/100`,
      newValue: `${newScore}/100`,
    },
    {
      label: "Monthly payment",
      oldValue: formatVND(originalResult.postResetMonthlyPayment),
      newValue: formatVND(saferResult.postResetMonthlyPayment),
    },
    {
      label: "Payment increase",
      oldValue: `+${originalResult.paymentIncreasePct.toFixed(0)}%`,
      newValue: `+${saferResult.paymentIncreasePct.toFixed(0)}%`,
    },
    {
      label: "Mortgage/income",
      oldValue: `${originalResult.paymentToIncomeRatio.toFixed(0)}%`,
      newValue: `${saferResult.paymentToIncomeRatio.toFixed(0)}%`,
    },
    {
      label: "Fixed period",
      oldValue: `${originalResult.scenario.introductoryPeriodMonths} mo`,
      newValue: `${saferResult.scenario.introductoryPeriodMonths} mo`,
    },
    {
      label: "Emergency fund",
      oldValue: formatVND(originalResult.scenario.currentSavings),
      newValue: formatVND(saferResult.scenario.currentSavings),
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
