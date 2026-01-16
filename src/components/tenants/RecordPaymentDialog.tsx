import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePayment, usePayments } from "@/hooks/usePayments";
import { Loader2, Calendar, History } from "lucide-react";
import { differenceInMonths, startOfMonth, parseISO, getDaysInMonth, differenceInDays, endOfMonth, addMonths } from "date-fns";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    rent_amount: number;
    opening_balance?: number;
    lease_start?: string;
    is_prorated?: boolean;
    first_month_override?: number;
  };
}

export function RecordPaymentDialog({ open, onOpenChange, tenant }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const { mutate: createPayment, isPending } = useCreatePayment();
  const { data: allPayments } = usePayments();
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRent = Number(tenant.rent_amount) || 0;
  const leaseStart = tenant.lease_start ? parseISO(tenant.lease_start) : new Date();

  // Calculation Logic (Matches Dashboard)
  let firstMonthCharge = monthlyRent;
  if (tenant.first_month_override !== undefined && tenant.first_month_override !== null) {
    firstMonthCharge = Number(tenant.first_month_override);
  } else if (tenant.is_prorated) {
    const daysInMonth = getDaysInMonth(leaseStart);
    const daysRemaining = differenceInDays(endOfMonth(leaseStart), leaseStart) + 1;
    firstMonthCharge = (monthlyRent / daysInMonth) * daysRemaining;
  }

  const fullMonths = Math.max(0, differenceInMonths(startOfMonth(new Date()), startOfMonth(addMonths(leaseStart, 1))) + 1);
  const cumulativeExpected = firstMonthCharge + (monthlyRent * fullMonths) + (Number(tenant.opening_balance) || 0);

  const tenantPayments = allPayments?.filter(p => p.tenant_id === tenant.id) || [];
  const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = Math.round(cumulativeExpected - totalPaid);

  useEffect(() => {
    if (open) {
      setAmount(balanceDue > 0 ? balanceDue.toString() : "0");
      setMpesaCode("");
    }
  }, [open, balanceDue]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <div className="flex justify-between"><span>Accrued Dues:</span><span>KES {Math.round(cumulativeExpected).toLocaleString()}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Paid:</span><span>KES {totalPaid.toLocaleString()}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold text-red-600"><span>Balance:</span><span>KES {balanceDue.toLocaleString()}</span></div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); createPayment({ tenant_id: tenant.id, amount: parseFloat(amount), payment_month: currentMonth, mpesa_code: mpesaCode }, { onSuccess: () => onOpenChange(false) }); }} className="space-y-3">
            <div className="space-y-1"><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div className="space-y-1"><Label>M-Pesa Code</Label><Input value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} maxLength={10} /></div>
            <Button type="submit" className="w-full" disabled={isPending}>{isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Payment"}</Button>
          </form>

          <div className="border-t pt-3">
            <Label className="text-[10px] font-bold uppercase flex items-center gap-1 mb-2"><History className="h-3 w-3" /> Recent History</Label>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {tenantPayments.map(p => (
                <div key={p.id} className="flex justify-between p-2 bg-slate-50 border rounded text-[10px]">
                  <span>{p.payment_month} ({p.mpesa_code || 'Cash'})</span><span className="font-bold">KES {p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}