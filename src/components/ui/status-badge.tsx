import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Home } from "lucide-react";

interface StatusBadgeProps {
  status: "paid" | "arrears" | "vacant";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        status === "paid" && "bg-success text-success-foreground",
        status === "arrears" && "bg-destructive text-destructive-foreground",
        status === "vacant" && "bg-muted text-muted-foreground",
        className
      )}
    >
      {status === "paid" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "arrears" && <AlertCircle className="h-3.5 w-3.5" />}
      {status === "vacant" && <Home className="h-3.5 w-3.5" />}
      {status === "paid" ? "Paid" : status === "arrears" ? "Arrears" : "Vacant"}
    </span>
  );
}
