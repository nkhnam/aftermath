import type { Lang } from "./i18n-types";

// ============================================================================
// AfterMath — Locale-Aware Formatters
// Centralized formatting for currency, percentages, numbers, months, etc.
// Vietnamese and English formatting follows the spec:
//   vi: "3,2 tỷ đồng", "48 triệu đồng/tháng", "6,8%", "tháng thứ N"
//   en: "VND 3.2 billion", "VND 48 million/month", "6.8%", "Month N"
// ============================================================================

/** Locale string for Intl APIs */
function localeStr(lang: Lang): string {
  return lang === "vi" ? "vi-VN" : "en-US";
}

/** Format a decimal number with locale-aware separators (vi: comma, en: period) */
export function formatDecimal(value: number, lang: Lang, decimals = 1): string {
  const locale = localeStr(lang);
  // Vietnamese uses comma as decimal separator
  return value.toLocaleString(locale, {
    minimumFractionDigits: value % 1 === 0 ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a VND currency value in short form.
 * vi: "3,2 tỷ đồng", "48 triệu đồng", "800 triệu đồng"
 * en: "VND 3.2B", "VND 48M", "VND 800M"
 */
export function formatCurrencyShort(value: number, lang: Lang): string {
  const abs = Math.abs(value);
  if (lang === "vi") {
    if (abs >= 1_000_000_000) {
      const billions = value / 1_000_000_000;
      return `${formatDecimal(billions, lang)} tỷ đồng`;
    }
    if (abs >= 1_000_000) {
      const millions = value / 1_000_000;
      return `${formatDecimal(millions, lang)} triệu đồng`;
    }
    if (abs >= 1_000) {
      const thousands = value / 1_000;
      return `${formatDecimal(thousands, lang, 0)} nghìn đồng`;
    }
    return `${formatDecimal(value, lang, 0)} đồng`;
  }
  // English
  if (abs >= 1_000_000_000) {
    return `VND ${formatDecimal(value / 1_000_000_000, lang)}B`;
  }
  if (abs >= 1_000_000) {
    return `VND ${formatDecimal(value / 1_000_000, lang)}M`;
  }
  if (abs >= 1_000) {
    return `VND ${formatDecimal(value / 1_000, lang, 0)}K`;
  }
  return `VND ${formatDecimal(value, lang, 0)}`;
}

/**
 * Format a VND currency value in compact form (for tight UI spaces).
 * vi: "3,2 tỷ", "48 triệu"
 * en: "₫3.2B", "₫48M"
 */
export function formatCurrencyCompact(value: number, lang: Lang): string {
  const abs = Math.abs(value);
  if (lang === "vi") {
    if (abs >= 1_000_000_000) {
      return `${formatDecimal(value / 1_000_000_000, lang)} tỷ`;
    }
    if (abs >= 1_000_000) {
      return `${formatDecimal(value / 1_000_000, lang)} triệu`;
    }
    if (abs >= 1_000) {
      return `${formatDecimal(value / 1_000, lang, 0)}k`;
    }
    return formatDecimal(value, lang, 0);
  }
  // English — keep the existing compact style for UI density
  if (abs >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)}B ₫`;
  }
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M ₫`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K ₫`;
  }
  return `${value.toLocaleString("en-US")} ₫`;
}

/**
 * Format a percentage from decimal (0.068 → "6.8%" en, "6,8%" vi)
 */
export function formatPctLocalized(decimal: number, lang: Lang): string {
  const pct = decimal * 100;
  const formatted = pct.toLocaleString(localeStr(lang), {
    minimumFractionDigits: pct % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return `${formatted}%`;
}

/** Format a plain number with locale separators */
export function formatNumLocalized(value: number, lang: Lang): string {
  return value.toLocaleString(localeStr(lang));
}

/** Format a multiplier (3.2 → "3.2×" en, "3,2×" vi) */
export function formatMultiplier(value: number, lang: Lang): string {
  return `${formatDecimal(value, lang)}×`;
}

/** Format a calculated month reference in the active locale. */
export function formatMonthRef(month: number, lang: Lang): string {
  return lang === "vi" ? `tháng thứ ${month}` : `Month ${month}`;
}

/** Format a month short label: en "M19", vi "T19" */
export function formatMonthShort(month: number, lang: Lang): string {
  return lang === "vi" ? `T${month}` : `M${month}`;
}

/** Format a duration in months: en "12 months", vi "12 tháng" */
export function formatMonthsDuration(months: number, lang: Lang): string {
  return lang === "vi" ? `${months} tháng` : `${months} months`;
}

/** Format a duration in years: en "20 years", vi "20 năm" */
export function formatYearsDuration(years: number, lang: Lang): string {
  return lang === "vi" ? `${years} năm` : `${years} years`;
}

/**
 * Format a value based on a format hint used in translation strings.
 * Supports: pct, cur, curCompact, num, month, months, years, x, int, plain
 */
export function formatValue(
  value: string | number,
  hint: string,
  lang: Lang,
): string {
  if (typeof value === "string") return value;
  switch (hint) {
    case "pct":
      return formatPctLocalized(value, lang);
    case "cur":
      return formatCurrencyShort(value, lang);
    case "curCompact":
      return formatCurrencyCompact(value, lang);
    case "num":
      return formatNumLocalized(value, lang);
    case "month":
      return formatMonthRef(value, lang);
    case "months":
      return formatMonthsDuration(value, lang);
    case "years":
      return formatYearsDuration(value, lang);
    case "x":
      return formatMultiplier(value, lang);
    case "int":
      return Math.round(value).toLocaleString(localeStr(lang));
    case "plain":
    default:
      return String(value);
  }
}
