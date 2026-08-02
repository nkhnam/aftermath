"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, ShieldAlert, Sparkles } from "lucide-react";
import type { FinancialScenario } from "@/lib/types";
import { riskyScenario, saferScenario } from "@/lib/scenarios";
import { useT } from "@/lib/i18n";

interface CinematicIntroProps {
  scenario: FinancialScenario;
  onEnter: () => void;
  onSelectScenario: (scenario: FinancialScenario) => void;
  onSelectCustom: () => void;
  onDemoResult: () => void;
}

type PresetId = "risky" | "safer";

export function CinematicIntro({
  scenario,
  onEnter,
  onSelectScenario,
  onSelectCustom,
  onDemoResult,
}: CinematicIntroProps) {
  const { t } = useT();
  const [step, setStep] = useState(-1);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>(
    scenario.id === saferScenario.id ? "safer" : "risky",
  );

  const introSteps = useMemo(
    () => [
      { text: t("intro.step1"), subtext: "", duration: 1600 },
      { text: t("intro.step2"), subtext: "", duration: 1600 },
      { text: t("intro.step3"), subtext: t("intro.step3Sub"), duration: 1800 },
    ],
    [t],
  );

  const selectedScenario = selectedPreset === "risky" ? riskyScenario : saferScenario;
  const isSetup = step < 0;

  const enterAnalysis = useCallback(() => {
    onSelectScenario(selectedScenario);
    setStep(0);
  }, [onSelectScenario, selectedScenario]);

  const skipIntro = useCallback(() => {
    if (step >= 0) onEnter();
  }, [onEnter, step]);

  const skipIntroRef = useRef(skipIntro);
  useEffect(() => {
    skipIntroRef.current = skipIntro;
  }, [skipIntro]);

  useEffect(() => {
    if (step < 0) return;
    if (step >= introSteps.length) {
      const timer = window.setTimeout(onEnter, 250);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => setStep((currentStep) => currentStep + 1),
      introSteps[step].duration,
    );
    return () => window.clearTimeout(timer);
  }, [introSteps, onEnter, step]);

  useEffect(() => {
    if (isSetup) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        skipIntroRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSetup]);

  const current = introSteps[Math.max(0, Math.min(step, introSteps.length - 1))];
  const isQuestion = step === 1;
  const isHook = step === 2;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg-base)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 14% 18%, rgba(59,130,246,.10), transparent 30%), radial-gradient(circle at 88% 72%, rgba(229,72,77,.09), transparent 34%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {isSetup ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55 }}
          className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-7 lg:px-10"
        >
          <header className="flex items-center justify-between pr-16 sm:pr-20">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-[10px] bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-red)] shadow-[0_10px_35px_rgba(229,72,77,.2)]" />
              <div>
                <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">AfterMath</p>
                <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {t("intro.premortem")}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
              {t("intro.transparentEngine")}
            </div>
          </header>

          <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-12">
            <section>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--accent-amber)]" aria-hidden="true" />
                  {t("intro.eyebrow")}
                </div>
                <h1 className="max-w-2xl text-[2.65rem] font-bold leading-[1.02] tracking-[-0.045em] text-[var(--text-primary)] sm:text-6xl lg:text-[4.2rem]">
                  {t("intro.headline")}{" "}
                  <span className="text-[var(--accent-amber)]">{t("intro.headlineAccent")}</span>
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7">
                  {t("intro.valueProp")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="mt-9 hidden rounded-2xl border border-[var(--border-subtle)] bg-[rgba(13,17,25,.76)] p-5 backdrop-blur sm:block sm:p-6"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {t("intro.decisionTimeline")}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t("intro.syntheticPreview")}</p>
                </div>
                <div className="relative grid grid-cols-3 gap-3">
                  <div className="absolute left-[10%] right-[10%] top-2 h-px bg-gradient-to-r from-[var(--accent-green)] via-[var(--accent-amber)] to-[var(--accent-red)]" />
                  <TimelinePoint color="var(--accent-green)" label={t("intro.today")} value={t("intro.looksAffordable")} />
                  <TimelinePoint color="var(--accent-amber)" label={t("intro.month13")} value={t("intro.rateReset")} />
                  <TimelinePoint color="var(--accent-red)" label={t("intro.month19")} value={t("intro.breakingPoint")} />
                </div>
              </motion.div>
            </section>

            <motion.section
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.55 }}
              className="rounded-3xl border border-[var(--border-subtle)] bg-[rgba(13,17,25,.92)] p-5 shadow-[0_30px_100px_rgba(0,0,0,.28)] backdrop-blur sm:p-7"
              aria-labelledby="scenario-heading"
            >
              <div className="mb-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                  {t("intro.stepLabel")}
                </p>
                <h2 id="scenario-heading" className="mt-2 text-xl font-semibold tracking-tight">
                  {t("intro.chooseScenario")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t("intro.chooseHint")}</p>
              </div>

              <div className="space-y-3" role="radiogroup" aria-label={t("intro.ariaSelect")}>
                <PresetCard
                  selected={selectedPreset === "risky"}
                  onSelect={() => setSelectedPreset("risky")}
                  accent="var(--accent-red)"
                  badge={t("intro.highRisk")}
                  title={t("intro.riskyApt")}
                  description={t("intro.riskyDesc")}
                  score={t("intro.riskyScore")}
                />
                <PresetCard
                  selected={selectedPreset === "safer"}
                  onSelect={() => setSelectedPreset("safer")}
                  accent="var(--accent-green)"
                  badge={t("intro.lowerRisk")}
                  title={t("intro.saferApt")}
                  description={t("intro.saferDesc")}
                  score={t("intro.saferScore")}
                />
              </div>

              <button
                type="button"
                onClick={enterAnalysis}
                className="group mt-5 flex w-full items-center justify-between rounded-xl bg-[var(--text-primary)] px-4 py-3.5 text-left text-sm font-semibold text-[var(--bg-base)] transition-transform hover:-translate-y-0.5"
              >
                <span>
                  {t("intro.revealAftermath")}
                  <span className="ml-2 font-mono text-[10px] font-normal opacity-55">
                    {selectedPreset === "risky" ? "≈81/100" : "≈34/100"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onSelectCustom}
                className="group mt-3 flex w-full items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-left transition-colors hover:border-[var(--accent-blue)]/60 hover:bg-[var(--accent-blue)]/[0.04]"
              >
                <span>
                  <span className="block text-sm font-medium text-[var(--text-primary)]">{t("intro.customScenario")}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{t("intro.customShort")}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                <p className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                  <Check className="h-3 w-3 text-[var(--accent-green)]" aria-hidden="true" />
                  {t("intro.noFinancialData")}
                </p>
                <button
                  type="button"
                  onClick={onDemoResult}
                  className="text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {t("intro.viewDemoResult")} →
                </button>
              </div>
            </motion.section>
          </main>

          <footer className="flex items-center justify-between gap-4 text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <span>{t("intro.poweredBy")}</span>
            <span className="hidden sm:inline">{t("intro.notAdvice")}</span>
          </footer>
        </motion.div>
      ) : (
        <div
          className="relative flex min-h-screen cursor-pointer items-center justify-center px-6 text-center"
          onClick={skipIntro}
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute h-[560px] w-[560px] rounded-full"
            style={{
              background: isHook
                ? "radial-gradient(circle, rgba(229,72,77,.12) 0%, transparent 68%)"
                : isQuestion
                  ? "radial-gradient(circle, rgba(245,166,35,.10) 0%, transparent 68%)"
                  : "radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 68%)",
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <AnimatePresence mode="wait">
            {step < introSteps.length && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 18, filter: "blur(7px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(7px)" }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="relative z-10 flex max-w-3xl flex-col items-center"
              >
                <Sparkles className="mb-6 h-5 w-5 text-[var(--accent-amber)]" aria-hidden="true" />
                <h1
                  className="text-4xl font-bold leading-tight tracking-[-0.035em] sm:text-6xl"
                  style={{
                    color: isHook
                      ? "var(--accent-red)"
                      : isQuestion
                        ? "var(--accent-amber)"
                        : "var(--text-primary)",
                  }}
                >
                  {current.text}
                </h1>
                {current.subtext && (
                  <p className="mt-4 max-w-md text-sm text-[var(--text-secondary)] sm:text-base">
                    {current.subtext}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="fixed bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-4">
            <div className="flex items-center gap-2" aria-hidden="true">
              {introSteps.map((_, index) => (
                <div
                  key={index}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: index === step ? "28px" : "6px",
                    backgroundColor:
                      index <= step ? "var(--accent-amber)" : "var(--border-strong)",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                skipIntro();
              }}
              className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              {t("intro.skipAnimation")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelinePoint({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="relative text-left">
      <div
        className="relative z-10 mb-4 h-4 w-4 rounded-full border-[5px] border-[var(--bg-elevated)] shadow-[0_0_0_1px_var(--border-strong)]"
        style={{ backgroundColor: color }}
      />
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)] sm:text-xs">{value}</p>
    </div>
  );
}

function PresetCard({
  selected,
  onSelect,
  accent,
  badge,
  title,
  description,
  score,
}: {
  selected: boolean;
  onSelect: () => void;
  accent: string;
  badge: string;
  title: string;
  description: string;
  score: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all"
      style={{
        borderColor: selected ? accent : "var(--border-subtle)",
        background: selected ? `color-mix(in srgb, ${accent} 7%, var(--bg-card-solid))` : "var(--bg-card-solid)",
      }}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: accent }} />}
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: selected ? accent : "var(--border-strong)" }}
      >
        {selected && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          <span className="shrink-0 font-mono text-[10px]" style={{ color: accent }}>
            {score}
          </span>
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">{description}</span>
        <span className="mt-2 block text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
          {badge}
        </span>
      </span>
    </button>
  );
}
