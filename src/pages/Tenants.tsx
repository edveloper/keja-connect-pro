import { useEffect, useMemo, useState } from "react";
import { currentMonthKey } from "@/lib/month";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { TenantForm } from "@/components/tenants/TenantForm";
import type { TenantFormPayload } from "@/components/tenants/TenantForm";
import RecordPaymentDialog from "@/components/tenants/RecordPaymentDialog";
import {
  useTenants,
  useCreateTenant,
  useDeleteTenant,
  useUpdateTenant,
  useArchiveTenant,
} from "@/hooks/useTenants";
import TenantLedgerDialog from "@/components/tenants/TenantLedgerDialog";
import MpesaReconcileDialog from "@/components/payments/MpesaReconcileDialog";
import { formatKES } from "@/lib/number-formatter";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { useDashboardData } from "@/hooks/useDashboard";
import { formatKenyanPhone } from "@/lib/phone-validation";
import {
  Plus,
  Building2,
  Search,
  Trash2,
  Pencil,
  Download,
  Receipt,
  LogOut,
  Smartphone,
  Banknote,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTenantRiskSnapshots } from "@/hooks/useIntelligence";
import type { Tables } from "@/integrations/supabase/types";
import { useSearchParams } from "react-router-dom";
import { exportTenantsListExcel, type TenantExportRow } from "@/utils/exports/exportTenantsList";
import { toast } from "@/hooks/use-toast";

type Tenant = Tables<"tenants">;

