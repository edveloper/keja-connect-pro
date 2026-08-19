import { Button } from "@/components/ui/button";
import { StatusBadge, type UnitStatus } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Receipt, Pencil, LogOut, Trash2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKES } from "@/lib/number-formatter";
import { formatKenyanPhone } from "@/lib/phone-validation";

export interface TenantRowData {
  id: string;
  name: string;
  phone: string;
  unitNumber: string | null;
  propertyName: string | null;
  rent: number;
  /** Owed across every month, not just the one on screen. */
  totalOwed: number;
  monthsBehind: number;
  status: UnitStatus;
}

interface Props {
  tenant: TenantRowData;
  /** Pre-built wa.me link, or null when there is no usable number. */
  reminderLink?: string | null;
  onOpenStatement: () => void;
  onRecordPayment: () => void;
  onEdit: () => void;
  onMoveOut: () => void;
  onDelete: () => void;
}

/**
 * One tenant, as a ledger row.
 *
 * Matches the unit rows on the dashboard: hairline border, status rule down the
 * left edge, figures in aligned tabular columns. The headline figure is what
 * the tenant owes in total rather than for the current month, because this
 * screen is the chase list — a tenant square for August who still owes 60,000
 * from earlier in the year is the whole reason to open it.
 */
export function TenantRow({
  tenant,
  reminderLink,
  onOpenStatement,
  onRecordPayment,
  onEdit,
  onMoveOut,
  onDelete,
}: Props) {
  const owes = tenant.totalOwed > 0;
  const inCredit = tenant.totalOwed < 0;

  const rule =
    tenant.status === "paid"
      ? "border-l-success"
      : tenant.status === "partial"
        ? "border-l-warning"
        : tenant.status === "arrears"
          ? "border-l-destructive"
          : "border-l-border";

  return (
    <div
      className={cn(
        "border border-border border-l-2 rounded-lg bg-card transition-colors hover:border-foreground/25",
        rule
      )}
    >
      <button
        type="button"
        onClick={onOpenStatement}
        className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        aria-label={`Open ${tenant.name}'s statement`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{tenant.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {tenant.unitNumber ? `Unit ${tenant.unitNumber}` : "No unit"}
              {tenant.propertyName ? ` · ${tenant.propertyName}` : ""}
            </p>
            {tenant.phone && (
              <p className="text-xs text-muted-foreground truncate">
                {formatKenyanPhone(tenant.phone)}
              </p>
            )}
          </div>
          <StatusBadge status={tenant.status} className="shrink-0" />
        </div>

        <dl className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Monthly rent</dt>
            <dd className="font-semibold tabular-nums mt-0.5">{formatKES(tenant.rent)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {inCredit ? "In credit" : "Owed in total"}
            </dt>
            <dd
              className={cn(
                "font-semibold tabular-nums mt-0.5",
                owes && "text-destructive",
                inCredit && "text-success"
              )}
            >
              {formatKES(Math.abs(tenant.totalOwed))}
            </dd>
          </div>
        </dl>

        {tenant.monthsBehind > 0 && (
          <p className="mt-2 text-xs text-destructive">
            {tenant.monthsBehind} {tenant.monthsBehind === 1 ? "month" : "months"} of rent
            behind
          </p>
        )}
      </button>

      <div className="flex items-center gap-1.5 px-4 pb-4">
        <Button size="sm" className="flex-1" onClick={onRecordPayment}>
          Record payment
        </Button>

        {reminderLink && owes && (
          <Button size="sm" variant="outline" asChild>
            <a href={reminderLink} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Remind</span>
              <span className="sr-only sm:hidden">Send a reminder to {tenant.name}</span>
            </a>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              aria-label={`More actions for ${tenant.name}`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpenStatement}>
              <Receipt className="mr-2 h-4 w-4" />
              View statement
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMoveOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Move out
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default TenantRow;
