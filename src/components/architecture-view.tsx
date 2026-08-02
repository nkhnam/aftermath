"use client";

import { motion } from "framer-motion";
import { X, Cloud, Cpu, Database, Shield, GitBranch, Zap } from "lucide-react";

interface ArchitectureViewProps {
  onClose: () => void;
}

const ARCHITECTURE_LAYERS = [
  {
    icon: Cloud,
    title: "Alibaba Cloud Compute",
    subtitle: "Next.js 16 · Turbopack · Static prerendering",
    items: [
      "Fully static prerendered pages — zero server-side computation",
      "Client-side deterministic computation — zero API latency",
      "Deployed on Vercel edge network with Alibaba Cloud infrastructure",
    ],
    color: "var(--accent-blue)",
  },
  {
    icon: Cpu,
    title: "Deterministic Engine Layer",
    subtitle: "Pure TypeScript financial simulation",
    items: [
      "Amortization formula: P = L × r × (1+r)ⁿ / ((1+r)ⁿ - 1)",
      "240-month cashflow simulation (20-year loan term)",
      "7-factor transparent risk scoring (0–100 scale)",
      "Zero randomness — every result is reproducible",
    ],
    color: "var(--accent-amber)",
  },
  {
    icon: GitBranch,
    title: "Analysis Modules",
    subtitle: "Five deterministic modules — no LLM dependency",
    items: [
      "Terms → Cashflow → Hidden Cost → Shock → Decision Engine",
      "Each module: finding, evidence, calculation summary, transparency",
      "Decision Engine synthesizes all findings into a transparent score",
    ],
    color: "var(--accent-green)",
  },
  {
    icon: Database,
    title: "Data Layer",
    subtitle: "Synthetic scenarios — no real financial data",
    items: [
      "Two preset scenarios: Risky (score 81) and Safer (score 34)",
      "All amounts in VND (Vietnamese Dong)",
      "No database, no authentication, no external storage",
    ],
    color: "var(--accent-blue)",
  },
  {
    icon: Shield,
    title: "Safety & Ethics",
    subtitle: "Transparent by design",
    items: [
      "Every score contribution is visible to the user",
      "Not financial advice — synthetic demonstration only",
      "No predictions, no ML, no opacity",
    ],
    color: "var(--accent-green)",
  },
  {
    icon: Zap,
    title: "Performance",
    subtitle: "Sub-100ms analysis",
    items: [
      "Full 240-month simulation runs in <5ms",
      "All 5 analysis modules computed synchronously",
      "Framer Motion 60fps animations with GPU acceleration",
    ],
    color: "var(--accent-amber)",
  },
];

export function ArchitectureView({ onClose }: ArchitectureViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm lg:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-3xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-base)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">System Architecture</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Powered by Alibaba Cloud · Deterministic by design
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-strong)]"
            aria-label="Close architecture view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Architecture diagram — CSS-based flow */}
        <div className="px-6 py-6">
          {/* Flow diagram */}
          <div className="mb-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6">
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-between">
              <FlowNode label="User Input" sublabel="Scenario" color="var(--accent-blue)" />
              <FlowArrow />
              <FlowNode label="Engine" sublabel="Simulation" color="var(--accent-amber)" />
              <FlowArrow />
              <FlowNode label="Modules" sublabel="5 sequential" color="var(--accent-green)" />
              <FlowArrow />
              <FlowNode label="Score" sublabel="0–100" color="var(--accent-red)" />
              <FlowArrow />
              <FlowNode label="Timeline" sublabel="Consequences" color="var(--accent-amber)" />
            </div>
          </div>

          {/* Layer cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ARCHITECTURE_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <motion.div
                  key={layer.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${layer.color}15`, color: layer.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{layer.title}</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{layer.subtitle}</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {layer.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]"
                      >
                        <span className="mt-0.5 text-[var(--text-muted)]">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-6 py-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            AfterMath — AI Financial Pre-Mortem · Powered by Alibaba Cloud ·
            Synthetic hackathon scenario · Not financial advice
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FlowNode({
  label,
  sublabel,
  color,
}: {
  label: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-lg border px-4 py-3 text-center"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
    >
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px] text-[var(--text-muted)]">{sublabel}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center text-[var(--text-muted)]">
      <span className="hidden lg:block">→</span>
      <span className="lg:hidden">↓</span>
    </div>
  );
}
