import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import {
  findPaymentByMpesaCode,
  useCreatePayment,
  type DuplicatePayment,
} from "@/hooks/usePayments";
import { useTenantLedger } from "@/hooks/useTenantLedger";
import { formatKES } from "@/lib/number-formatter";
import { currentDateKey, currentMonthKey, formatMonthLabel } from "@/lib/month";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { PaymentDialogTenant } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: PaymentDialogTenant;
}

export default function RecordPaymentDialog({ open, onOpenChange, tenant }: Props) {
  const [amount, setAmount] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(currentMonthKey());
  const [paymentDate, setPaymentDate] = useState(currentDateKey());
  const [mpesaCode, setMpesaCode] = useState("");
  const [note, setNote] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicatePayment | null>(null);

  const createPayment = useCreatePayment();
  const { data: ledger } = useTenantLedger(open ? tenant.tenant_id : null);

  function reset() {
    setAmount("");
    setPaymentMonth(currentMonthKey());
    setPaymentDate(currentDateKey());
    setMpesaCode("");
    setNote("");
    setDuplicate(null);
  }

  // Warn about a code that has already been recorded before the user submits,
  // rather than surfacing a constraint violation afterwards.
  useEffect(() => {
    const code = mpesaCode.trim();
    if (code.length < 6) {
      setDuplicate(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const match = await findPaymentByMpesaCode(code);
      if (!cancelled) setDuplicate(match);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mpesaCode]);

  const numericAmount = Math.round(Number(amount));
  const hasAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  /**
   * Where this payment will actually land. Payments clear the oldest unpaid
   * month first, which is rarely the month in the picker — the dialog used to
   * let the user believe otherwise.
   */
  const allocationPreview = useMemo(() => {
    if (!hasAmount || !ledger) return [];

    const outstanding = ledger.months
      .filter((m) => m.movement > 0)
      .map((m) => ({ label: m.label, owed: m.movement }));

    const plan: Array<{ label: string; amount: number; isCredit?: boolean }> = [];
    let remaining = numericAmount;

    for (const month of outstanding) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, month.owed);
      plan.push({ label: month.label, amount: take });
      remaining -= take;
    }

    if (remaining > 0) {
      plan.push({
        label: `${formatMonthLabel(paymentMonth)} (credit)`,
        amount: remaining,
        isCredit: true,
      });
    }

    return plan;
  }, [hasAmount, numericAmount, ledger, paymentMonth]);

  const handleSubmit = () => {
    if (!hasAmount) {
      toast({
        title: "Enter an amount",
        description: "The payment amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    createPayment.mutate(
      {
        tenant_id: tenant.tenant_id,
        amount: numericAmount,
        payment_month: paymentMonth,
        payment_date: paymentDate,
        mpesa_code: mpesaCode || null,
        note: note || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      }
    );
  };

  const outstanding = tenant.balance ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-5 shadow-card backdrop-blur-md">
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
            {outstanding > 0 && (
              <div className="text-xs font-bold text-destructive">
                Owes {formatKES(outstanding)}
              </div>
            )}
            {outstanding < 0 && (
              <div className="text-xs font-bold text-emerald-600">
                In credit {formatKES(Math.abs(outstanding))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="payment-amount" className="text-xs font-bold">
              Amount Paid (KES)
            </Label>
            <Input
              id="payment-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="payment-date" className="text-xs font-bold">
                Date Received
              </Label>
              <Input
                id="payment-date"
                type="date"
                max={currentDateKey()}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="payment-month" className="text-xs font-bold">
                Rent Month
              </Label>
              <Input
                id="payment-month"
                type="month"
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
              />
            </div>
          </div>

          {allocationPreview.length > 0 && (
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">This payment clears:</span>
                <ul className="mt-1.5 space-y-0.5">
                  {allocationPreview.map((row) => (
                    <li key={row.label} className="flex justify-between gap-3">
                      <span className={row.isCredit ? "text-emerald-700" : ""}>{row.label}</span>
                      <span className="font-semibold tabular-nums">{formatKES(row.amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-muted-foreground">
                  Oldest arrears are always cleared first.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label htmlFor="mpesa-code" className="text-xs font-bold">
              M-Pesa Code (optional)
            </Label>
            <Input
              id="mpesa-code"
              value={mpesaCode}
              onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
              placeholder="QWE123ABC"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          {duplicate && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Already recorded: {formatKES(duplicate.amount)} for {duplicate.tenantName} on{" "}
                {format(new Date(duplicate.paymentDate), "d MMM yyyy")}. Recording it again will
                overstate your collections.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label htmlFor="payment-note" className="text-xs font-bold">
              Note (optional)
            </Label>
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any notes"
            />
          </div>

          <Button
            className="w-full h-11 shadow-sm"
            onClick={handleSubmit}
            disabled={createPayment.isPending || !hasAmount || Boolean(duplicate)}
          >
            {createPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
