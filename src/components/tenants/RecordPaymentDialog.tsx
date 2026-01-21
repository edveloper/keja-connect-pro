// src/components/tenants/RecordPaymentDialog.tsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, History, CheckCircle, Info } from "lucide-react";
import { formatKES } from "@/lib/number-formatter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DashboardUnit } from "@/types";

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: DashboardUnit | null;
};

interface PaymentHistory {
  id: string;
  amount: number;
  payment_date: string;
  payment_month: string;
  mpesa_code: string | null;
  note: string | null;
  created_at: string;
}

interface AllocationResult {
  charge_id: string | null;
  charge_month: string;
  charge_type: string;
  amount_allocated: number;
}

export function RecordPaymentDialog({ open, onOpenChange, tenant }: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  
  const [amount, setAmount] = useState<string>("");
  const [mpesaCode, setMpesaCode] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [allocationPreview, setAllocationPreview] = useState<AllocationResult[] | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && tenant) {
      // Default to outstanding balance
      const defaultAmount = tenant.balance > 0 ? tenant.balance : 0;
      setAmount(defaultAmount > 0 ? String(defaultAmount) : "");
      setMpesaCode("");
      setNote("");
      setAllocationPreview(null);
      loadPaymentHistory();
    }
  }, [open, tenant]);

  // Load payment history for this tenant
  const loadPaymentHistory = async () => {
    if (!tenant?.tenant_id) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (err: any) {
      console.error('Failed to load payment history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Preview how payment will be allocated
  const previewAllocation = async (amountValue: string) => {
    const amt = parseFloat(amountValue);
    if (!tenant?.tenant_id || !Number.isFinite(amt) || amt <= 0) {
      setAllocationPreview(null);
      return;
    }

    try {
      // Get charges and existing allocations to simulate allocation
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      const { data: charges } = await supabase
        .from('charges')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .lte('charge_month', currentMonth)
        .order('charge_month', { ascending: true });

      const { data: allocations } = await supabase
        .from('payment_allocations')
        .select(`
          *,
          payments!inner(tenant_id)
        `)
        .eq('payments.tenant_id', tenant.tenant_id)
        .lte('applied_month', currentMonth);

      if (!charges) return;

      // Calculate which charges need payment
      const chargesByMonth: Record<string, { total: number; allocated: number; charges: any[] }> = {};
      
      charges.forEach(charge => {
        if (!chargesByMonth[charge.charge_month]) {
          chargesByMonth[charge.charge_month] = { total: 0, allocated: 0, charges: [] };
        }
        chargesByMonth[charge.charge_month].total += charge.amount;
        chargesByMonth[charge.charge_month].charges.push(charge);
      });

      (allocations || []).forEach((alloc: any) => {
        if (chargesByMonth[alloc.applied_month]) {
          chargesByMonth[alloc.applied_month].allocated += alloc.amount;
        }
      });

      // Simulate allocation
      const preview: AllocationResult[] = [];
      let remaining = amt;

      // Sort months chronologically
      const sortedMonths = Object.keys(chargesByMonth).sort();

      for (const month of sortedMonths) {
        const monthData = chargesByMonth[month];
        const balance = monthData.total - monthData.allocated;
        
        if (balance > 0 && remaining > 0) {
          const allocate = Math.min(remaining, balance);
          preview.push({
            charge_id: monthData.charges[0]?.id || null,
            charge_month: month,
            charge_type: monthData.charges[0]?.type || 'rent',
            amount_allocated: allocate,
          });
          remaining -= allocate;
        }
      }

      // If there's remaining amount (overpayment), show as credit
      if (remaining > 0) {
        const nextMonth = format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'yyyy-MM');
        preview.push({
          charge_id: null,
          charge_month: nextMonth,
          charge_type: 'credit',
          amount_allocated: remaining,
        });
      }

      setAllocationPreview(preview);
    } catch (err) {
      console.error('Preview allocation error:', err);
      setAllocationPreview(null);
    }
  };

  // Handle amount change with preview
  const handleAmountChange = (value: string) => {
    setAmount(value);
    previewAllocation(value);
  };

  // Submit payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant?.tenant_id) return;
    
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ 
        title: "Invalid amount", 
        description: "Enter a valid payment amount", 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const paymentMonth = format(new Date(), 'yyyy-MM');

      // Use the smart allocation RPC function
      const { data, error } = await (supabase as any).rpc(
        'record_payment_with_smart_allocation',
        {
          p_tenant_id: tenant.tenant_id,
          p_amount: amt,
          p_payment_month: paymentMonth,
          p_payment_date: format(new Date(), 'yyyy-MM-dd'),
          p_mpesa_code: mpesaCode || null,
          p_note: note || null,
          p_user_id: userId,
        }
      );

      if (error) throw error;

      // Show success with allocation details
      const allocations = data?.[0]?.allocations || data?.allocations || [];
      const remainingCredit = data?.[0]?.remaining_credit || data?.remaining_credit || 0;

      let description = `Payment of ${formatKES(amt)} recorded successfully.`;
      if (remainingCredit > 0) {
        description += ` Credit of ${formatKES(remainingCredit)} will be applied to future charges.`;
      }

      toast({
        title: "Payment Recorded",
        description,
      });

      // Refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-balance'] });

      onOpenChange(false);
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({
        title: "Error",
        description: err?.message || "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete payment
  const handleDelete = async (paymentId: string) => {
    if (!window.confirm("Delete this payment? All allocations will be removed.")) return;

    setIsDeleting(paymentId);
    try {
      // Delete allocations first (they reference the payment)
      await supabase
        .from('payment_allocations')
        .delete()
        .eq('payment_id', paymentId);

      // Then delete payment
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Payment removed" });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      loadPaymentHistory();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({
        title: "Error",
        description: err?.message || "Failed to delete payment",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {tenant.tenant_name} • Unit {tenant.unit_number}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Rent:</span>
              <span className="font-medium">{formatKES(tenant.rent_amount || 0)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Charges:</span>
              <span className="font-medium">{formatKES(tenant.total_charges)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid:</span>
              <span className="font-medium">{formatKES(tenant.total_allocated)}</span>
            </div>
            
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{tenant.balance <= 0 ? "Credit" : "Outstanding Balance"}</span>
              <span className={tenant.balance <= 0 ? "text-green-600" : "text-red-600"}>
                {formatKES(Math.abs(tenant.balance))}
              </span>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter amount"
                required
              />
            </div>

            {/* Allocation Preview */}
            {allocationPreview && allocationPreview.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <div className="font-semibold mb-2">This payment will be applied to:</div>
                  <div className="space-y-1">
                    {allocationPreview.map((alloc, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>
                          {alloc.charge_type === 'credit' 
                            ? `💰 Credit (${format(new Date(alloc.charge_month + '-01'), 'MMM yyyy')})`
                            : `${format(new Date(alloc.charge_month + '-01'), 'MMM yyyy')} ${alloc.charge_type}`
                          }
                        </span>
                        <span className="font-medium">{formatKES(alloc.amount_allocated)}</span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="mpesa">M-Pesa Code (Optional)</Label>
              <Input
                id="mpesa"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                placeholder="e.g., SH3X4Y5Z6A"
                maxLength={10}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Record Payment
                </>
              )}
            </Button>
          </form>

          {/* Payment History */}
          <div className="border-t pt-3">
            <Label className="text-xs font-semibold uppercase flex items-center gap-1 mb-2">
              <History className="h-3 w-3" /> Recent Payments
            </Label>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">
                No payments recorded yet
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="group flex justify-between items-center p-2 bg-slate-50 border rounded text-xs hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{formatKES(payment.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                        {payment.mpesa_code && ` • ${payment.mpesa_code}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(payment.id)}
                      disabled={isDeleting === payment.id}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      {isDeleting === payment.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;