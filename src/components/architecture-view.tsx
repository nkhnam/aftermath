"use client";

import { motion } from "framer-motion";
import { X, Cloud, Cpu, Database, Shield, GitBranch, Zap, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

interface ArchitectureViewProps {
  onClose: () => void;
}

const ARCHITECTURE_LAYERS = [
  {
    icon: Cloud,
    titleKey: "arch.layer1.title",
    subtitleKey: "arch.layer1.subtitle",
    itemKeys: ["arch.layer1.item1", "arch.layer1.item2", "arch.layer1.item3"],
    color: "var(--accent-blue)",
  },
  {
    icon: Cpu,
    titleKey: "arch.layer2.title",
    subtitleKey: "arch.layer2.subtitle",
    itemKeys: ["arch.layer2.item1", "arch.layer2.item2", "arch.layer2.item3", "arch.layer2.item4"],
    color: "var(--accent-amber)",
  },
  {
    icon: GitBranch,
    titleKey: "arch.layer3.title",
    subtitleKey: "arch.layer3.subtitle",
    itemKeys: ["arch.layer3.item1", "arch.layer3.item2", "arch.layer3.item3"],
    color: "var(--accent-green)",
  },
  {
    icon: Database,
    titleKey: "arch.layer4.title",
    subtitleKey: "arch.layer4.subtitle",
    itemKeys: ["arch.layer4.item1", "arch.layer4.item2", "arch.layer4.item3"],
    color: "var(--accent-blue)",
  },
  {
    icon: Shield,
    titleKey: "arch.layer5.title",
    subtitleKey: "arch.layer5.subtitle",
    itemKeys: ["arch.layer5.item1", "arch.layer5.item2", "arch.layer5.item3"],
    color: "var(--accent-green)",
  },
  {
    icon: Zap,
    titleKey: "arch.layer6.title",
    subtitleKey: "arch.layer6.subtitle",
    itemKeys: ["arch.layer6.item1", "arch.layer6.item2", "arch.layer6.item3"],
    color: "var(--accent-amber)",
  },
  {
    icon: Sparkles,
    titleKey: "arch.layer7.title",
    subtitleKey: "arch.layer7.subtitle",
    itemKeys: ["arch.layer7.item1", "arch.layer7.item2", "arch.layer7.item3"],
    color: "var(--accent-blue)",
  },
];

export function ArchitectureView({ onClose }: ArchitectureViewProps) {
  const { t } = useT();
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
            <h2 className="text-xl font-bold tracking-tight">{t("arch.title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("arch.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-strong)]"
            aria-label={t("arch.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Architecture diagram — CSS-based flow */}
        <div className="px-6 py-6">
          {/* Flow diagram */}
          <div className="mb-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6">
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-between">
              <FlowNode label={t("arch.flow.userInput")} sublabel={t("arch.flow.scenario")} color="var(--accent-blue)" />
              <FlowArrow />
              <FlowNode label={t("arch.flow.engine")} sublabel={t("arch.flow.simulation")} color="var(--accent-amber)" />
              <FlowArrow />
              <FlowNode label={t("arch.flow.modules")} sublabel={t("arch.flow.sequential")} color="var(--accent-green)" />
              <FlowArrow />
              <FlowNode label={t("arch.flow.score")} sublabel="0–100" color="var(--accent-red)" />
              <FlowArrow />
              <FlowNode label={t("arch.flow.timeline")} sublabel={t("arch.flow.consequences")} color="var(--accent-amber)" />
              <FlowArrow />
              <FlowNode label={t("arch.flow.qwen")} sublabel={t("arch.flow.optional")} color="var(--accent-blue)" />
              <FlowArrow />
              <FlowNode label={t("arch.flow.explanation")} sublabel={t("arch.flow.optional")} color="var(--accent-blue)" />
            </div>
          </div>

          {/* Layer cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ARCHITECTURE_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <motion.div
                  key={layer.titleKey}
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
                      <h3 className="text-sm font-semibold">{t(layer.titleKey)}</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{t(layer.subtitleKey)}</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {layer.itemKeys.map((itemKey, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]"
                      >
                        <span className="mt-0.5 text-[var(--text-muted)]">▸</span>
                        <span>{t(itemKey)}</span>
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
            {t("arch.footer")}
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
