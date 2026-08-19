import { cn } from "@/lib/utils";

export type UnitStatus = "paid" | "partial" | "arrears" | "vacant";

interface StatusBadgeProps {
  status: UnitStatus;
  className?: string;
}

const LABEL: Record<UnitStatus, string> = {
  paid: "Paid",
  partial: "Part paid",
  arrears: "Owing",
  vacant: "Vacant",
};

/**
 * A quiet status tag.
 *
 * The previous version was a full pill carrying a tinted background, a border,
 * a drop shadow and an icon all at once — four decorations doing one job, and
 * the shape that most reads as a generated component. This is a square-cornered
 * tag with a status dot: the colour does the work, and it sits on a ledger row
 * without shouting over the figures.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium whitespace-nowrap",
        status === "paid" && "bg-success/10 text-success",
        status === "partial" && "bg-warning/10 text-warning",
        status === "arrears" && "bg-destructive/10 text-destructive",
        status === "vacant" && "bg-muted text-muted-foreground",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          status === "paid" && "bg-success",
          status === "partial" && "bg-warning",
          status === "arrears" && "bg-destructive",
          status === "vacant" && "bg-muted-foreground/50"
        )}
        aria-hidden="true"
      />
      {LABEL[status]}
    </span>
  );
}

export default StatusBadge;
