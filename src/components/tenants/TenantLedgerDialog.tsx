import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, MessageCircle } from "lucide-react";
import { useTenantLedger } from "@/hooks/useTenantLedger";
import { useDeletePayment } from "@/hooks/usePayments";
import { useLandlordSettings } from "@/hooks/useLandlordSettings";
import { formatKES } from "@/lib/number-formatter";
import { buildArrearsReminder, whatsappLink } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    phone: string | null;
    unitNumber?: string | null;
    propertyName?: string | null;
  } | null;
}

export function TenantLedgerDialog({ open, onOpenChange, tenant }: Props) {
  const { data: ledger, isLoading } = useTenantLedger(open ? tenant?.id : null);
  const deletePayment = useDeletePayment();
  const { data: landlordSettings } = useLandlordSettings();
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  if (!tenant) return null;

  const balance = ledger?.balance ?? 0;
  const owes = balance > 0;

  const reminder =
    tenant.phone && owes
      ? buildArrearsReminder({
          tenantName: tenant.name,
          unitNumber: tenant.unitNumber ?? null,
          amount: balance,
          monthsBehind: (ledger?.months ?? []).filter((m) => m.movement > 0).length,
          payTo: landlordSettings?.payTo || null,
        })
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tenant.name}</DialogTitle>
            <DialogDescription>
              {tenant.unitNumber ? `Unit ${tenant.unitNumber}` : "No unit"}
              {tenant.propertyName ? ` · ${tenant.propertyName}` : ""}
              {tenant.phone ? ` · ${tenant.phone}` : ""}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account position */}
              <div className="grid grid-cols-3 gap-px rounded-xl border border-border overflow-hidden bg-border">
                <div className="bg-card p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Billed
                  </p>
                  <p className="text-sm font-black tabular-nums mt-1">
                    {formatKES(ledger?.totalCharged ?? 0)}
                  </p>
                </div>
                <div className="bg-card p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Paid
                  </p>
                  <p className="text-sm font-black tabular-nums mt-1">
                    {formatKES(ledger?.totalApplied ?? 0)}
                  </p>
                </div>
                <div className="bg-card p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {owes ? "Owes" : balance < 0 ? "In credit" : "Settled"}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-black tabular-nums mt-1",
                      owes ? "text-destructive" : balance < 0 ? "text-emerald-600" : ""
                    )}
                  >
                    {formatKES(Math.abs(balance))}
                  </p>
                </div>
              </div>

              {reminder && (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={whatsappLink(tenant.phone!, reminder)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send reminder on WhatsApp
                  </a>
                </Button>
              )}

              <Tabs defaultValue="months">
                <TabsList className="w-full">
                  <TabsTrigger value="months" className="flex-1">
                    Month by month
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex-1">
                    Payments ({ledger?.payments.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="months" className="mt-3">
                  {(ledger?.months.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nothing billed yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[26rem]">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="text-left font-bold py-2">Month</th>
                            <th className="text-right font-bold py-2">Billed</th>
                            <th className="text-right font-bold py-2">Paid</th>
                            <th className="text-right font-bold py-2">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...(ledger?.months ?? [])].reverse().map((month) => (
                            <tr key={month.month} className="border-t border-border/60">
                              <td className="py-2 font-medium">{month.label}</td>
                              <td className="py-2 text-right tabular-nums">
                                {month.charged.toLocaleString("en-KE")}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                {month.applied.toLocaleString("en-KE")}
                              </td>
                              <td
                                className={cn(
                                  "py-2 text-right tabular-nums font-semibold",
                                  month.balance > 0
                                    ? "text-destructive"
                                    : month.balance < 0
                                      ? "text-emerald-600"
                                      : "text-muted-foreground"
                                )}
                              >
                                {month.balance.toLocaleString("en-KE")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Balance is the running total carried forward, not the month on its own.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="mt-3">
                  {(ledger?.payments.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ledger?.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-xl border border-border/60 p-3 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold tabular-nums">
                                {formatKES(payment.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.paidOn), "d MMM yyyy")}
                                {payment.mpesaCode ? ` · ${payment.mpesaCode}` : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setPaymentToDelete(payment.id)}
                              aria-label={`Remove payment of ${formatKES(payment.amount)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {payment.appliedTo.map((allocation) => (
                              <Badge
                                key={`${payment.id}-${allocation.month}`}
                                variant="secondary"
                                className="text-[10px] font-normal"
                              >
                                {allocation.label}: {allocation.amount.toLocaleString("en-KE")}
                              </Badge>
                            ))}
                          </div>

                          {payment.note && (
                            <p className="text-[11px] text-muted-foreground italic">
                              {payment.note}
                            </p>
                          )}
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground">
                        Tags show which months each payment actually cleared. Oldest arrears
                        are always paid off first.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(paymentToDelete)}
        onOpenChange={(next) => !next && setPaymentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The tenant's remaining payments will be reapplied to their oldest unpaid
              months, so their balance will change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!paymentToDelete) return;
                deletePayment.mutate(paymentToDelete, {
                  onSettled: () => setPaymentToDelete(null),
                });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TenantLedgerDialog;
