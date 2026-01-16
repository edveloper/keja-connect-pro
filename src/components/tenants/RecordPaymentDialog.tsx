import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePayment, usePayments, useDeletePayment } from "@/hooks/usePayments";
import { Loader2, History, Trash2 } from "lucide-react";
import { differenceInMonths, startOfMonth, parseISO, getDaysInMonth, differenceInDays, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

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
  const { mutate: deletePayment } = useDeletePayment();
  const { data: allPayments } = usePayments();
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRent = Number(tenant.rent_amount) || 0;
  const leaseStart = tenant.lease_start ? parseISO(tenant.lease_start) : new Date();

  // Calculation Logic (Current Balance)
  let firstMonthCharge = monthlyRent;
  if (tenant.first_month_override !== undefined && tenant.first_month_override !== null) {
    firstMonthCharge = Number(tenant.first_month_override);
  } else if (tenant.is_prorated) {
    const daysInMonth = getDaysInMonth(leaseStart);
    const daysRemaining = differenceInDays(endOfMonth(leaseStart), leaseStart) + 1;
    firstMonthCharge = (monthlyRent / daysInMonth) * daysRemaining;
  }

  const monthsPassed = Math.max(0, differenceInMonths(startOfMonth(new Date()), startOfMonth(leaseStart)));
  const totalExpected = (Number(tenant.opening_balance) || 0) + firstMonthCharge + (monthlyRent * monthsPassed);
  
  const tenantPayments = allPayments?.filter(p => p.tenant_id === tenant.id) || [];
  const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.round(totalExpected - totalPaid);

  useEffect(() => {
    if (open) {
      setAmount(balance > 0 ? balance.toString() : "0");
      setMpesaCode("");
    }
  }, [open, balance]);
  
  const handleDelete = (paymentId: string) => {
    if (confirm("Delete this payment record?")) deletePayment(paymentId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record Payment: {tenant.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2">
            <div className="flex justify-between font-medium">
              <span>Monthly Rent:</span>
              <span>KES {monthlyRent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{balance <= 0 ? "Credit (Forward):" : "Arrears Due:"}</span>
              <span className={balance <= 0 ? "text-emerald-600" : "text-red-600"}>
                KES {Math.abs(balance).toLocaleString()}
              </span>
            </div>
          </div>

          <form onSubmit={(e) => { 
            e.preventDefault(); 
            createPayment({ tenant_id: tenant.id, amount: parseFloat(amount), payment_month: currentMonth, mpesa_code: mpesaCode }, { onSuccess: () => onOpenChange(false) }); 
          }} className="space-y-3">
            <div className="space-y-1"><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div className="space-y-1"><Label>M-Pesa Code</Label><Input value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} maxLength={10} /></div>
            <Button type="submit" className="w-full" disabled={isPending}>{isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Payment"}</Button>
          </form>

          <div className="border-t pt-3">
            <Label className="text-[10px] font-bold uppercase flex items-center gap-1 mb-2"><History className="h-3 w-3" /> History</Label>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {tenantPayments.map(p => (
                <div key={p.id} className="group flex justify-between items-center p-2 bg-slate-50 border rounded text-[10px]">
                  <span>{p.payment_month}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">KES {p.amount.toLocaleString()}</span>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}