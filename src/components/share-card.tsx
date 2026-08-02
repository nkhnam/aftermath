"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Copy, Check, X } from "lucide-react";
import type { AnalysisResult, ShareVariant } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface ShareCardProps {
  result: AnalysisResult;
  onClose: () => void;
}

const VARIANTS: {
  id: ShareVariant;
  label: string;
  width: number;
  height: number;
}[] = [
  { id: "16:9", label: "16:9", width: 640, height: 360 },
  { id: "1:1", label: "1:1", width: 480, height: 480 },
  { id: "9:16", label: "9:16", width: 360, height: 640 },
];

export function ShareCard({ result, onClose }: ShareCardProps) {
  const { t } = useT();
  const [variant, setVariant] = useState<ShareVariant>("16:9");
  const [copied, setCopied] = useState(false);

  const scoreColor =
    result.riskScore >= 70
      ? "var(--accent-red)"
      : result.riskScore >= 50
        ? "var(--accent-amber)"
        : result.riskScore >= 30
          ? "var(--accent-amber)"
          : "var(--accent-green)";

  const riskLabel =
    result.riskScore >= 70
      ? t("result.highRegret")
      : result.riskScore >= 50
        ? t("result.elevated")
        : result.riskScore >= 30
          ? t("result.manageable")
          : t("result.lowRisk");

  const scenarioLabel = t(result.scenario.labelKey ?? "custom.title");
  const currentVariant = VARIANTS.find((v) => v.id === variant)!;

  const handleCopy = async () => {
    const text = [
      `AfterMath — ${t("term.financialPreMortem")}`,
      "",
      `"${scenarioLabel}"`,
      `${t("share.copy.riskScore")}: ${result.riskScore}/100 (${riskLabel})`,
      `${t("share.copy.breakingPoint")}: ${t("timeline.month")} ${result.criticalTurningPoint}`,
      "",
      t("share.copy.question"),
      "",
      t("share.copy.tagline"),
      "",
      t("share.copy.notAdvice"),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const handleDownload = () => {
    const svg = generateSVG(result, scenarioLabel, riskLabel, t("share.breakingPoint"), t("timeline.month"), t("share.notAdvice"), scoreColor, currentVariant);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aftermath-${result.scenario.id}-${variant.replace(":", "x")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)]"
          aria-label={t("share.close")}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Social card preview */}
        <div
          className="overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-base)]"
          style={{ width: currentVariant.width, height: currentVariant.height }}
        >
          {/* Render based on variant */}
          <SocialCardContent
            result={result}
            scenarioLabel={scenarioLabel}
            riskLabel={riskLabel}
            scoreColor={scoreColor}
            variant={variant}
            width={currentVariant.width}
            height={currentVariant.height}
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col items-center gap-3">
          {/* Variant selector */}
          <div className="flex gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariant(v.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  variant === v.id
                    ? "bg-[var(--accent-amber)] text-[var(--bg-base)]"
                    : "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent-amber)]"
            >
              <Download className="h-4 w-4" />
              {t("share.download")}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent-amber)]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[var(--accent-green)]" />
                  {t("share.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t("share.copyText")}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Social card content — varies by aspect ratio
// ============================================================================

function SocialCardContent({
  result,
  scenarioLabel,
  riskLabel,
  scoreColor,
  variant,
}: {
  result: AnalysisResult;
  scenarioLabel: string;
  riskLabel: string;
  scoreColor: string;
  variant: ShareVariant;
  width: number;
  height: number;
}) {
  const { t, ts } = useT();
  const isWide = variant === "16:9";
  const isSquare = variant === "1:1";

  // Common elements
  const brand = (
    <div className="flex items-center gap-2">
      <div className="h-5 w-5 rounded-md bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-red)]" />
      <span className="text-sm font-bold tracking-tight">AfterMath</span>
    </div>
  );

  const score = (
    <div className="flex items-baseline gap-1">
      <span
        className="font-bold tabular-nums leading-none"
        style={{
          color: scoreColor,
          fontSize: isWide ? "4rem" : isSquare ? "5rem" : "4.5rem",
        }}
      >
        {result.riskScore}
      </span>
      <span className="text-lg text-[var(--text-muted)]">/100</span>
    </div>
  );

  const turningPoint = (
    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5">
      <span className="text-[10px] text-[var(--text-muted)]">{t("share.breakingPoint")}</span>
      <p className="text-sm font-bold tabular-nums">{t("timeline.month")} {result.criticalTurningPoint}</p>
    </div>
  );

  const poweredBy = (
    <span className="text-[9px] text-[var(--text-muted)]">{t("disclaimer.poweredBy")} {t("disclaimer.poweredByName")}</span>
  );

  if (isWide) {
    // 16:9 — horizontal social card (Twitter/X, LinkedIn)
    return (
      <div className="flex h-full flex-col p-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          {brand}
          <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[9px] text-[var(--text-muted)]">
            {result.scenario.isCustom ? t("share.userGenerated") : t("share.syntheticScenario")}
          </span>
        </div>

        {/* Main content — side by side */}
        <div className="flex flex-1 items-center gap-6">
          <div className="flex-1">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {t("share.decision")}
            </p>
            <p className="mb-3 text-sm font-medium">{scenarioLabel}</p>
            {score}
            <p className="mt-1 text-xs font-bold" style={{ color: scoreColor }}>
              {riskLabel}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {turningPoint}
            <div className="max-w-[200px] rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5">
              <span className="text-[10px] text-[var(--text-muted)]">{t("share.hiddenConsequence")}</span>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {ts(result.primaryExplanation)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
          {poweredBy}
          <span className="text-[9px] text-[var(--text-muted)]">
            {t("share.notAdvice")}
          </span>
        </div>
      </div>
    );
  }

  if (isSquare) {
    // 1:1 — square social card (Instagram)
    return (
      <div className="flex h-full flex-col items-center justify-between p-6 text-center">
        {/* Top */}
        <div className="flex items-center gap-2">
          {brand}
        </div>

        {/* Center — score */}
        <div className="flex flex-col items-center">
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {t("share.regretRiskScore")}
          </p>
          {score}
          <p className="mt-2 text-sm font-bold" style={{ color: scoreColor }}>
            {riskLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {scenarioLabel}
          </p>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-1.5">
          {turningPoint}
          <span className="text-[10px] text-[var(--text-muted)]">
            {t("share.seeAftermath")}
          </span>
          {poweredBy}
        </div>
      </div>
    );
  }

  // 9:16 — vertical social card (Stories, TikTok, Reels)
  return (
    <div className="flex h-full flex-col justify-between p-5">
      {/* Top */}
      <div className="flex items-center justify-between">
        {brand}
        <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[8px] text-[var(--text-muted)]">
          {result.scenario.isCustom ? t("share.userGenerated") : t("share.synthetic")}
        </span>
      </div>

      {/* Center — score */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {scenarioLabel}
        </p>
        {score}
        <p className="text-sm font-bold" style={{ color: scoreColor }}>
          {riskLabel}
        </p>
        <div className="mt-2 max-w-[260px] text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            {ts(result.primaryExplanation)}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-2">
        {turningPoint}
        <p className="text-[10px] text-[var(--text-muted)]">
          {t("share.seeAftermath")}
        </p>
        {poweredBy}
      </div>
    </div>
  );
}

// ============================================================================
// SVG generation for download
// ============================================================================

function generateSVG(
  result: AnalysisResult,
  scenarioLabel: string,
  riskLabel: string,
  breakingPointLabel: string,
  monthLabel: string,
  notAdviceLabel: string,
  scoreColor: string,
  variant: { id: ShareVariant; width: number; height: number },
): string {
  const { width: w, height: h } = variant;
  const score = result.riskScore;
  const tp = result.criticalTurningPoint;

  const brandY = 28;
  const scoreY = variant.id === "16:9" ? h * 0.5 : h * 0.4;
  const scoreSize = variant.id === "1:1" ? 64 : 48;

  // Escape XML special characters
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#07090f"/>
  <rect x="16" y="16" width="${w - 32}" height="${h - 32}" rx="12" fill="none" stroke="#1e2638" stroke-width="1"/>

  <!-- Brand -->
  <rect x="24" y="${brandY - 14}" width="16" height="16" rx="3" fill="#f5a623"/>
  <text x="46" y="${brandY}" font-family="Arial" font-size="13" font-weight="bold" fill="#f5f3ef">AfterMath</text>

  <!-- Score -->
  <text x="${w / 2}" y="${scoreY}" text-anchor="middle" font-family="Arial" font-size="${scoreSize}" font-weight="bold" fill="${scoreColor}">${score}</text>
  <text x="${w / 2}" y="${scoreY + 18}" text-anchor="middle" font-family="Arial" font-size="12" fill="#5a6378">/100 · ${esc(riskLabel)}</text>

  <!-- Scenario -->
  <text x="${w / 2}" y="${scoreY + 40}" text-anchor="middle" font-family="Arial" font-size="11" fill="#8b94a8">${esc(scenarioLabel)}</text>

  <!-- Turning point -->
  <text x="${w / 2}" y="${h - 50}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="600" fill="#f5f3ef">${esc(breakingPointLabel)}: ${esc(monthLabel)} ${tp}</text>

  <!-- Footer -->
  <text x="${w / 2}" y="${h - 24}" text-anchor="middle" font-family="Arial" font-size="8" fill="#5a6378">${esc(notAdviceLabel)}</text>
</svg>`;
}
