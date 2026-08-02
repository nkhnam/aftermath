import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as VND currency string */
export function formatVND(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)}B ₫`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M ₫`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K ₫`;
  }
  return `${value.toLocaleString("en-US")} ₫`;
}

/** Format a number as VND with full digits */
export function formatVNDfull(value: number): string {
  return `${value.toLocaleString("en-US")} ₫`;
}

/** Format a percentage from decimal (0.068 → "6.8%") */
export function formatPct(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

/** Format a raw number with thousand separators */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round to N decimal places */
export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Format months as "Month N" */
export function formatMonth(month: number): string {
  return `Month ${month}`;
}
