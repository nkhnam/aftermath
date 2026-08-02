"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Activity } from "lucide-react";
import type { AnalysisResult, AgentStatus } from "@/lib/types";
import { AgentCard } from "./agent-card";

interface AgentWorkflowProps {
  result: AnalysisResult;
  onComplete: () => void;
  presentationMode: boolean;
}

const ANALYZE_DURATION = 1200; // ms per module — faster for demo

export function AgentWorkflow({
  result,
  onComplete,
}: AgentWorkflowProps) {
  const [currentAgent, setCurrentAgent] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (currentAgent >= result.findings.length) {
      const timer = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentAgent((prev) => prev + 1);
    }, ANALYZE_DURATION);
    return () => clearTimeout(timer);
  }, [currentAgent, result.findings.length, onComplete]);

  const getAgentStatus = (index: number): AgentStatus => {
    if (index < currentAgent) {
      return result.findings[index].status;
    }
    if (index === currentAgent) {
      return "analyzing";
    }
    return "waiting";
  };

  const completedCount = Math.min(currentAgent, result.findings.length);
  const liveScore = Math.round(
    (result.riskScore * completedCount) / result.findings.length,
  );

  const isDecisionAgent = (index: number) =>
    result.findings[index]?.agentId === "decision";
  const allDone = currentAgent >= result.findings.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:py-12">
      {/* Command center header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--accent-blue)]" />
          <h2 className="text-xl font-bold tracking-tight">
            Financial Pre-Mortem Analysis
          </h2>
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-blue)]" />
            ANALYZING
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Five analysis modules processing scenario data — {result.scenario.label}
        </p>
      </div>

      {/* Compact progress bar with live score */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            Module {Math.min(currentAgent + 1, result.findings.length)} of{" "}
            {result.findings.length}
          </span>
          {allDone ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium text-[var(--accent-green)]"
            >
              Analysis complete
            </motion.span>
          ) : (
            <span className="text-xs tabular-nums text-[var(--text-muted)]">
              Risk:{" "}
              <span
                className={
                  liveScore >= 70
                    ? "text-[var(--accent-red)]"
                    : liveScore >= 50
                      ? "text-[var(--accent-amber)]"
                      : "text-[var(--text-secondary)]"
                }
              >
                {liveScore}
              </span>
              /100
            </span>
          )}
        </div>
        <div className="h-0.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-blue)] via-[var(--accent-amber)] to-[var(--accent-red)]"
            initial={{ width: 0 }}
            animate={{
              width: `${(completedCount / result.findings.length) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Agent list — compact, vertical */}
      <div className="space-y-2">
        {result.findings.map((finding, index) => (
          <AgentCard
            key={finding.agentId}
            finding={finding}
            status={getAgentStatus(index)}
            index={index}
            isDecision={isDecisionAgent(index)}
          />
        ))}
      </div>

      {/* Skip button — always available for presenter control */}
      {!allDone && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onComplete}
            className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            Skip to result →
          </button>
        </div>
      )}

      {/* Complete button — appears when all done */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex justify-center"
          >
            <button
              onClick={onComplete}
              className="group flex items-center gap-2 rounded-xl bg-[var(--accent-amber)] px-8 py-3.5 font-semibold text-[var(--bg-base)] transition-all hover:bg-[var(--accent-amber)]/90 hover:shadow-lg hover:shadow-[var(--accent-amber)]/20"
            >
              See the aftermath
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powered by Alibaba Cloud */}
      <div className="mt-8 text-center text-[10px] text-[var(--text-muted)]">
        Powered by Alibaba Cloud · Deterministic analysis engine
      </div>
    </div>
  );
}
