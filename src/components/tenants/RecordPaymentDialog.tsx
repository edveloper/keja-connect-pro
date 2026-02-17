import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePayment } from "@/hooks/usePayments";
import { toast } from "@/hooks/use-toast";
import type { PaymentDialogTenant } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: PaymentDialogTenant;
}

export default function RecordPaymentDialog({ open, onOpenChange, tenant }: Props) {
  const [amount, setAmount] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mpesaCode, setMpesaCode] = useState("");
  const [note, setNote] = useState("");

  const createPayment = useCreatePayment();

  const handleSubmit = () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    createPayment.mutate(
      {
        tenant_id: tenant.tenant_id,
        amount: numericAmount,
        payment_month: paymentMonth,
        mpesa_code: mpesaCode || null,
        note: note || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount("");
          setPaymentMonth(new Date().toISOString().slice(0, 7));
          setMpesaCode("");
          setNote("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border border-border/70 bg-card/95 p-5 shadow-card backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="surface-panel rounded-xl p-3 text-sm space-y-1">
            <div className="font-semibold">{tenant.tenant_name}</div>
            <div className="text-muted-foreground">
              Unit {tenant.unit_number}
              {tenant.property_name ? ` | ${tenant.property_name}` : ""}
            </div>
            {tenant.balance !== 0 && (
              <div className="text-xs font-bold text-red-600">
                Outstanding balance: KES {tenant.balance.toLocaleString()}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Amount Paid (KES)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Payment Month</Label>
            <Input type="month" value={paymentMonth} onChange={(e) => setPaymentMonth(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Mpesa Code (optional)</Label>
            <Input
              value={mpesaCode}
              onChange={(e) => setMpesaCode(e.target.value)}
              placeholder="QWE123ABC"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any notes" />
          </div>

          <Button className="w-full h-11 shadow-sm" onClick={handleSubmit} disabled={createPayment.isPending}>
            {createPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
