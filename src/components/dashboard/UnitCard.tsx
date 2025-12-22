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
      "p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/20",
      className
    )}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          {/* Unit and Property Row */}
          <div className="flex items-baseline gap-1.5 mb-2 overflow-hidden">
            <span className="text-base sm:text-lg font-bold text-foreground shrink-0">
              {unitNumber}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
              • {propertyName}
            </span>
          </div>
          
          {isVacant ? (
            <p className="text-xs sm:text-sm text-muted-foreground">Available for rent</p>
          ) : (
            <div className="space-y-2">
              {/* Tenant Name */}
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                </div>
                <span className="truncate font-medium">{tenantName}</span>
              </div>

              {/* Tenant Phone */}
              {tenantPhone && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="p-1.5 rounded-lg bg-muted shrink-0">
                    <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="truncate">{tenantPhone}</span>
                </div>
              )}

              {/* Rent and Balance */}
              {rentAmount && (
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted shrink-0">
                      <Banknote className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-foreground whitespace-nowrap">
                      KES {rentAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-1">
                    {paymentStatus === "partial" && (
                      <span className="text-warning text-[10px] sm:text-xs font-medium bg-warning/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        −KES {balance.toLocaleString()}
                      </span>
                    )}
                    {paymentStatus === "overpaid" && (
                      <span className="text-success text-[10px] sm:text-xs font-medium bg-success/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        +KES {Math.abs(balance).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Badge - shrink-0 ensures it never gets squashed */}
        <div className="shrink-0">
          <StatusBadge status={getStatusForBadge()} />
        </div>
      </div>
    </Card>
  );
}