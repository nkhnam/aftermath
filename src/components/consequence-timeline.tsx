"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, AlertTriangle, Zap, Calendar, Play, Pause } from "lucide-react";
import type { ConsequenceEvent, MonthlySimulation } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { formatCurrencyCompact, formatMonthShort } from "@/lib/formatters";

interface ConsequenceTimelineProps {
  events: ConsequenceEvent[];
  criticalTurningPoint: number;
  simulation: MonthlySimulation[];
  initialFund: number;
}

const SEVERITY_CONFIG = {
  safe: { color: "var(--accent-green)", bg: "rgba(34, 197, 94, 0.06)", icon: Calendar },
  caution: { color: "var(--accent-amber)", bg: "rgba(245, 166, 35, 0.06)", icon: AlertTriangle },
  danger: { color: "var(--accent-red)", bg: "rgba(229, 72, 77, 0.08)", icon: TrendingDown },
  critical: { color: "var(--accent-red)", bg: "rgba(229, 72, 77, 0.12)", icon: Zap },
};

const DISPLAY_MONTHS = 30;
const MONTH_DURATION = 180; // ms per month
const CRITICAL_PAUSE = 2500; // pause at critical turning point

export function ConsequenceTimeline({
  events,
  criticalTurningPoint,
  simulation,
  initialFund,
}: ConsequenceTimelineProps) {
  const { t, ts, lang } = useT();
  const [currentMonth, setCurrentMonth] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [done, setDone] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReachedEndRef = useRef(false);

  // Slice simulation to display months
  const displaySim = simulation.slice(0, DISPLAY_MONTHS);

  // Auto-advance through months
  useEffect(() => {
    if (done || paused || userPaused) return;

    if (currentMonth >= DISPLAY_MONTHS) {
      if (!hasReachedEndRef.current) {
        hasReachedEndRef.current = true;
        setDone(true);
      }
      return;
    }

    const nextMonth = currentMonth + 1;

    // Check if next month is the critical turning point
    if (nextMonth === criticalTurningPoint && !showCritical) {
      const timer = setTimeout(() => {
        setShowCritical(true);
        setPaused(true);
        setCurrentMonth(nextMonth);
        // After dramatic pause, resume
        pauseTimerRef.current = setTimeout(() => {
          setPaused(false);
          setShowCritical(false);
        }, CRITICAL_PAUSE);
      }, MONTH_DURATION);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentMonth(nextMonth);
    }, MONTH_DURATION);
    return () => clearTimeout(timer);
  }, [currentMonth, paused, done, userPaused, showCritical, criticalTurningPoint]);

  // Current simulation data
  const currentSim = displaySim[Math.min(currentMonth, DISPLAY_MONTHS - 1)] ?? displaySim[0];
  const fundLevel = currentSim?.emergencyFund ?? initialFund;
  const fundPct = Math.max(0, (fundLevel / initialFund) * 100);
  const fundColor =
    fundPct > 50 ? "var(--accent-green)" : fundPct > 20 ? "var(--accent-amber)" : "var(--accent-red)";

  // Events visible so far (month <= currentMonth)
  const visibleEvents = done
    ? events
    : events.filter((e) => e.month <= currentMonth);

  // Background deterioration — darkens as months progress
  const deterioration = Math.min(currentMonth / DISPLAY_MONTHS, 1);
  const bgTint = deterioration > 0.5 ? `rgba(229, 72, 77, ${0.02 * deterioration})` : "transparent";

  const handleTogglePlay = () => {
    if (done) {
      // Restart
      setCurrentMonth(0);
      setDone(false);
      setPaused(false);
      setShowCritical(false);
    } else {
      setUserPaused(!userPaused);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 transition-colors duration-500"
      style={{ backgroundColor: bgTint ? undefined : undefined }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{t("timeline.title")}</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {done
              ? t("timeline.fullTimeline")
              : t("timeline.playing", { current: currentMonth, total: DISPLAY_MONTHS })}
          </p>
        </div>
        <button
          onClick={handleTogglePlay}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
          aria-label={done ? t("timeline.replay") : userPaused ? t("timeline.play") : t("timeline.pause")}
        >
          {done ? (
            <>
              <Play className="h-3 w-3" /> {t("timeline.replay")}
            </>
          ) : userPaused ? (
            <>
              <Play className="h-3 w-3" /> {t("timeline.play")}
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" /> {t("timeline.pause")}
            </>
          )}
        </button>
      </div>

      {/* EMERGENCY FUND DRAIN — the centerpiece */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {t("timeline.emergencyReserve")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: fundColor }}>
              {formatCurrencyCompact(fundLevel, lang)}
            </span>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {fundPct.toFixed(0)}%
            </span>
          </div>
        </div>
        {/* Drain bar */}
        <div className="relative h-8 overflow-hidden rounded-lg bg-[var(--bg-base)]">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-lg"
            style={{
              width: `${fundPct}%`,
              background: `linear-gradient(90deg, ${fundColor}40, ${fundColor})`,
            }}
            animate={{ width: `${fundPct}%` }}
            transition={{ duration: 0.15, ease: "linear" }}
          />
          {/* Critical threshold line */}
          <div
            className="absolute top-0 h-full w-0.5 bg-[var(--accent-red)]/50"
            style={{ left: `${criticalThresholdPct()}%` }}
            title={t("timeline.criticalThreshold")}
          />
          {/* Drain animation — shimmer effect */}
          {fundPct < 30 && !done && (
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(229,72,77,0.15), transparent)",
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        {/* Month indicator */}
        <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>{t("timeline.monthStart")}</span>
          <span style={{ color: currentSim?.isDisruption ? "var(--accent-red)" : "inherit" }}>
            {currentSim?.isDisruption ? t("timeline.incomeDisrupted") : t("timeline.incomeStable")}
          </span>
          <span>{t("timeline.month")} {DISPLAY_MONTHS}</span>
        </div>
      </div>

      {/* MONTH TRACK — horizontal bar with markers */}
      <div className="relative mb-6">
        <div className="flex justify-between">
          {Array.from({ length: DISPLAY_MONTHS / 3 + 1 }, (_, i) => i * 3).map((month) => (
            <div key={month} className="flex flex-col items-center">
              <div className="h-2 w-px bg-[var(--border-subtle)]" />
              <span className="mt-0.5 text-[9px] text-[var(--text-muted)]">
                {month === 0 ? formatMonthShort(1, lang) : formatMonthShort(month, lang)}
              </span>
            </div>
          ))}
        </div>
        {/* Playhead */}
        {!done && (
          <motion.div
            className="absolute -top-1 flex flex-col items-center"
            style={{ left: `${(currentMonth / DISPLAY_MONTHS) * 100}%` }}
          >
            <div className="h-3 w-3 rounded-full border-2 border-[var(--accent-amber)] bg-[var(--bg-base)]" />
            <div className="h-6 w-px bg-[var(--accent-amber)]" />
          </motion.div>
        )}
        {/* Event markers on track */}
        {events.map((event, i) => {
          const visible = done || event.month <= currentMonth;
          const config = SEVERITY_CONFIG[event.severity];
          return (
            <div
              key={i}
              className="absolute -top-1"
              style={{
                left: `${(event.month / DISPLAY_MONTHS) * 100}%`,
                opacity: visible ? 1 : 0.2,
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: visible ? config.color : "var(--border-strong)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* EVENT CARDS — appear as timeline plays */}
      <div className="space-y-3">
        <AnimatePresence>
          {visibleEvents.map((event, index) => {
            const config = SEVERITY_CONFIG[event.severity];
            const Icon = config.icon;
            const isCritical = event.month === criticalTurningPoint;
            return (
              <motion.div
                key={`${event.month}-${index}`}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative flex items-start gap-3"
              >
                {/* Marker */}
                <div
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: config.bg,
                    border: `2px solid ${config.color}`,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                  {isCritical && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${config.color}` }}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className="flex-1 rounded-lg p-3"
                  style={{ backgroundColor: config.bg }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: config.color }}
                    >
                      {t("timeline.month")} {event.month}
                    </span>
                    {isCritical && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{
                          backgroundColor: config.color,
                          color: "var(--bg-base)",
                        }}
                      >
                        {event.severity === "critical"
                          ? t("timeline.criticalTurningPoint")
                          : t("timeline.turningPoint")}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-0.5 text-sm font-semibold">
                    {t(`event.${event.eventType}.label`)}
                  </h4>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {ts(event.description)}
                  </p>

                  {/* Mini stats — inline */}
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
                    <span className="text-[var(--text-muted)]">
                      {t("timeline.payment")}:{" "}
                      <span className="tabular-nums text-[var(--text-secondary)]">
                        {formatCurrencyCompact(event.monthlyPayment, lang)}
                      </span>
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {t("timeline.cashFlow")}:{" "}
                      <span
                        className="tabular-nums"
                        style={{
                          color:
                            event.monthlyCashFlow < 0
                              ? "var(--accent-red)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {formatCurrencyCompact(event.monthlyCashFlow, lang)}
                      </span>
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {t("timeline.reserve")}:{" "}
                      <span className="tabular-nums text-[var(--text-secondary)]">
                        {formatCurrencyCompact(event.emergencyFund, lang)}
                      </span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* CRITICAL MOMENT OVERLAY — dramatic interruption */}
      <AnimatePresence>
        {showCritical && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-base)]/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Zap
                  className="mx-auto h-12 w-12"
                  style={{ color: "var(--accent-red)" }}
                />
              </motion.div>
              <h2
                className="mt-4 text-5xl font-bold tabular-nums"
                style={{ color: "var(--accent-red)" }}
              >
                {t("timeline.month")} {criticalTurningPoint}
              </h2>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                {t("timeline.breakingPoint")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("timeline.reserveBelow3")}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: fundColor }}>
                {formatCurrencyCompact(fundLevel, lang)}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Calculate the critical threshold as a percentage of initial fund */
function criticalThresholdPct(): number {
  // The critical threshold is when fund < 3 months of essential costs
  // For display, we show it at ~33% of the initial fund
  return 33;
}
