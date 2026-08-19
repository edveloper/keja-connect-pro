import { useMemo, useState } from "react";
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
import { ShowMore, useProgressiveList } from "@/components/ui/show-more";
import { COMPACT_PAGE_SIZE } from "@/lib/pagination";
import { buildArrearsReminder, whatsappLink } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "react-router-dom";

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

  const monthsNewestFirst = useMemo(
    () => [...(ledger?.months ?? [])].reverse(),
    [ledger?.months]
  );

  const monthPage = useProgressiveList(monthsNewestFirst, {
    pageSize: COMPACT_PAGE_SIZE,
    resetKey: tenant?.id ?? "",
  });
  const paymentPage = useProgressiveList(ledger?.payments ?? [], {
    pageSize: COMPACT_PAGE_SIZE,
    resetKey: tenant?.id ?? "",
  });

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
        <DialogContent className="max-w-2xl">
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
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account position */}
              <div className="grid grid-cols-3 gap-px rounded-lg border border-border overflow-hidden bg-border min-w-0">
                <div className="bg-card p-3 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold truncate">
                    Billed
                  </p>
                  <p className="text-sm font-bold tabular-nums mt-1 truncate">
                    {formatKES(ledger?.totalCharged ?? 0)}
                  </p>
                </div>
                <div className="bg-card p-3 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold truncate">
                    Paid
                  </p>
                  <p className="text-sm font-bold tabular-nums mt-1 truncate">
                    {formatKES(ledger?.totalApplied ?? 0)}
                  </p>
                </div>
                <div className="bg-card p-3 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold truncate">
                    {owes ? "Owes" : balance < 0 ? "In credit" : "Settled"}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums mt-1 truncate",
                      owes ? "text-destructive" : balance < 0 ? "text-success" : ""
                    )}
                  >
                    {formatKES(Math.abs(balance))}
                  </p>
                </div>
              </div>

              {reminder && (
                <div className="space-y-1.5">
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

                  {/* Asked here rather than on the dashboard: this is the one
                      moment the missing detail actually costs the landlord
                      something, so it is a prompt and not a nag. */}
                  {!landlordSettings?.payTo && (
                    <p className="text-sm text-muted-foreground">
                      This message will not say where to pay.{" "}
                      <Link
                        to="/settings"
                        className="text-primary underline underline-offset-2"
                        onClick={() => onOpenChange(false)}
                      >
                        Add your M-Pesa details
                      </Link>
                    </p>
                  )}
                </div>
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
                    <>
                      {/* Rows rather than a four-column table.
                       *
                       * The table carried `min-w-[26rem]`, so on a phone the
                       * statement scrolled sideways and the balance — the column
                       * that matters — was the one pushed off the edge. Here the
                       * running balance sits next to the month, with the detail
                       * on a second line, and nothing overflows at any width. */}
                      <ul className="divide-y divide-border">
                        {monthPage.visible.map((month) => (
                          <li key={month.month} className="py-3">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-sm font-medium min-w-0 truncate">
                                {month.label}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-semibold tabular-nums shrink-0",
                                  month.balance > 0
                                    ? "text-destructive"
                                    : month.balance < 0
                                      ? "text-success"
                                      : "text-muted-foreground"
                                )}
                              >
                                {month.balance > 0
                                  ? formatKES(month.balance)
                                  : month.balance < 0
                                    ? `${formatKES(Math.abs(month.balance))} ahead`
                                    : "Settled"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                              billed {month.charged.toLocaleString("en-KE")} · paid{" "}
                              {month.applied.toLocaleString("en-KE")}
                            </p>
                          </li>
                        ))}
                      </ul>

                      {monthPage.hasMore && (
                        <div className="mt-3">
                          <ShowMore
                            remaining={monthPage.remaining}
                            noun="earlier month"
                            onClick={monthPage.showMore}
                          />
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">
                        The figure on the right is the running balance carried forward, not
                        that month on its own.
                      </p>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="mt-3">
                  {(ledger?.payments.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paymentPage.visible.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-lg border border-border/60 p-3 space-y-1.5"
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
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
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
                                className="text-xs font-normal"
                              >
                                {allocation.label}: {allocation.amount.toLocaleString("en-KE")}
                              </Badge>
                            ))}
                          </div>

                          {payment.note && (
                            <p className="text-xs text-muted-foreground italic">
                              {payment.note}
                            </p>
                          )}
                        </div>
                      ))}
                      {paymentPage.hasMore && (
                        <ShowMore
                          remaining={paymentPage.remaining}
                          noun="older payment"
                          onClick={paymentPage.showMore}
                        />
                      )}

                      <p className="text-xs text-muted-foreground">
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
