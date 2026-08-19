// src/lib/chart-theme.ts
//
// Chart colours, read from the design tokens at runtime.
//
// Recharts sets `fill` and `stroke` as SVG attributes, where `var(--token)` is
// not resolved — so the charts were fed six hardcoded Tailwind hexes
// (#16a34a, #2563eb, #3b82f6, #dc2626, #f59e0b, #94a3b8) that appear nowhere in
// the palette. The Reports page ran two competing colour systems at once, with
// two near-identical blues in the same bar chart.
//
// Resolving the tokens keeps one source of truth: change `--success` and the
// charts follow.

import { useEffect, useState } from "react";

export interface ChartTheme {
  /** Money in. */
  collected: string;
  /** Money out. */
  expenses: string;
  /** What is owed. */
  arrears: string;
  /** What was billed, before payment. */
  billed: string;
  /** Net position, and any single-series line. */
  net: string;
  /** Vacant, inactive, or "everything else". */
  neutral: string;
  grid: string;
  axis: string;
}

/**
 * Used before the first paint resolves, and if the document is unavailable.
 * Mirrors the light palette in `src/index.css`.
 */
const FALLBACK: ChartTheme = {
  collected: "hsl(155 60% 26%)",
  expenses: "hsl(34 70% 35%)",
  arrears: "hsl(356 71% 39%)",
  billed: "hsl(60 14% 30%)",
  net: "hsl(15 60% 41%)",
  neutral: "hsl(48 13% 74%)",
  grid: "hsl(48 13% 88%)",
  axis: "hsl(50 8% 38%)",
};

function readTokens(): ChartTheme {
  if (typeof window === "undefined" || typeof document === "undefined") return FALLBACK;

  const root = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string): string => {
    const raw = root.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : fallback;
  };

  return {
    collected: token("--success", FALLBACK.collected),
    expenses: token("--warning", FALLBACK.expenses),
    arrears: token("--destructive", FALLBACK.arrears),
    // Billed is a quantity rather than a state, so it takes a neutral ink
    // instead of competing with the three status colours.
    billed: token("--muted-foreground", FALLBACK.billed),
    net: token("--primary", FALLBACK.net),
    neutral: token("--border", FALLBACK.neutral),
    grid: token("--border", FALLBACK.grid),
    axis: token("--muted-foreground", FALLBACK.axis),
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    setTheme(readTokens());
  }, []);

  return theme;
}
