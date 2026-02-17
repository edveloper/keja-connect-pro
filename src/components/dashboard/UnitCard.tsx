import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { User, Phone, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DashboardUnit } from "@/hooks/useDashboard";

type UnitBadgeStatus = "paid" | "partial" | "arrears" | "vacant";

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const parsed = parseFloat(String(v).replace(/[, ]+/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function formatCurrency(n: number | null, currency = "KES", locale = "en-KE") {
  if (n == null) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  }
}

interface Props {
  unit?: DashboardUnit | null;
  className?: string;
  onRecordPayment?: (unit: DashboardUnit) => void;
}

export function UnitCard({ unit, className, onRecordPayment }: Props) {
  if (!unit) {
    return (
      <Card className={cn("p-3 sm:p-4 animate-pulse", className)} role="group" aria-label="Unit loading">
        <div className="h-4 bg-muted/30 rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted/20 rounded w-2/3 mb-1" />
        <div className="h-3 bg-muted/20 rounded w-1/2" />
      </Card>
    );
  }

  const {
    unit_number,
    property_name,
    tenant_id,
    tenant_name,
    tenant_phone,
    rent_amount,
    payment_status,
    total_allocated,
    balance,
  } = unit;

  const isVacant = !tenant_id;

  const rent = toNumber(rent_amount);
  const paid = toNumber(total_allocated);
  const bal = toNumber(balance);

  const rentStr = formatCurrency(rent);
  const paidStr = formatCurrency(paid);
  const balStr = bal == null ? null : formatCurrency(Math.abs(bal));

  let badgeStatus: UnitBadgeStatus = "arrears";
  if (isVacant) badgeStatus = "vacant";
  else if (payment_status === "paid" || payment_status === "overpaid") badgeStatus = "paid";
  else if (payment_status === "partial") badgeStatus = "partial";

  return (
    <Card
      className={cn(
        "p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/20 relative",
        className
      )}
      role="group"
      aria-label={`Unit ${unit_number} at ${property_name}`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-2 overflow-hidden">
            <span className="text-base sm:text-lg font-bold text-foreground shrink-0">{unit_number}</span>
            <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">| {property_name}</span>
          </div>

          {isVacant ? (
            <p className="text-xs sm:text-sm text-muted-foreground">Available for rent</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0" aria-hidden="true">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                </div>
                <span className="truncate font-medium" title={tenant_name ?? ""}>
                  {tenant_name}
                </span>
              </div>

              {tenant_phone && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="p-1.5 rounded-lg bg-muted shrink-0" aria-hidden="true">
                    <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="truncate" title={tenant_phone}>
                    {tenant_phone}
                  </span>
                </div>
              )}

              {rent != null && (
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted shrink-0" aria-hidden="true">
                      <Banknote className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-foreground whitespace-nowrap">
                      {rentStr ?? `KES ${new Intl.NumberFormat().format(rent)}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 items-center">
                    {bal != null && bal > 0 && (
                      <span
                        className="text-red-600 text-[10px] sm:text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100"
                        role="status"
                        title={`Owes ${balStr ?? bal}`}
                      >
                        Owes: {balStr ?? `KES ${new Intl.NumberFormat().format(bal)}`}
                      </span>
                    )}

                    {bal != null && bal < 0 && (
                      <span
                        className="text-emerald-600 text-[10px] sm:text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"
                        role="status"
                        title={`Forward ${balStr ?? Math.abs(bal)}`}
                      >
                        Forward: {balStr ?? `KES ${new Intl.NumberFormat().format(Math.abs(bal))}`}
                      </span>
                    )}

                    {paid != null && (
                      <span
                        className="text-muted-foreground text-[10px] sm:text-xs bg-muted/40 px-2 py-0.5 rounded-full border border-muted/20"
                        title={`Collected ${paidStr ?? paid}`}
                      >
                        Collected: {paidStr ?? `KES ${new Intl.NumberFormat().format(paid)}`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={badgeStatus} />
          {onRecordPayment && !isVacant && (
            <Button size="sm" variant="ghost" onClick={() => onRecordPayment(unit)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default UnitCard;
