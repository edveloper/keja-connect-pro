import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getResponsiveFontClass } from "@/lib/number-formatter";
import type { LucideIcon } from "lucide-react";

type Variant = "default" | "success" | "danger";

interface StatsCardProps {
  label: string;
  /** Already formatted for display. Use `formatKES` for money. */
  value: string | number | null | undefined;
  /** Optional second line under the label, for context. */
  hint?: string;
  icon: LucideIcon;
  variant?: Variant;
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * A single figure on the dashboard.
 *
 * This deliberately does no number formatting. It used to run values through
 * `Intl.NumberFormat` with compact notation above a million, which meant a
 * balance of KES 1,250,000 could render as "KES 1.3M" — the same rounding
 * problem `formatCurrency` had. Callers format their own values; this only
 * decides how large to draw them.
 */
export const StatsCard: React.FC<StatsCardProps> = React.memo(function StatsCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
  className,
  loading = false,
  onClick,
}) {
  const display = value === null || value === undefined || value === "" ? "-" : String(value);

  const cardVariantClass =
    variant === "success"
      ? "border-success/20 bg-gradient-to-br from-success/5 to-success/10"
      : variant === "danger"
        ? "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
        : "bg-gradient-to-br from-card to-card/70";

  const iconClass =
    variant === "success"
      ? "bg-success/15 text-success"
      : variant === "danger"
        ? "bg-destructive/15 text-destructive"
        : "bg-primary/10 text-primary";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Card
      className={cn(
        "p-3 sm:p-4 animate-fade-in overflow-hidden relative",
        onClick && "elevate",
        cardVariantClass,
        className
      )}
    >
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "flex flex-row items-center gap-2 sm:gap-3 w-full text-left",
          onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        )}
        aria-label={onClick ? `${label}: ${display}` : undefined}
      >
        <div
          className={cn("p-2 sm:p-2.5 rounded-xl shrink-0 ring-1 ring-black/5", iconClass)}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-bold leading-tight tabular-nums truncate",
              getResponsiveFontClass(display)
            )}
            title={display}
          >
            {loading ? <span className="opacity-60">Loading…</span> : display}
          </p>

          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate mt-0.5">
            {label}
          </p>

          {hint && (
            <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5 normal-case">
              {hint}
            </p>
          )}
        </div>
      </Wrapper>
    </Card>
  );
});

export default StatsCard;
