import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Smartphone, Users, X } from "lucide-react";

import { TenantForm, type TenantFormPayload } from "@/components/tenants/TenantForm";
import RecordPaymentDialog from "@/components/tenants/RecordPaymentDialog";
import TenantLedgerDialog from "@/components/tenants/TenantLedgerDialog";
import MpesaReconcileDialog from "@/components/payments/MpesaReconcileDialog";
import { TenantRow, type TenantRowData } from "@/components/tenants/TenantRow";
import { ShowMore, useProgressiveList } from "@/components/ui/show-more";

import {
  useTenants,
  useCreateTenant,
  useDeleteTenant,
  useUpdateTenant,
  useArchiveTenant,
} from "@/hooks/useTenants";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTenantBalances } from "@/hooks/useTenantBalances";
import { useLandlordSettings } from "@/hooks/useLandlordSettings";

import { formatKES } from "@/lib/number-formatter";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { buildArrearsReminder, whatsappLink } from "@/lib/reminders";
import { formatKenyanPhone } from "@/lib/phone-validation";
import { cn } from "@/lib/utils";
import { exportTenantsListExcel, type TenantExportRow } from "@/utils/exports/exportTenantsList";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import type { UnitStatus } from "@/components/ui/status-badge";

type Tenant = Tables<"tenants">;
type TenantWithUnit = Tenant & {
  units?: {
    id: string;
    unit_number: string;
    properties?: { id: string; name: string } | null;
  } | null;
};

