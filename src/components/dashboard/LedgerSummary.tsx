import { cn } from "@/lib/utils";
import { formatKES } from "@/lib/number-formatter";

interface Row {
  label: string;
  value: number;
  /** A hint shown under the label. */
  note?: string;
  tone?: "default" | "owed" | "paid";
  /** Draw a rule above this row — used to separate a subtotal. */
  ruleAbove?: boolean;
  /** Heavier weight and a double rule, for the closing figure. */
  total?: boolean;
  onClick?: () => void;
}

interface Props {
  period: string;
  rows: Row[];
  className?: string;
}

/**
 * The month's figures as a ledger rather than a grid of tiles.
 *
 * Six separate stat cards showed Billed, Collected and Still Owed as unrelated
 * numbers, so a landlord had no way to see that they add up. Set as rows in a
 * column with a rule before the subtotal, the arithmetic is visible: billed
 * minus collected is what is owed, and the closing line is what they kept.
 */
export function LedgerSummary({ period, rows, className }: Props) {
  return (
    <section
      className={cn("surface-panel p-5", className)}
      aria-label={`Summary for ${period}`}
    >
      <p className="eyebrow mb-4">{period}</p>

      <dl className="space-y-0">
        {rows.map((row) => {
          const Wrapper = row.onClick ? "button" : "div";
          return (
            <Wrapper
              key={row.label}
              type={row.onClick ? "button" : undefined}
              onClick={row.onClick}
              className={cn(
                "w-full flex items-baseline justify-between gap-4 py-2.5 text-left",
                row.ruleAbove && "border-t border-border mt-1 pt-3",
                row.total && "border-t-2 border-foreground mt-1 pt-3",
                row.onClick &&
                  "hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <dt className="min-w-0">
                <span
                  className={cn(
                    "block truncate",
                    row.total ? "text-sm font-semibold" : "text-sm text-muted-foreground"
                  )}
                >
                  {row.label}
                </span>
                {row.note && (
                  <span className="block text-xs text-muted-foreground/80 truncate mt-0.5">
                    {row.note}
                  </span>
                )}
              </dt>

              <dd
                className={cn(
                  "shrink-0 tabular-nums font-semibold",
                  row.total ? "text-lg font-bold" : "text-sm",
                  row.tone === "owed" && "text-destructive",
                  row.tone === "paid" && "text-success"
                )}
              >
                {formatKES(row.value)}
              </dd>
            </Wrapper>
          );
        })}
      </dl>
    </section>
  );
}

export default LedgerSummary;
