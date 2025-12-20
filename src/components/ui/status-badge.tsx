import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Home, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: "paid" | "partial" | "arrears" | "vacant";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm",
        status === "paid" && "bg-success/15 text-success border border-success/20",
        status === "partial" && "bg-warning/15 text-warning border border-warning/20",
        status === "arrears" && "bg-destructive/15 text-destructive border border-destructive/20",
        status === "vacant" && "bg-muted text-muted-foreground border border-border",
        className
      )}
    >
      {status === "paid" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "partial" && <AlertTriangle className="h-3.5 w-3.5" />}
      {status === "arrears" && <AlertCircle className="h-3.5 w-3.5" />}
      {status === "vacant" && <Home className="h-3.5 w-3.5" />}
      {status === "paid" ? "Paid" : status === "partial" ? "Partial" : status === "arrears" ? "Arrears" : "Vacant"}
    </span>
  );
}
