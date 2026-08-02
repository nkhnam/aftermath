"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FinancialScenario } from "@/lib/types";
import { riskyScenario, saferScenario } from "@/lib/scenarios";

interface CinematicIntroProps {
  scenario: FinancialScenario;
  onEnter: () => void;
  onSelectScenario: (scenario: FinancialScenario) => void;
}

const INTRO_STEPS = [
  {
    text: "This home looks affordable today.",
    subtext: "",
    duration: 2500,
  },
  {
    text: "What happens after you sign?",
    subtext: "",
    duration: 2500,
  },
  {
    text: "But what about month 19?",
    subtext: "AfterMath reveals the hidden consequences",
    duration: 2500,
  },
];

export function CinematicIntro({ onEnter, onSelectScenario }: CinematicIntroProps) {
  const [step, setStep] = useState(-1); // -1 = preset selector, 0-2 = intro steps
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (step < 0) return; // preset selector doesn't auto-advance
    if (step >= INTRO_STEPS.length) {
      const timer = setTimeout(onEnter, 400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStep((s) => s + 1), INTRO_STEPS[step].duration);
    return () => clearTimeout(timer);
  }, [step, onEnter]);

  const handleSkip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    if (step < 0) {
      // If on preset selector, just start with default (risky)
      onSelectScenario(riskyScenario);
      setStep(0);
    } else {
      onEnter();
    }
  }, [skipped, step, onEnter, onSelectScenario]);

  const handlePresetSelect = useCallback((scenario: FinancialScenario) => {
    onSelectScenario(scenario);
    setStep(0);
  }, [onSelectScenario]);

  // Store handleSkip in a ref to avoid useEffect dependency issues
  const handleSkipRef = useRef(handleSkip);
  useEffect(() => {
    handleSkipRef.current = handleSkip;
  }, [handleSkip]);

  // Keyboard: Space/Enter to skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        handleSkipRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // Empty dependency array - stable

  const current = INTRO_STEPS[Math.max(0, Math.min(step, INTRO_STEPS.length - 1))];
  const isQuestion = step === 1;
  const isHook = step === 2;
  const isPresetSelector = step < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[var(--bg-base)]"
      onClick={isPresetSelector ? undefined : handleSkip}
      role="button"
      aria-label={isPresetSelector ? "Select a scenario" : "Skip intro and start analysis"}
      tabIndex={0}
    >
      {/* Ambient glow */}
      <motion.div
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full"
        style={{
          background: isHook
            ? "radial-gradient(circle, rgba(229,72,77,0.08) 0%, transparent 70%)"
            : isQuestion
              ? "radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {isPresetSelector ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            {/* Brand mark */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8 flex items-center gap-2"
            >
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-red)]" />
              <span className="text-sm font-semibold tracking-widest text-[var(--text-muted)]">
                AFTERMATH
              </span>
            </motion.div>

            <h1 className="mb-2 text-4xl font-bold leading-tight tracking-tight text-[var(--text-primary)] lg:text-5xl">
              See the financial aftermath
              <br />
              <span className="text-[var(--accent-amber)]">before you sign.</span>
            </h1>
            <p className="mb-10 max-w-md text-sm text-[var(--text-secondary)]">
              Choose a scenario to analyze
            </p>

            {/* Preset cards */}
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePresetSelect(riskyScenario)}
                className="flex w-64 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 text-left transition-colors hover:border-[var(--accent-red)]/50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--accent-red)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-red)]">
                    High Risk
                  </span>
                </div>
                <p className="mb-1 text-sm font-semibold">Risky Apartment</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Teaser-rate mortgage, thin savings, high hidden costs
                </p>
                <p className="mt-3 text-[10px] text-[var(--text-muted)]">
                  Score ~81/100
                </p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePresetSelect(saferScenario)}
                className="flex w-64 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 text-left transition-colors hover:border-[var(--accent-green)]/50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-green)]">
                    Lower Risk
                  </span>
                </div>
                <p className="mb-1 text-sm font-semibold">Safer Apartment</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Longer fixed-rate, larger fund, lower hidden costs
                </p>
                <p className="mt-3 text-[10px] text-[var(--text-muted)]">
                  Score ~34/100
                </p>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {step < INTRO_STEPS.length && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                <h1
                  className={`font-bold leading-tight tracking-tight ${
                    isHook
                      ? "text-4xl lg:text-5xl"
                      : "text-4xl lg:text-6xl"
                  }`}
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
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 max-w-md text-sm text-[var(--text-secondary)] lg:text-base"
                  >
                    {current.subtext}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Progress dots */}
        {!isPresetSelector && (
          <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {INTRO_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "24px" : "6px",
                  backgroundColor:
                    i <= step ? "var(--accent-amber)" : "var(--border-strong)",
                }}
              />
            ))}
          </div>
        )}

        {/* Skip hint */}
        {!isPresetSelector && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 right-6 text-[10px] text-[var(--text-muted)]"
          >
            Press Space to skip
          </motion.p>
        )}
      </div>

      {/* Powered by Alibaba Cloud — subtle footer */}
      <div className="absolute bottom-4 left-6 text-[10px] text-[var(--text-muted)]">
        Powered by Alibaba Cloud
      </div>
    </div>
  );
}
