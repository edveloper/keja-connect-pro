// src/components/dashboard/StatsCard.tsx
import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Variant = "default" | "success" | "danger";
type Format = "auto" | "number" | "currency" | "percent" | "compact";

interface StatsCardProps {
  label: string;
  value: string | number | null | undefined;
  icon: LucideIcon;
  variant?: Variant;
  className?: string;
  loading?: boolean;
  /** How to format numeric values. Default "auto" chooses currency for numbers that look like money. */
  format?: Format;
  /** Optional currency code used when format is "currency" or when auto-detect chooses currency */
  currency?: string;
  /** Optional locale for Intl.NumberFormat. Defaults to en-KE for consistent KES formatting. */
  locale?: string;
}

/**
 * StatsCard
 * - Handles null/undefined values and loading state
 * - Normalizes numbers and formats them using Intl.NumberFormat
 * - Chooses responsive font sizes based on rendered text length
 * - Adds accessibility attributes and a title with the full value
 * - New: accepts `locale` prop and visually highlights negative numeric values
 */
export const StatsCard: React.FC<StatsCardProps> = React.memo(function StatsCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  className,
  loading = false,
  format = "auto",
  currency = "KES",
  locale = "en-KE",
}) {
  // Normalize and format the value for display
  const { display, rawIsNumber, numericValue } = useMemo(() => {
    if (value === null || value === undefined) return { display: "—", rawIsNumber: false, numericValue: null };

    // If value is already a string that is not numeric, show as-is
    if (typeof value === "string") {
      const trimmed = value.trim();
      const numeric = Number(trimmed.replace(/[, ]+/g, ""));
      if (!Number.isFinite(numeric)) return { display: trimmed, rawIsNumber: false, numericValue: null };
      // string that contains a numeric value
      value = numeric;
    }

    // At this point value is a number
    const num = Number(value as number);
    if (!Number.isFinite(num)) return { display: String(value), rawIsNumber: false, numericValue: null };

    // Choose formatting precedence:
    // - If format === 'compact' => compact
    // - If format === 'currency' => currency
    // - If format === 'percent' => percent
    // - If format === 'auto' => prefer compact for millions, then currency for >= 1,000, else plain number
    const absNum = Math.abs(num);
    const useCompact = format === "compact" || (format === "auto" && absNum >= 1_000_000);
    const useCurrency =
      format === "currency" ||
      (format === "auto" && !useCompact && absNum >= 1_000 && currency !== "");
    try {
      if (useCompact) {
        const nf = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
        return { display: nf.format(num), rawIsNumber: true, numericValue: num };
      }

      if (useCurrency) {
        const nf = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
        return { display: nf.format(Math.round(num)), rawIsNumber: true, numericValue: num };
      }

      if (format === "percent") {
        const nf = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
        return { display: nf.format(num), rawIsNumber: true, numericValue: num };
      }

      // Default number formatting with thousands separators
      const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
      return { display: nf.format(Math.round(num)), rawIsNumber: true, numericValue: num };
    } catch {
      return { display: String(num), rawIsNumber: true, numericValue: num };
    }
  }, [value, format, currency, locale]);

  // Responsive font size based on display length
  const fontClass = useMemo(() => {
    const length = String(display).length;
    if (length <= 5) return "text-lg sm:text-xl lg:text-2xl";
    if (length <= 8) return "text-base sm:text-lg lg:text-xl";
    if (length <= 11) return "text-sm sm:text-base lg:text-lg";
    return "text-xs sm:text-sm lg:text-base";
  }, [display]);

  // Visual color classes
  const iconBgClass =
    variant === "success"
      ? "bg-success/15 text-success"
      : variant === "danger"
      ? "bg-destructive/15 text-destructive"
      : "bg-primary/10 text-primary";

  const cardVariantClass =
    variant === "success"
      ? "border-success/20 bg-gradient-to-br from-success/5 to-success/10"
      : variant === "danger"
      ? "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
      : "";

  // If numeric and negative, visually emphasize as "success" (credit) unless caller explicitly set danger
  const effectiveVariant = useMemo(() => {
    if (rawIsNumber && typeof numericValue === "number" && numericValue < 0 && variant === "default") {
      return "success";
    }
    return variant;
  }, [rawIsNumber, numericValue, variant]);

  // Color classes for the numeric text when negative/positive
  const valueColorClass = useMemo(() => {
    if (!rawIsNumber || numericValue == null) return "text-foreground";
    if (numericValue < 0) return "text-emerald-600";
    if (numericValue > 0 && effectiveVariant === "danger") return "text-red-600";
    return "text-foreground";
  }, [rawIsNumber, numericValue, effectiveVariant]);

  // Accessibility: announce changes to the value and indicate busy state
  const titleText = String(display ?? "");

  return (
    <Card
      className={cn("p-3 sm:p-4 animate-fade-in overflow-hidden relative", cardVariantClass, className)}
      role="group"
      aria-label={`${label} statistic`}
      aria-busy={loading}
    >
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <div
          className={cn("p-2 sm:p-2.5 rounded-xl shrink-0", effectiveVariant === "success" ? "bg-success/15 text-success" : effectiveVariant === "danger" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary")}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn("font-bold leading-tight tabular-nums", fontClass, valueColorClass)}
            title={titleText}
            aria-live="polite"
            aria-atomic="true"
            aria-valuetext={titleText}
          >
            {loading ? <span className="opacity-60">Loading…</span> : <span>{display}</span>}
          </p>

          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate mt-0.5">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
});

export default StatsCard;
