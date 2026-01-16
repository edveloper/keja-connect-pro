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
  // Determine responsive font size based on value length
  const valueStr = String(value);
  const getResponsiveFontSize = () => {
    const length = valueStr.length;
    if (length <= 5) return "text-lg sm:text-xl lg:text-2xl";
    if (length <= 8) return "text-base sm:text-lg lg:text-xl";
    if (length <= 11) return "text-sm sm:text-base lg:text-lg";
    return "text-xs sm:text-sm lg:text-base";
  };

  return (
    <Card className={cn(
      "p-3 sm:p-4 animate-fade-in overflow-hidden relative",
      variant === "success" && "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
      variant === "danger" && "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10",
      className
    )}>
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <div className={cn(
          "p-2 sm:p-2.5 rounded-xl shrink-0",
          variant === "default" && "bg-primary/10 text-primary",
          variant === "success" && "bg-success/15 text-success",
          variant === "danger" && "bg-destructive/15 text-destructive"
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        
        <div className="min-w-0 flex-1">
          {/* Dynamic responsive text that adapts to value length */}
          <p className={cn(
            "font-bold text-foreground leading-tight tabular-nums",
            getResponsiveFontSize()
          )}>
            {value}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate mt-0.5">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}