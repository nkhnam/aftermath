"use client";

import { useT } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang, t } = useT();

  return (
    <button
      onClick={() => setLang(lang === "vi" ? "en" : "vi")}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)]"
      aria-label={t("lang.switch")}
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="font-medium">{t(lang === "vi" ? "lang.en" : "lang.vi")}</span>
    </button>
  );
}
