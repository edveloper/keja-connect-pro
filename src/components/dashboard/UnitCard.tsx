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
      "p-4 animate-fade-in transition-all hover:shadow-md",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-foreground">{unitNumber}</span>
            <span className="text-sm text-muted-foreground">• {propertyName}</span>
          </div>
          
          {isVacant ? (
            <p className="text-sm text-muted-foreground italic">Available for rent</p>
          ) : (
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{tenantName}</span>
              </div>
              {tenantPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{tenantPhone}</span>
                </div>
              )}
              {rentAmount && (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>KES {rentAmount.toLocaleString()}</span>
                  {paymentStatus === "partial" && (
                    <span className="text-warning text-xs">
                      (KES {balance.toLocaleString()} owed)
                    </span>
                  )}
                  {paymentStatus === "overpaid" && (
                    <span className="text-success text-xs">
                      (+KES {Math.abs(balance).toLocaleString()} credit)
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
