import { StatusBadge, type UnitStatus } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatKES } from "@/lib/number-formatter";
import type { DashboardUnit } from "@/hooks/useDashboard";

interface Props {
  unit?: DashboardUnit | null;
  className?: string;
  onRecordPayment?: (unit: DashboardUnit) => void;
  /** Everything this tenant owes across all months, not just the one on screen. */
  totalOwed?: number;
  /** Whole months of rent those arrears represent. */
  monthsBehind?: number;
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * One unit, as a ledger row.
 *
 * Previously a floating card that lifted and glowed on hover
 * (`hover:shadow-lg hover:border-primary/20`) — the interaction that most reads
 * as a generated component, and meaningless on a phone where there is no hover.
 * Now a flat row with a status rule down the left edge, matching the ledger
 * summary above it. Hover only changes the border.
 */
export function UnitCard({
  unit,
  className,
  onRecordPayment,
  totalOwed,
  monthsBehind = 0,
}: Props) {
  if (!unit) {
    return (
      <div
        className={cn("border border-border rounded-lg p-4 animate-pulse", className)}
        aria-label="Loading unit"
      >
        <div className="h-4 w-1/3 bg-muted rounded-sm mb-2" />
        <div className="h-3 w-2/3 bg-muted rounded-sm" />
      </div>
    );
  }

  const isVacant = !unit.tenant_id;
  const balance = toNumber(unit.balance);
  const rent = toNumber(unit.rent_amount);

  const status: UnitStatus = isVacant
    ? "vacant"
    : unit.payment_status === "paid" || unit.payment_status === "overpaid"
      ? "paid"
      : unit.payment_status === "partial"
        ? "partial"
        : "arrears";

  const rule =
    status === "paid"
      ? "border-l-success"
      : status === "partial"
        ? "border-l-warning"
        : status === "arrears"
          ? "border-l-destructive"
          : "border-l-border";

  return (
    <div
      className={cn(
        "border border-border border-l-2 rounded-lg bg-card p-4",
        "transition-colors hover:border-foreground/25",
        rule,
        className
      )}
      role="group"
      aria-label={`Unit ${unit.unit_number}, ${unit.property_name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-bold text-foreground shrink-0">{unit.unit_number}</span>
            <span className="text-xs text-muted-foreground truncate">{unit.property_name}</span>
          </div>

          {isVacant ? (
            <p className="text-sm text-muted-foreground mt-1">Available to let</p>
          ) : (
            <>
              <p className="text-sm font-medium truncate mt-1">{unit.tenant_name}</p>
              {unit.tenant_phone && (
                <p className="text-xs text-muted-foreground truncate">{unit.tenant_phone}</p>
              )}
            </>
          )}
        </div>

        <StatusBadge status={status} className="shrink-0" />
      </div>

      {!isVacant && (
        <>
          {/* The figures, aligned so they read down the column across rows. */}
          <dl className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Rent</dt>
              <dd className="font-semibold tabular-nums mt-0.5">{formatKES(rent)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-semibold tabular-nums mt-0.5">
                {formatKES(toNumber(unit.total_allocated))}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {balance < 0 ? "In credit" : "Owing"}
              </dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums mt-0.5",
                  balance > 0 && "text-destructive",
                  balance < 0 && "text-success"
                )}
              >
                {formatKES(Math.abs(balance))}
              </dd>
            </div>
          </dl>

          {/* Arrears carried from earlier months. Shown only when they exceed
              what is owed for the month on screen, so it adds information
              rather than repeating the column above. */}
          {typeof totalOwed === "number" && totalOwed > Math.max(balance, 0) && (
            <p className="mt-3 text-xs bg-destructive/10 text-destructive rounded-sm px-2.5 py-2">
              <span className="font-semibold">{formatKES(totalOwed)} owed in total</span>
              {monthsBehind > 0 && (
                <span>
                  {" · "}
                  {monthsBehind} {monthsBehind === 1 ? "month" : "months"} behind
                </span>
              )}
            </p>
          )}

          {onRecordPayment && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => onRecordPayment(unit)}
            >
              Record payment
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default UnitCard;
