"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Wallet,
  Search,
  Zap,
  Scale,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { AgentFinding, AgentStatus } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  FileText,
  Wallet,
  Search,
  Zap,
  Scale,
};

const STATUS_CONFIG: Record<
  AgentStatus,
  { color: string; icon: React.ReactNode; label: string }
> = {
  waiting: {
    color: "var(--text-muted)",
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Waiting",
  },
  analyzing: {
    color: "var(--accent-blue)",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    label: "Working",
  },
  completed: {
    color: "var(--accent-green)",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Finding",
  },
  warning: {
    color: "var(--accent-red)",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Warning",
  },
};

const ACCENT_COLORS: Record<string, string> = {
  amber: "var(--accent-amber)",
  red: "var(--accent-red)",
  blue: "var(--accent-blue)",
  green: "var(--accent-green)",
  slate: "var(--text-secondary)",
};

interface AgentCardProps {
  finding: AgentFinding;
  status: AgentStatus;
  index: number;
  isDecision?: boolean;
}

export function AgentCard({ finding, status, index, isDecision = false }: AgentCardProps) {
  const Icon = ICONS[finding.iconName] ?? FileText;
  const statusConfig = STATUS_CONFIG[status];
  const accent = ACCENT_COLORS[finding.accentColor] ?? "var(--text-secondary)";
  const isActive = status === "analyzing" || status === "completed" || status === "warning";
  const showContent = status === "completed" || status === "warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{
        opacity: isActive ? 1 : 0.35,
        y: 0,
        scale: isDecision && showContent ? 1.0 : 1.0,
      }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="overflow-hidden rounded-lg border bg-[var(--bg-elevated)] transition-colors"
      style={{
        borderColor: isActive
          ? status === "warning"
            ? "var(--accent-red)"
            : status === "completed"
              ? isDecision
                ? "var(--accent-red)"
                : accent
              : "var(--accent-blue)"
          : "var(--border-subtle)",
        boxShadow: isDecision && showContent ? "0 0 20px rgba(229,72,77,0.12)" : "none",
      }}
    >
      {/* Compact header — single row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{
            backgroundColor: isActive ? `${accent}15` : "var(--bg-base)",
            color: isActive ? accent : "var(--text-muted)",
          }}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDecision ? "text-sm" : "text-sm"}`}>
              {finding.agentName}
            </span>
            {isDecision && showContent && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: "var(--accent-red)",
                  color: "var(--bg-base)",
                }}
              >
                VERDICT
              </span>
            )}
          </div>
          <p className="truncate text-[10px] text-[var(--text-muted)]">
            {finding.agentRole}
          </p>
        </div>

        {/* Status badge */}
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ color: statusConfig.color, backgroundColor: `${statusConfig.color}15` }}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-[var(--border-subtle)] px-4 py-3"
          >
            {/* Finding — one-liner */}
            <p className={`mb-2 font-medium ${isDecision ? "text-sm" : "text-xs"}`}>
              {finding.finding}
            </p>

            {/* Evidence — compact inline */}
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
              {finding.evidence.map((e, i) => (
                <span
                  key={i}
                  className="text-[10px] tabular-nums text-[var(--text-secondary)]"
                >
                  {e}
                  {i < finding.evidence.length - 1 && (
                    <span className="ml-3 text-[var(--text-muted)]">·</span>
                  )}
                </span>
              ))}
            </div>

            {/* Calculation summary — monospace */}
            <div className="mb-2 rounded bg-[var(--bg-base)] px-2.5 py-1.5">
              <p className="text-[10px] tabular-nums text-[var(--text-secondary)]">
                {finding.calculationSummary}
              </p>
            </div>

            {/* Explanation + evidence count in one row */}
            <div className="flex items-center gap-3">
              <p className="flex-1 text-[10px] text-[var(--text-secondary)]">
                {finding.explanation}
              </p>
              <span className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-[var(--text-muted)]">
                <CheckCircle2 className="h-3 w-3" style={{ color: accent }} />
                {finding.evidence.length} checks
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
