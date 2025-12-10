import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "paid" | "arrears";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isPaid = status === "paid";
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        isPaid 
          ? "bg-success text-success-foreground" 
          : "bg-destructive text-destructive-foreground",
        className
      )}
    >
      {isPaid ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      {isPaid ? "Paid" : "Arrears"}
    </span>
  );
}
