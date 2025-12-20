import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger";
  className?: string;
}

export function StatsCard({ label, value, icon: Icon, variant = "default", className }: StatsCardProps) {
  return (
    <Card className={cn(
      "p-4 animate-fade-in overflow-hidden relative",
      variant === "success" && "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
      variant === "danger" && "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2.5 rounded-xl shrink-0",
          variant === "default" && "bg-primary/10 text-primary",
          variant === "success" && "bg-success/15 text-success",
          variant === "danger" && "bg-destructive/15 text-destructive"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground truncate">{value}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </Card>
  );
}