type TenantWithUnit = Tenant & {
  units?: {
    id: string;
    unit_number: string;
    properties?: { id: string; name: string } | null;
  } | null;
};

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");
  const [financeScope, setFinanceScope] = useState<"month" | "all">("month");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithUnit | null>(null);
  const [payingTenant, setPayingTenant] = useState<TenantWithUnit | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<TenantWithUnit | null>(null);
  const [tenantToArchive, setTenantToArchive] = useState<TenantWithUnit | null>(null);
  const [ledgerTenant, setLedgerTenant] = useState<TenantWithUnit | null>(null);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const monthKey = currentMonthKey();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: tenants, isLoading } = useTenants();
  const { data: dashboardData } = useDashboardData(financeScope === "month" ? new Date() : null);
  const { data: riskSnapshots = [] } = useTenantRiskSnapshots(monthKey);
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const archiveTenant = useArchiveTenant();

  const tenantFinanceById = useMemo(() => {
    const map = new Map<
      string,
      { balance: number; payment_status: "paid" | "partial" | "unpaid" | "overpaid" }
    >();

    (dashboardData?.units ?? []).forEach((unit) => {
      if (!unit.tenant_id) return;
      map.set(unit.tenant_id, {
        balance: unit.balance,
        payment_status: unit.payment_status,
      });
    });

    return map;
  }, [dashboardData]);

  const groupedTenants = useMemo(() => {
    if (!tenants) return {};

    const filtered = tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone?.includes(searchTerm) ||
        t.units?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const propA = a.units?.properties?.name || "Unassigned";
      const propB = b.units?.properties?.name || "Unassigned";
      if (propA !== propB) return propA.localeCompare(propB);
      return (a.units?.unit_number || "").localeCompare(
        b.units?.unit_number || "",
        undefined,
        { numeric: true }
      );
    });

    return sorted.reduce((acc, tenant) => {
      const propName = tenant.units?.properties?.name || "Unassigned";
      acc[propName] ??= [];
      acc[propName].push(tenant);
      return acc;
    }, {} as Record<string, TenantWithUnit[]>);
  }, [tenants, searchTerm]);

  const handleCreate = (data: TenantFormPayload, addAnother?: boolean) => {
    createTenant.mutate(
      { tenantData: data, addAnother },
      {
        onSuccess: ({ addAnother }) => {
          if (!addAnother) setIsAddOpen(false);
        },
      }
    );
  };

  const hasTenantResults = Object.keys(groupedTenants).length > 0;
  const riskByTenant = useMemo(() => {
    const map = new Map<string, { level: string; score: number }>();
    riskSnapshots.forEach((item) => {
      map.set(item.tenant_id, { level: item.risk_level, score: item.risk_score });
    });
    return map;
  }, [riskSnapshots]);

  const tenantExportRows = useMemo<TenantExportRow[]>(() => {
    return (tenants ?? []).map((tenant) => {
      const finance = tenantFinanceById.get(tenant.id);
      const balance = finance?.balance ?? 0;
      const risk = riskByTenant.get(tenant.id);
      return {
        tenant_name: tenant.name,
        phone: formatKenyanPhone(tenant.phone),
        property_name: tenant.units?.properties?.name ?? "Unassigned",
        unit_number: tenant.units?.unit_number ?? "-",
        rent_amount: tenant.rent_amount ?? 0,
        balance,
        payment_status: finance?.payment_status ?? "paid",
        risk_level: risk?.level ?? "low",
        risk_score: risk?.score ?? 0,
        lease_start: tenant.lease_start,
      };
    });
  }, [tenants, tenantFinanceById, riskByTenant]);

  useEffect(() => {
    const tenantId = searchParams.get("tenantId");
    if (!tenantId || !tenants?.length) return;
    const found = tenants.find((t) => t.id === tenantId);
    if (!found) return;
    setLedgerTenant(found);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("tenantId");
      return p;
    });
  }, [searchParams, tenants, setSearchParams]);

  return (
    <PageContainer
      title="Tenants"
      subtitle={financeScope === "month" ? "Directory & Payment Status (This Month)" : "Directory & Payment Status (All Time)"}
    >
      <div className="surface-panel mb-6 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center">
            <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1">
              <Button
                type="button"
                size="sm"
                variant={financeScope === "month" ? "default" : "ghost"}
                className="h-8 px-3 text-xs"
                onClick={() => setFinanceScope("month")}
              >
                This Month
              </Button>
              <Button
                type="button"
                size="sm"
                variant={financeScope === "all" ? "default" : "ghost"}
                className="h-8 px-3 text-xs"
                onClick={() => setFinanceScope("all")}
              >
                All Time
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone or unit..."
              className="pl-10 h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            <Button
              variant="outline"
              className="h-12 w-full sm:w-auto"
              onClick={() => setIsReconcileOpen(true)}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Paste M-Pesa
            </Button>

            <Button
              variant="outline"
              className="h-12 w-full sm:w-auto"
              onClick={async () => {
                try {
                  await exportTenantsListExcel(tenantExportRows);
                } catch (error) {
                  toast({
                    title: "Export failed",
                    description: getSupabaseErrorMessage(error),
                    variant: "destructive",
                  });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Tenant List
            </Button>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 w-full sm:w-auto">
                  <Plus className="h-5 w-5 mr-1" /> Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl border border-border/70 bg-card/95 p-5 shadow-card backdrop-blur-md">
                <DialogHeader>
                  <DialogTitle className="tracking-tight">Add Tenant</DialogTitle>
                </DialogHeader>
                <TenantForm
                  onSubmit={handleCreate}
                  onCancel={() => setIsAddOpen(false)}
                  isLoading={createTenant.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {payingTenant && (
        <RecordPaymentDialog
          open
          onOpenChange={(open) => !open && setPayingTenant(null)}
          tenant={{
            tenant_id: payingTenant.id,
            tenant_name: payingTenant.name,
            unit_number: payingTenant.units?.unit_number ?? "-",
            property_name: payingTenant.units?.properties?.name ?? null,
            balance: tenantFinanceById.get(payingTenant.id)?.balance ?? 0,
          }}
        />
      )}

      {editingTenant && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border/70 bg-card/95 p-5 shadow-card backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="tracking-tight">Edit Tenant</DialogTitle>
            </DialogHeader>
            <TenantForm
              tenant={editingTenant}
              onSubmit={(data) => {
                updateTenant.mutate(
                  {
                    id: editingTenant.id,
                    name: data.name,
                    phone: data.phone,
                    rent_amount: data.rent_amount,
                    unit_id: data.unit_id,
                    lease_start: data.lease_start,
                    opening_balance: data.opening_balance,
                    security_deposit: data.security_deposit,
                    first_month_override: data.first_month_override,
                    is_prorated: data.is_prorated,
                  },
                  {
                    onSuccess: () => {
                      setIsEditOpen(false);
                      setEditingTenant(null);
                    },
                  }
                );
              }}
              onCancel={() => {
                setIsEditOpen(false);
                setEditingTenant(null);
              }}
              isLoading={updateTenant.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-8 pb-24">
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : !hasTenantResults ? (
          <Card className="surface-panel p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              {searchTerm.trim() ? "No tenants match your search" : "No tenants added yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchTerm.trim()
                ? "Try a different search term."
                : "Add your first tenant to get started."}
            </p>
          </Card>
        ) : (
          Object.entries(groupedTenants).map(([propertyName, propertyTenants]) => (
            <div key={propertyName} className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <h2 className="text-xs font-bold uppercase tracking-wider">{propertyName}</h2>
              </div>

              {propertyTenants.map((tenant) => {
                const finance = tenantFinanceById.get(tenant.id);
                const balance = finance?.balance ?? 0;
                const paymentStatus = finance?.payment_status ?? "paid";
                const statusLabel =
                  paymentStatus === "overpaid"
                    ? "Overpaid"
                    : paymentStatus === "paid"
                      ? "Paid"
                      : paymentStatus === "partial"
                        ? "Partial"
                        : "Arrears";
                const statusClassName =
                  paymentStatus === "overpaid"
                    ? "bg-accent text-accent-foreground border-accent"
                    : paymentStatus === "paid"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : paymentStatus === "partial"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-100 text-red-700 border-red-200";

                return (
                  <Card
                    key={tenant.id}
                    className="p-4 relative elevate cursor-pointer overflow-hidden"
                    role="button"
                    tabIndex={0}
                    onClick={() => setLedgerTenant(tenant)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLedgerTenant(tenant);
                      }
                    }}
                    aria-label={`Open ${tenant.name}'s statement`}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5",
                        balance > 0
                          ? "bg-red-500"
                          : balance < 0
                            ? "bg-emerald-500"
                            : "bg-muted"
                      )}
                    />

                    <div className="flex items-start justify-between gap-3">
                      {/* min-w-0 lets this column shrink. Without it the row
                          could not compress and pushed the card wider than the
                          viewport, scrolling the whole page sideways. */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="font-bold truncate max-w-full">{tenant.name}</h3>
                          <Badge className={cn("text-[10px] uppercase tracking-wide border shrink-0", statusClassName)}>
                            {statusLabel}
                          </Badge>
                          {riskByTenant.get(tenant.id)?.level === "high" && (
                            <Badge variant="destructive" className="text-[10px] uppercase tracking-wide shrink-0">
                              High risk
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Unit {tenant.units?.unit_number} | {formatKenyanPhone(tenant.phone)}
                        </div>
                        <div className="text-xs mt-1 truncate">
                          {balance > 0 ? (
                            <span className="font-semibold text-destructive">
                              Owes {formatKES(balance)}
                            </span>
                          ) : balance < 0 ? (
                            <span className="font-semibold text-primary">
                              In credit {formatKES(Math.abs(balance))}
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-700">Up to date</span>
                          )}
                        </div>
                      </div>

                      {/* One primary action plus a menu. Five side-by-side
                          buttons did not fit on a phone and gave no labels. */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayingTenant(tenant);
                          }}
                        >
                          <Banknote className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">Record Payment</span>
                          <span className="sr-only sm:hidden">Record payment for {tenant.name}</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`More actions for ${tenant.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLedgerTenant(tenant);
                              }}
                            >
                              <Receipt className="mr-2 h-4 w-4" />
                              View statement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTenant(tenant);
                                setIsEditOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setTenantToArchive(tenant);
                              }}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Move out
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTenantToDelete(tenant);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      <AlertDialog
        open={!!tenantToDelete}
        onOpenChange={(open) => {
          if (!open) setTenantToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This erases {tenantToDelete?.name ?? "this tenant"} along with every charge and
              payment on their record, which will change the totals in months you have already
              closed. If they are moving out, use Move Out instead — it keeps their history and
              frees the unit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!tenantToDelete) return;
                deleteTenant.mutate(tenantToDelete.id, {
                  onSettled: () => setTenantToDelete(null),
                });
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!tenantToArchive}
        onOpenChange={(open) => {
          if (!open) setTenantToArchive(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {tenantToArchive?.name ?? "this tenant"} out?</AlertDialogTitle>
            <AlertDialogDescription>
              Their payment history stays on record and Unit{" "}
              {tenantToArchive?.units?.unit_number ?? ""} becomes available again. They will stop
              being billed from next month.
              {(() => {
                const outstanding = tenantToArchive
                  ? tenantFinanceById.get(tenantToArchive.id)?.balance ?? 0
                  : 0;
                if (outstanding > 0) {
                  return ` They still owe ${formatKES(outstanding)} — settle or write this off first if you need the books clean.`;
                }
                if (tenantToArchive?.security_deposit) {
                  return ` Remember to return or offset their ${formatKES(tenantToArchive.security_deposit)} deposit.`;
                }
                return "";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!tenantToArchive) return;
                archiveTenant.mutate(
                  { id: tenantToArchive.id },
                  { onSettled: () => setTenantToArchive(null) }
                );
              }}
            >
              Move out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TenantLedgerDialog
        open={Boolean(ledgerTenant)}
        onOpenChange={(open) => !open && setLedgerTenant(null)}
        tenant={
          ledgerTenant
            ? {
                id: ledgerTenant.id,
                name: ledgerTenant.name,
                phone: ledgerTenant.phone,
                unitNumber: ledgerTenant.units?.unit_number ?? null,
                propertyName: ledgerTenant.units?.properties?.name ?? null,
              }
            : null
        }
      />

      <MpesaReconcileDialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen} />
    </PageContainer>
  );
}
