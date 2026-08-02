"use client";

import { useT } from "@/lib/i18n";

export function Disclaimer() {
  const { t } = useT();
  return (
    <footer className="border-t border-[var(--border-subtle)] px-6 py-3">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-[var(--text-muted)]">
          {t("disclaimer.text")}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {t("disclaimer.poweredBy")}{" "}
          <span className="font-medium text-[var(--text-secondary)]">{t("disclaimer.poweredByName")}</span>
        </p>
      </div>
    </footer>
  );
}
