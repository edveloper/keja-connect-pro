import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePayment } from "@/hooks/usePayments";
import type { PaymentDialogTenant } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: PaymentDialogTenant;
}

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  tenant,
}: Props) {
  const [amount, setAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [note, setNote] = useState("");

  const createPayment = useCreatePayment();

  const handleSubmit = () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    createPayment.mutate(
      {
        tenant_id: tenant.tenant_id,
        amount: numericAmount,
        payment_month: new Date().toISOString().slice(0, 7),
        mpesa_code: mpesaCode || null,
        note: note || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount("");
          setMpesaCode("");
          setNote("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tenant summary */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
            <div className="font-semibold">{tenant.tenant_name}</div>
            <div className="text-muted-foreground">
              Unit {tenant.unit_number}
              {tenant.property_name ? ` • ${tenant.property_name}` : ""}
            </div>
            {tenant.balance !== 0 && (
              <div className="text-xs font-bold text-red-600">
                Outstanding balance: KES {tenant.balance.toLocaleString()}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs font-bold">Amount Paid (KES)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
            />
          </div>

          {/* Mpesa */}
          <div className="space-y-1">
            <label className="text-xs font-bold">Mpesa Code (optional)</label>
            <Input
              value={mpesaCode}
              onChange={(e) => setMpesaCode(e.target.value)}
              placeholder="QWE123ABC"
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-xs font-bold">Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any notes"
            />
          </div>

          <Button
            className="w-full h-11"
            onClick={handleSubmit}
            disabled={createPayment.isPending}
          >
            {createPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