type Filter = "all" | "owing" | "settled";
type SortBy = "owed" | "name" | "unit";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "owing", label: "Owing" },
  { value: "settled", label: "Up to date" },
  { value: "all", label: "Everyone" },
];

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");
  // Opens on the chase list, because that is what this screen is for.
  const [filter, setFilter] = useState<Filter>("owing");
  const [sortBy, setSortBy] = useState<SortBy>("owed");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithUnit | null>(null);
  const [payingTenant, setPayingTenant] = useState<TenantWithUnit | null>(null);
  const [ledgerTenant, setLedgerTenant] = useState<TenantWithUnit | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<TenantWithUnit | null>(null);
  const [tenantToArchive, setTenantToArchive] = useState<TenantWithUnit | null>(null);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const { data: tenants, isLoading } = useTenants();
  const { data: dashboardData } = useDashboardData(new Date());
  const { data: landlordSettings } = useLandlordSettings();

  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const archiveTenant = useArchiveTenant();

  const rentByTenant = useMemo(() => {
    const map = new Map<string, number>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.rent_amount ?? 0));
    return map;
  }, [tenants]);

  const { data: balances } = useTenantBalances(rentByTenant);

  /** This month's payment status, used for the colour rule only. */
  const statusByTenant = useMemo(() => {
    const map = new Map<string, UnitStatus>();
    (dashboardData?.units ?? []).forEach((u) => {
      if (!u.tenant_id) return;
      map.set(
        u.tenant_id,
        u.payment_status === "paid" || u.payment_status === "overpaid"
          ? "paid"
          : u.payment_status === "partial"
            ? "partial"
            : "arrears"
      );
    });
    return map;
  }, [dashboardData]);

  const rows = useMemo<TenantRowData[]>(() => {
    return (tenants ?? []).map((t) => {
      const bal = balances?.get(t.id);
      const totalOwed = bal?.balance ?? 0;
      return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        unitNumber: t.units?.unit_number ?? null,
        propertyName: t.units?.properties?.name ?? null,
        rent: t.rent_amount ?? 0,
        totalOwed,
        monthsBehind: bal?.monthsBehind ?? 0,
        // Lifetime arrears outrank the month's status: someone square for this
        // month who still owes from earlier is not "paid".
        status: totalOwed > 0 ? "arrears" : (statusByTenant.get(t.id) ?? "paid"),
      };
    });
  }, [tenants, balances, statusByTenant]);

  const properties = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => r.propertyName && names.add(r.propertyName));
    return [...names].sort();
  }, [rows]);

  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = rows.filter((r) => {
      if (filter === "owing" && r.totalOwed <= 0) return false;
      if (filter === "settled" && r.totalOwed > 0) return false;
      if (propertyFilter !== "all" && r.propertyName !== propertyFilter) return false;
      if (!term) return true;
      return (
        r.name.toLowerCase().includes(term) ||
        (r.phone ?? "").includes(term) ||
        (r.unitNumber ?? "").toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "owed") {
        if (b.totalOwed !== a.totalOwed) return b.totalOwed - a.totalOwed;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "unit") {
        return (a.unitNumber ?? "").localeCompare(b.unitNumber ?? "", undefined, {
          numeric: true,
        });
      }
      return a.name.localeCompare(b.name);
    });
  }, [rows, searchTerm, filter, propertyFilter, sortBy]);

  const page = useProgressiveList(visible, {
    resetKey: `${searchTerm}-${filter}-${propertyFilter}-${sortBy}`,
  });

  const owingCount = rows.filter((r) => r.totalOwed > 0).length;
  const totalArrears = rows.reduce((sum, r) => sum + Math.max(0, r.totalOwed), 0);

  const tenantById = useMemo(() => {
    const map = new Map<string, TenantWithUnit>();
    (tenants ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [tenants]);

  const exportRows = useMemo<TenantExportRow[]>(
    () =>
      rows.map((r) => ({
        tenant_name: r.name,
        phone: formatKenyanPhone(r.phone),
        property_name: r.propertyName ?? "Unassigned",
        unit_number: r.unitNumber ?? "-",
        rent_amount: r.rent,
        balance: r.totalOwed,
        payment_status: r.status,
        risk_level: r.monthsBehind >= 3 ? "high" : r.monthsBehind >= 1 ? "medium" : "low",
        risk_score: r.monthsBehind,
        lease_start: tenantById.get(r.id)?.lease_start ?? null,
      })),
    [rows, tenantById]
  );

  // ?new=1 lands the setup checklist straight in the form.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setIsAddOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  // ?tenantId=… opens that tenant's statement, e.g. from a Reports follow-up.
  useEffect(() => {
    const id = searchParams.get("tenantId");
    if (!id || !tenants?.length) return;
    const found = tenants.find((t) => t.id === id);
    if (!found) return;
    setLedgerTenant(found);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tenantId");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, tenants, setSearchParams]);

  function reminderFor(row: TenantRowData): string | null {
    if (!row.phone || row.totalOwed <= 0) return null;
    return whatsappLink(
      row.phone,
      buildArrearsReminder({
        tenantName: row.name,
        unitNumber: row.unitNumber,
        amount: row.totalOwed,
        monthsBehind: Math.max(1, row.monthsBehind),
        payTo: landlordSettings?.payTo || null,
      })
    );
  }

  return (
    <PageContainer title="Tenants" subtitle={`${rows.length} active`}>
      {/* Where the arrears stand overall, before any filtering. */}
      <section className="surface-panel p-4 mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Owed in total</p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums mt-1",
                totalArrears > 0 ? "text-destructive" : "text-success"
              )}
            >
              {formatKES(totalArrears)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground shrink-0">
            {owingCount} of {rows.length} owing
          </p>
        </div>
      </section>

      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search name, phone or unit"
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter tenants">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "h-9 px-3 rounded-md text-xs font-medium border transition-colors",
                filter === f.value
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/25"
              )}
            >
              {f.label}
              {f.value === "owing" && owingCount > 0 && (
                <span className="ml-1.5 tabular-nums opacity-70">{owingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 text-xs" aria-label="Sort tenants">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owed">Most owed first</SelectItem>
              <SelectItem value="name">By name</SelectItem>
              <SelectItem value="unit">By unit</SelectItem>
            </SelectContent>
          </Select>

          {properties.length > 1 && (
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-9 text-xs" aria-label="Filter by property">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="flex-1 min-w-[10rem]" onClick={() => setIsReconcileOpen(true)}>
            <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
            Paste M-Pesa
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-w-[8rem]"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add tenant
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Export tenant list"
            onClick={async () => {
              try {
                await exportTenantsListExcel(exportRows);
              } catch (error) {
                toast({
                  title: "Export failed",
                  description: getSupabaseErrorMessage(error),
                  variant: "destructive",
                });
              }
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </>
        ) : visible.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" aria-hidden="true" />
            {rows.length === 0 ? (
              <>
                <p className="text-sm font-semibold">No tenants yet</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Add a tenant and RentKonnect starts charging their rent every month.
                </p>
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add your first tenant
                </Button>
              </>
            ) : filter === "owing" ? (
              <>
                <p className="text-sm font-semibold">Nobody owes you anything</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Every tenant is fully paid up.
                </p>
                <Button variant="outline" onClick={() => setFilter("all")}>
                  Show everyone
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Nothing matches</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Try a different search, or clear the filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilter("all");
                    setPropertyFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {page.visible.map((row) => {
              const tenant = tenantById.get(row.id);
              if (!tenant) return null;
              return (
                <TenantRow
                  key={row.id}
                  tenant={row}
                  reminderLink={reminderFor(row)}
                  onOpenStatement={() => setLedgerTenant(tenant)}
                  onRecordPayment={() => setPayingTenant(tenant)}
                  onEdit={() => {
                    setEditingTenant(tenant);
                    setIsEditOpen(true);
                  }}
                  onMoveOut={() => setTenantToArchive(tenant)}
                  onDelete={() => setTenantToDelete(tenant)}
                />
              );
            })}

            {page.hasMore && (
              <>
                <ShowMore remaining={page.remaining} noun="tenant" onClick={page.showMore} />
                <p className="text-xs text-muted-foreground text-center">
                  Showing {page.visible.length} of {page.total}. Search covers all of them.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add tenant</DialogTitle>
          </DialogHeader>
          <TenantForm
            onSubmit={(data: TenantFormPayload, addAnother?: boolean) =>
              createTenant.mutate(
                { tenantData: data, addAnother },
                { onSuccess: ({ addAnother: again }) => !again && setIsAddOpen(false) }
              )
            }
            onCancel={() => setIsAddOpen(false)}
            isLoading={createTenant.isPending}
          />
        </DialogContent>
      </Dialog>

      {editingTenant && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit tenant</DialogTitle>
            </DialogHeader>
            <TenantForm
              tenant={editingTenant}
              onSubmit={(data: TenantFormPayload) =>
                updateTenant.mutate(
                  { id: editingTenant.id, ...data },
                  {
                    onSuccess: () => {
                      setIsEditOpen(false);
                      setEditingTenant(null);
                    },
                  }
                )
              }
              onCancel={() => {
                setIsEditOpen(false);
                setEditingTenant(null);
              }}
              isLoading={updateTenant.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {payingTenant && (
        <RecordPaymentDialog
          open
          onOpenChange={(open) => !open && setPayingTenant(null)}
          tenant={{
            tenant_id: payingTenant.id,
            tenant_name: payingTenant.name,
            unit_number: payingTenant.units?.unit_number ?? "-",
            property_name: payingTenant.units?.properties?.name ?? null,
            balance: balances?.get(payingTenant.id)?.balance ?? 0,
          }}
        />
      )}

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

      <AlertDialog
        open={Boolean(tenantToArchive)}
        onOpenChange={(open) => !open && setTenantToArchive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {tenantToArchive?.name ?? "this tenant"} out?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their payment history stays on record and Unit{" "}
              {tenantToArchive?.units?.unit_number ?? ""} becomes available again. They stop
              being billed from next month.
              {(() => {
                const owed = tenantToArchive
                  ? balances?.get(tenantToArchive.id)?.balance ?? 0
                  : 0;
                if (owed > 0) {
                  return ` They still owe ${formatKES(owed)} — settle or write this off first if you need the books clean.`;
                }
                if (tenantToArchive?.security_deposit) {
                  return ` Remember to return or offset their ${formatKES(
                    tenantToArchive.security_deposit
                  )} deposit.`;
                }
                return "";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                tenantToArchive &&
                archiveTenant.mutate(
                  { id: tenantToArchive.id },
                  { onSettled: () => setTenantToArchive(null) }
                )
              }
            >
              Move out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(tenantToDelete)}
        onOpenChange={(open) => !open && setTenantToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This erases {tenantToDelete?.name ?? "this tenant"} along with every charge and
              payment on their record, which will change the totals in months you have already
              closed. If they are moving out, use Move out instead — it keeps their history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                tenantToDelete &&
                deleteTenant.mutate(tenantToDelete.id, {
                  onSettled: () => setTenantToDelete(null),
                })
              }
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
