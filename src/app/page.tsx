"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FinancialScenario, AnalysisResult, AppState } from "@/lib/types";
import { riskyScenario } from "@/lib/scenarios";
import { runAnalysis } from "@/lib/agents";
import { CinematicIntro } from "@/components/cinematic-intro";
import { AgentWorkflow } from "@/components/agent-workflow";
import { AftermathResult } from "@/components/aftermath-result";
import { ArchitectureView } from "@/components/architecture-view";
import { CustomScenarioForm } from "@/components/custom-scenario-form";
import { Disclaimer } from "@/components/disclaimer";
import { LanguageToggle } from "@/components/language-toggle";

const APP_STORAGE_KEY = "aftermath.session.v1";

export default function Home() {
  // ?demo=1 — skip the intro for judges / quick demos.
  const [appState, setAppState] = useState<AppState>("intro");
  const [scenario, setScenario] = useState<FinancialScenario>(riskyScenario);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  // Pre-compute the risky scenario analysis synchronously so the result
  // page is ready when needed (?demo=1 shortcut or after scenario selection).
  const [result, setResult] = useState<AnalysisResult | null>(
    () => runAnalysis(riskyScenario),
  );

  // Apply the demo shortcut after hydration so server and client markup match.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "1") return;
    const timer = window.setTimeout(() => setAppState("result"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(APP_STORAGE_KEY);
    } catch {
      // Storage is optional.
    }
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            scenario?: FinancialScenario;
            result?: AnalysisResult;
            appState?: AppState;
          };
          if (parsed.scenario) setScenario(parsed.scenario);
          if (parsed.result) setResult(parsed.result);
          if (parsed.appState === "custom" || parsed.appState === "result") setAppState(parsed.appState);
        } catch {
          localStorage.removeItem(APP_STORAGE_KEY);
        }
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || !result) return;
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
        scenario,
        result,
        appState: appState === "result" || appState === "custom" ? appState : "intro",
        selectedMode: scenario.isCustom ? "custom" : scenario.id,
      }));
    } catch {
      // The application remains functional when storage is unavailable.
    }
  }, [appState, result, scenario, storageReady]);

  const handleEnterAnalysis = useCallback(() => {
    setAppState("analyzing");
  }, []);

  const handleSelectScenario = useCallback((newScenario: FinancialScenario) => {
    setScenario(newScenario);
    setResult(runAnalysis(newScenario));
  }, []);

  const handleSelectCustom = useCallback(() => {
    setAppState("custom");
  }, []);

  const handleCustomAnalyze = useCallback((customScenario: FinancialScenario) => {
    setScenario(customScenario);
    setResult(runAnalysis(customScenario));
    setAppState("analyzing");
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setAppState("result");
  }, []);

  const handleDemo = useCallback(() => {
    setAppState("intro");
  }, []);

  const handleReplay = useCallback(() => {
    setResult(runAnalysis(scenario));
    setAppState("analyzing");
  }, [scenario]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Language toggle — always visible */}
      <div className="fixed right-4 top-4 z-[60]">
        <LanguageToggle />
      </div>
      <AnimatePresence mode="wait">
        {appState === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <CinematicIntro
              scenario={scenario}
              onEnter={handleEnterAnalysis}
              onSelectScenario={handleSelectScenario}
              onSelectCustom={handleSelectCustom}
              onDemoResult={() => setAppState("result")}
            />
          </motion.div>
        )}

        {appState === "custom" && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >
            <CustomScenarioForm
              onBack={() => setAppState("intro")}
              onAnalyze={handleCustomAnalyze}
            />
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
              onDemo={handleDemo}
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

      {!presentationMode && appState !== "intro" && appState !== "custom" && <Disclaimer />}
    </main>
  );
}
