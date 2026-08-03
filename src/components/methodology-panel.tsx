"use client";

import { ExternalLink, FlaskConical } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { formatDecimal } from "@/lib/formatters";
import { useT } from "@/lib/i18n";

interface MethodologyPanelProps {
  result: AnalysisResult;
}

const SOURCES = [
  {
    key: "cfpbDti",
    href: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/",
  },
  {
    key: "fannieDti",
    href: "https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios",
  },
  {
    key: "cfpbLtv",
    href: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-loan-to-value-ratio-and-how-does-it-relate-to-my-costs-en-121/",
  },
] as const;

export function MethodologyPanel({ result }: MethodologyPanelProps) {
  const { t, lang } = useT();

  return (
    <section className="mb-8 rounded-2xl border border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[var(--accent-blue)]/10 p-2 text-[var(--accent-blue)]">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {t("method.title")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {t("method.description")}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MethodMetric
              label={t("method.dti")}
              value={`${formatDecimal(result.debtToIncomeRatio, lang, 1)}%`}
              note={t("method.dtiNote")}
            />
            <MethodMetric
              label={t("method.cashCommitment")}
              value={`${formatDecimal(result.cashCommitmentRatio, lang, 1)}%`}
              note={t("method.cashCommitmentNote")}
            />
            <MethodMetric
              label={t("method.liquidityRunway")}
              value={t("result.monthCount", {
                n: formatDecimal(result.emergencyFundRunwayMonths, lang, 1),
              })}
              note={t("method.liquidityNote")}
            />
          </div>

          <p className="mt-4 text-[10px] leading-4 text-[var(--text-muted)]">
            {t("method.indexDisclaimer")}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {SOURCES.map((source) => (
              <a
                key={source.key}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent-blue)] hover:underline"
              >
                {t(`method.source.${source.key}`)}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MethodMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]/60 p-3">
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[9px] leading-4 text-[var(--text-muted)]">{note}</p>
    </div>
  );
}
