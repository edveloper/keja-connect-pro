import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePayment, useCurrentMonthPayments, calculatePaymentStatus, useDeletePayment } from "@/hooks/usePayments";
import { CheckCircle, AlertTriangle, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    rent_amount: number;
    opening_balance?: number;
  };
}

export function RecordPaymentDialog({ open, onOpenChange, tenant }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const { data: allPayments } = useCurrentMonthPayments();
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const tenantPayments = allPayments?.filter(p => p.tenant_id === tenant.id) || [];
  
  // Calculate status including the opening balance/arrears
  const openingBalance = Number(tenant.opening_balance) || 0;
  const currentStatus = calculatePaymentStatus(tenant.rent_amount, tenantPayments);
  
  // Adjusted balance including historical arrears
  const effectiveArrears = currentStatus.balance - openingBalance;

  const paymentAmount = parseFloat(amount) || 0;
  const projectedBalance = (currentStatus.totalPaid + paymentAmount) - (tenant.rent_amount + openingBalance);
  
  useEffect(() => {
    if (open) {
      const totalDue = (tenant.rent_amount + openingBalance) - currentStatus.totalPaid;
      setAmount(totalDue > 0 ? totalDue.toString() : "0");
      setMpesaCode("");
    }
  }, [open, tenant.rent_amount, openingBalance, currentStatus.totalPaid]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;
    createPayment.mutate({
      tenant_id: tenant.id,
      amount: paymentAmount,
      payment_month: currentMonth,
      mpesa_code: mpesaCode || null,
    }, { onSuccess: () => onOpenChange(false) });
  };
  
  const getStatusInfo = () => {
    if (projectedBalance < 0) return { icon: AlertTriangle, label: `KES ${Math.abs(projectedBalance).toLocaleString()} remaining`, color: "text-amber-600", bgColor: "bg-amber-50" };
    if (projectedBalance === 0) return { icon: CheckCircle, label: "Fully settled", color: "text-emerald-600", bgColor: "bg-emerald-50" };
    return { icon: TrendingUp, label: `KES ${projectedBalance.toLocaleString()} credit`, color: "text-blue-600", bgColor: "bg-blue-50" };
  };
  
  const statusInfo = paymentAmount > 0 ? getStatusInfo() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Payments for {tenant.name} ({currentMonth})</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex justify-between text-xs"><span>Current Rent:</span><span className="font-bold">KES {tenant.rent_amount.toLocaleString()}</span></div>
            {openingBalance !== 0 && (
              <div className="flex justify-between text-xs text-amber-700"><span>Prev. Arrears:</span><span className="font-bold">KES {openingBalance.toLocaleString()}</span></div>
            )}
            <div className="flex justify-between text-xs border-t pt-1 mt-1"><span>Total Paid:</span><span className="font-bold text-emerald-600">KES {currentStatus.totalPaid.toLocaleString()}</span></div>
          </div>

          {/* List existing payments for the month to allow Deletion (Editing via deletion) */}
          {tenantPayments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Recent Records</Label>
              {tenantPayments.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-white border rounded-md p-2 text-sm">
                  <span>KES {p.amount.toLocaleString()} <span className="text-[10px] text-muted-foreground">({p.mpesa_code || 'Cash'})</span></span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePayment.mutate(p.id)} disabled={deletePayment.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="amount">New Payment Amount</Label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mpesa-code">M-Pesa Code</Label>
              <Input id="mpesa-code" placeholder="Optional" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} maxLength={10} />
            </div>
            {statusInfo && (
              <div className={cn("p-3 rounded-lg flex items-center gap-2", statusInfo.bgColor)}>
                <statusInfo.icon className={cn("h-4 w-4", statusInfo.color)} />
                <span className={cn("font-medium text-xs", statusInfo.color)}>Outcome: {statusInfo.label}</span>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createPayment.isPending}>{createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}