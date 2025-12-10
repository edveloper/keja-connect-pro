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
      "p-4 animate-fade-in",
      variant === "success" && "border-success/30 bg-success/5",
      variant === "danger" && "border-destructive/30 bg-destructive/5",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2.5 rounded-lg",
          variant === "default" && "bg-muted text-muted-foreground",
          variant === "success" && "bg-success/10 text-success",
          variant === "danger" && "bg-destructive/10 text-destructive"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
      </div>
    </Card>
  );
}
