"use client";

import { createContext, useContext, useState, useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { Lang, StructuredOutput, StructuredEvidence } from "./i18n-types";
import { formatValue } from "./formatters";
import { en } from "./i18n-en";
import { vi } from "./i18n-vi";

// ============================================================================
// AfterMath — i18n System
// Two languages: English (en) and Vietnamese (vi)
// - Browser language detection (vi* → Vietnamese, else English)
// - localStorage persistence
// - HTML lang attribute updates
// - Typed interpolation: {key:hint} where hint = pct|cur|curCompact|num|month|months|years|x|int|t|plain
// - Structured output rendering via ts()
// ============================================================================

export type { Lang } from "./i18n-types";
export type { StructuredOutput, StructuredEvidence } from "./i18n-types";

const translations: Record<Lang, Record<string, string>> = { en, vi };
const STORAGE_KEY = "aftermath-lang";
const LANG_EVENT = "aftermath-lang-change";

// ── useSyncExternalStore: read language from localStorage/browser ──

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANG_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANG_EVENT, callback);
  };
}

function getSnapshot(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "vi") return stored;
  } catch {
    // localStorage may be unavailable
  }
  return "vi";
}

function getServerSnapshot(): Lang {
  return "vi";
}

// ── Interpolation ──

/** Regex to match {key} or {key:hint} patterns */
const INTERP_REGEX = /\{(\w+)(?::(\w+))?\}/g;

/**
 * Interpolate a template string with values and format hints.
 * Supports {key} (plain) and {key:hint} (locale-formatted).
 * The `t:` hint translates the value as a translation key.
 */
function interpolate(
  template: string,
  values: Record<string, string | number> | undefined,
  lang: Lang,
): string {
  if (!values) return template;
  return template.replace(INTERP_REGEX, (match, key: string, hint: string | undefined) => {
    const value = values[key];
    if (value === undefined) return match;
    if (hint === "t") {
      // Translate the string value as a translation key
      return translations[lang][String(value)] ?? translations.en[String(value)] ?? String(value);
    }
    if (hint) {
      return formatValue(value, hint, lang);
    }
    return String(value);
  });
}

// ── Context ──

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Simple translation with optional interpolation params */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Structured output translation (type + values) */
  ts: (output: StructuredOutput, suffix?: string) => string;
  /** Translate an array of structured evidence items */
  tsEvidence: (evidence: StructuredEvidence[]) => string[];
  /** Translate a label key (e.g. "riskfactor.{id}.label") */
  tLabel: (prefix: string, id: string, suffix: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "vi",
  setLang: () => {},
  t: (key) => key,
  ts: (output) => output.type,
  tsEvidence: () => [],
  tLabel: (_p, id) => id,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore handles SSR/CSR transition:
  // - Server: returns "en" (getServerSnapshot)
  // - Client hydration: returns "en" (to match server)
  // - After hydration: returns detected language (getSnapshot)
  const detectedLang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [overrideLang, setOverrideLang] = useState<Lang | null>(null);
  const lang = overrideLang ?? detectedLang;

  // Update HTML lang attribute when language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Update document title and meta description when language changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const title = translations[lang]["meta.title"] ?? translations.en["meta.title"];
    const desc = translations[lang]["meta.description"] ?? translations.en["meta.description"];
    if (document.title !== title) document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", translations[lang]["meta.ogTitle"] ?? translations.en["meta.ogTitle"]);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", translations[lang]["meta.ogDescription"] ?? translations.en["meta.ogDescription"]);
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    setOverrideLang(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      // Dispatch custom event so useSyncExternalStore updates in the same tab
      window.dispatchEvent(new Event(LANG_EVENT));
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = translations[lang][key] ?? translations.en[key] ?? key;
      if (params) {
        text = interpolate(text, params, lang);
      }
      return text;
    },
    [lang],
  );

  const ts = useCallback(
    (output: StructuredOutput, suffix?: string): string => {
      const key = suffix ? `${output.type}.${suffix}` : output.type;
      let text = translations[lang][key] ?? translations.en[key] ?? key;
      text = interpolate(text, output.values, lang);
      return text;
    },
    [lang],
  );

  const tsEvidence = useCallback(
    (evidence: StructuredEvidence[]): string[] => {
      return evidence.map((e) => {
        let text = translations[lang][e.type] ?? translations.en[e.type] ?? e.type;
        text = interpolate(text, e.values, lang);
        return text;
      });
    },
    [lang],
  );

  const tLabel = useCallback(
    (prefix: string, id: string, suffix: string): string => {
      const key = `${prefix}.${id}.${suffix}`;
      return translations[lang][key] ?? translations.en[key] ?? key;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, ts, tsEvidence, tLabel }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const { lang, setLang, t, ts, tsEvidence, tLabel } = useContext(I18nContext);
  return { lang, setLang, t, ts, tsEvidence, tLabel };
}
