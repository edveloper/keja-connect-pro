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
  format?: Format;
  currency?: string;
  locale?: string;
}

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
  const { display, rawIsNumber, numericValue } = useMemo(() => {
    if (value === null || value === undefined) {
      return { display: "-", rawIsNumber: false, numericValue: null as number | null };
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      const numeric = Number(trimmed.replace(/[, ]+/g, ""));
      if (!Number.isFinite(numeric)) {
        return { display: trimmed, rawIsNumber: false, numericValue: null as number | null };
      }
      value = numeric;
    }

    const num = Number(value);
    if (!Number.isFinite(num)) {
      return { display: String(value), rawIsNumber: false, numericValue: null as number | null };
    }

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
        const nf = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        });
        return { display: nf.format(Math.round(num)), rawIsNumber: true, numericValue: num };
      }

      if (format === "percent") {
        const nf = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
        return { display: nf.format(num), rawIsNumber: true, numericValue: num };
      }

      const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
      return { display: nf.format(Math.round(num)), rawIsNumber: true, numericValue: num };
    } catch {
      return { display: String(num), rawIsNumber: true, numericValue: num };
    }
  }, [value, format, currency, locale]);

  const fontClass = useMemo(() => {
    const length = String(display).length;
    if (length <= 5) return "text-lg sm:text-xl lg:text-2xl";
    if (length <= 8) return "text-base sm:text-lg lg:text-xl";
    if (length <= 11) return "text-sm sm:text-base lg:text-lg";
    return "text-xs sm:text-sm lg:text-base";
  }, [display]);

  const cardVariantClass =
    variant === "success"
      ? "border-success/20 bg-gradient-to-br from-success/5 to-success/10"
      : variant === "danger"
        ? "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
        : "bg-gradient-to-br from-card to-card/70";

  const effectiveVariant = useMemo(() => {
    if (rawIsNumber && typeof numericValue === "number" && numericValue < 0 && variant === "default") {
      return "success";
    }
    return variant;
  }, [rawIsNumber, numericValue, variant]);

  const valueColorClass = useMemo(() => {
    if (!rawIsNumber || numericValue == null) return "text-foreground";
    if (numericValue < 0) return "text-emerald-600";
    if (numericValue > 0 && effectiveVariant === "danger") return "text-red-600";
    return "text-foreground";
  }, [rawIsNumber, numericValue, effectiveVariant]);

  const titleText = String(display ?? "");

  return (
    <Card
      className={cn(
        "p-3 sm:p-4 animate-fade-in overflow-hidden relative elevate",
        cardVariantClass,
        className
      )}
      role="group"
      aria-label={`${label} statistic`}
      aria-busy={loading}
    >
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "p-2 sm:p-2.5 rounded-xl shrink-0 ring-1 ring-black/5",
            effectiveVariant === "success"
              ? "bg-success/15 text-success"
              : effectiveVariant === "danger"
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
          )}
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
            {loading ? <span className="opacity-60">Loading...</span> : <span>{display}</span>}
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

