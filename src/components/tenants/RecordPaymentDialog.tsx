import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePayment, useCurrentMonthPayments, calculatePaymentStatus } from "@/hooks/usePayments";
import { CheckCircle, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    rent_amount: number;
  };
}

export function RecordPaymentDialog({ open, onOpenChange, tenant }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  
  const createPayment = useCreatePayment();
  const { data: allPayments } = useCurrentMonthPayments();
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const tenantPayments = allPayments?.filter(p => p.tenant_id === tenant.id) || [];
  const currentStatus = calculatePaymentStatus(tenant.rent_amount, tenantPayments);
  
  // Calculate what would happen with this payment
  const paymentAmount = parseFloat(amount) || 0;
  const projectedTotal = currentStatus.totalPaid + paymentAmount;
  const projectedBalance = projectedTotal - tenant.rent_amount;
  
  useEffect(() => {
    if (open) {
      // Pre-fill with remaining balance if there's arrears
      if (currentStatus.balance < 0) {
        setAmount(Math.abs(currentStatus.balance).toString());
      } else {
        setAmount(tenant.rent_amount.toString());
      }
      setMpesaCode("");
    }
  }, [open, currentStatus.balance, tenant.rent_amount]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;
    
    createPayment.mutate({
      tenant_id: tenant.id,
      amount: paymentAmount,
      payment_month: currentMonth,
      mpesa_code: mpesaCode || null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };
  
  const getStatusInfo = () => {
    if (projectedBalance < 0) {
      return {
        icon: AlertTriangle,
        label: `KES ${Math.abs(projectedBalance).toLocaleString()} arrears`,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
      };
    } else if (projectedBalance === 0) {
      return {
        icon: CheckCircle,
        label: "Fully paid",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      };
    } else {
      return {
        icon: TrendingUp,
        label: `KES ${projectedBalance.toLocaleString()} credit`,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      };
    }
  };
  
  const statusInfo = paymentAmount > 0 ? getStatusInfo() : null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {tenant.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Status */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected rent:</span>
              <span className="font-medium">KES {tenant.rent_amount.toLocaleString()}</span>
            </div>
            {currentStatus.totalPaid > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Already paid:</span>
                <span className="font-medium">KES {currentStatus.totalPaid.toLocaleString()}</span>
              </div>
            )}
            {currentStatus.balance < 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Arrears:</span>
                <span className="font-medium text-amber-600">
                  KES {Math.abs(currentStatus.balance).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />
          </div>
          
          {/* M-Pesa Code (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="mpesa-code">M-Pesa Code (optional)</Label>
            <Input
              id="mpesa-code"
              placeholder="e.g. TDJ3ABC123"
              value={mpesaCode}
              onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>
          
          {/* Projected Status */}
          {statusInfo && (
            <div className={cn("p-3 rounded-lg flex items-center gap-2", statusInfo.bgColor)}>
              <statusInfo.icon className={cn("h-5 w-5", statusInfo.color)} />
              <span className={cn("font-medium text-sm", statusInfo.color)}>
                After this payment: {statusInfo.label}
              </span>
            </div>
          )}
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setAmount(tenant.rent_amount.toString())}
            >
              Full rent
            </Button>
            {currentStatus.balance < 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAmount(Math.abs(currentStatus.balance).toString())}
              >
                Clear arrears
              </Button>
            )}
          </div>
          
          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={paymentAmount <= 0 || createPayment.isPending}
            >
              {createPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
