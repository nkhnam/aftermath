"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FinancialScenario, AnalysisResult, AppState } from "@/lib/types";
import { riskyScenario } from "@/lib/scenarios";
import { runAnalysis } from "@/lib/agents";
import { CinematicIntro } from "@/components/cinematic-intro";
import { AgentWorkflow } from "@/components/agent-workflow";
import { AftermathResult } from "@/components/aftermath-result";
import { ArchitectureView } from "@/components/architecture-view";
import { Disclaimer } from "@/components/disclaimer";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("intro");
  const [scenario, setScenario] = useState<FinancialScenario>(riskyScenario);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);

  // Pre-compute the risky scenario analysis immediately on mount
  const analysisRef = useRef<AnalysisResult | null>(null);
  useEffect(() => {
    if (!analysisRef.current) {
      analysisRef.current = runAnalysis(riskyScenario);
      setResult(analysisRef.current);
    }
  }, []);

  const handleEnterAnalysis = useCallback(() => {
    setAppState("analyzing");
  }, []);

  const handleSelectScenario = useCallback((newScenario: FinancialScenario) => {
    setScenario(newScenario);
    analysisRef.current = runAnalysis(newScenario);
    setResult(analysisRef.current);
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setAppState("result");
  }, []);

  const handleRestart = useCallback(() => {
    setAppState("intro");
    setResult(null);
    analysisRef.current = null;
    // Re-compute on next mount cycle
    setTimeout(() => {
      analysisRef.current = runAnalysis(riskyScenario);
      setResult(analysisRef.current);
    }, 100);
  }, []);

  const handleReplay = useCallback(() => {
    setResult(runAnalysis(scenario));
    setAppState("analyzing");
  }, [scenario]);

  return (
    <main className="min-h-screen flex flex-col">
      <AnimatePresence mode="wait">
        {appState === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <CinematicIntro scenario={scenario} onEnter={handleEnterAnalysis} onSelectScenario={handleSelectScenario} />
          </motion.div>
        )}

        {appState === "analyzing" && result && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >
            <AgentWorkflow
              result={result}
              onComplete={handleAnalysisComplete}
              presentationMode={presentationMode}
            />
          </motion.div>
        )}

        {appState === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >
            <AftermathResult
              result={result}
              onRestart={handleRestart}
              onReplay={handleReplay}
              presentationMode={presentationMode}
              onTogglePresentation={() => setPresentationMode((p) => !p)}
              onShowArchitecture={() => setShowArchitecture(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Architecture modal */}
      <AnimatePresence>
        {showArchitecture && (
          <ArchitectureView onClose={() => setShowArchitecture(false)} />
        )}
      </AnimatePresence>

      {!presentationMode && appState !== "intro" && <Disclaimer />}
    </main>
  );
}
