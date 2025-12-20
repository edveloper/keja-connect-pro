import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { User, Phone, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentStatus } from "@/hooks/useDashboard";

interface UnitCardProps {
  unitNumber: string;
  propertyName: string;
  tenantName?: string;
  tenantPhone?: string;
  rentAmount?: number;
  paymentStatus: PaymentStatus;
  amountPaid?: number;
  balance?: number;
  className?: string;
}

export function UnitCard({
  unitNumber,
  propertyName,
  tenantName,
  tenantPhone,
  rentAmount,
  paymentStatus,
  amountPaid = 0,
  balance = 0,
  className,
}: UnitCardProps) {
  const isVacant = !tenantName;

  const getStatusForBadge = () => {
    if (isVacant) return "vacant";
    if (paymentStatus === "paid" || paymentStatus === "overpaid") return "paid";
    if (paymentStatus === "partial") return "partial";
    return "arrears";
  };
  
  return (
    <Card className={cn(
      "p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/20",
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-foreground">{unitNumber}</span>
            <span className="text-sm text-muted-foreground font-medium">• {propertyName}</span>
          </div>
          
          {isVacant ? (
            <p className="text-sm text-muted-foreground">Available for rent</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="truncate font-medium">{tenantName}</span>
              </div>
              {tenantPhone && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <span>{tenantPhone}</span>
                </div>
              )}
              {rentAmount && (
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="font-semibold text-foreground">KES {rentAmount.toLocaleString()}</span>
                  {paymentStatus === "partial" && (
                    <span className="text-warning text-xs font-medium bg-warning/10 px-2 py-0.5 rounded-full">
                      −KES {balance.toLocaleString()}
                    </span>
                  )}
                  {paymentStatus === "overpaid" && (
                    <span className="text-success text-xs font-medium bg-success/10 px-2 py-0.5 rounded-full">
                      +KES {Math.abs(balance).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <StatusBadge status={getStatusForBadge()} />
      </div>
    </Card>
  );
}
