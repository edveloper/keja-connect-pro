import { useEffect, useMemo, useState } from "react";
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
import { useTenants, useCreateTenant, useDeleteTenant, useUpdateTenant } from "@/hooks/useTenants";
import { useDashboardData } from "@/hooks/useDashboard";
import { formatKenyanPhone } from "@/lib/phone-validation";
import { Plus, Building2, Search, Trash2, Pencil, Download } from "lucide-react";
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithUnit | null>(null);
  const [payingTenant, setPayingTenant] = useState<TenantWithUnit | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<TenantWithUnit | null>(null);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: tenants, isLoading } = useTenants();
  const { data: dashboardData } = useDashboardData(null);
  const { data: riskSnapshots = [] } = useTenantRiskSnapshots(currentMonthKey);
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

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
      const risk = riskByTenant.get(tenant.id);
      return {
        tenant_name: tenant.name,
        phone: formatKenyanPhone(tenant.phone),
        property_name: tenant.units?.properties?.name ?? "Unassigned",
        unit_number: tenant.units?.unit_number ?? "-",
        rent_amount: tenant.rent_amount ?? 0,
        balance: finance?.balance ?? 0,
        payment_status: finance?.payment_status ?? "unpaid",
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
    setEditingTenant(found);
    setIsEditOpen(true);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("tenantId");
      return p;
    });
  }, [searchParams, tenants, setSearchParams]);

  return (
    <PageContainer title="Tenants" subtitle="Directory & Payment Status">
      <div className="surface-panel mb-6 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
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
              onClick={async () => {
                try {
                  await exportTenantsListExcel(tenantExportRows);
                } catch (error) {
                  toast({
                    title: "Export failed",
                    description: error instanceof Error ? error.message : "Failed to export tenant list",
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
                const balance = tenantFinanceById.get(tenant.id)?.balance ?? 0;

                return (
                  <Card
                    key={tenant.id}
                    className="p-4 relative elevate cursor-pointer"
                    onClick={() => {
                      setEditingTenant(tenant);
                      setIsEditOpen(true);
                    }}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5",
                        balance > 0
                          ? "bg-red-500"
                          : balance < 0
                            ? "bg-emerald-500"
                            : "bg-slate-200"
                      )}
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{tenant.name}</h3>
                          {riskByTenant.get(tenant.id) && (
                            <Badge
                              variant={
                                riskByTenant.get(tenant.id)?.level === "high"
                                  ? "destructive"
                                  : riskByTenant.get(tenant.id)?.level === "medium"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-[10px] uppercase tracking-wide"
                            >
                              {riskByTenant.get(tenant.id)?.level} risk
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Unit {tenant.units?.unit_number} | {formatKenyanPhone(tenant.phone)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTenant(tenant);
                            setIsEditOpen(true);
                          }}
                          aria-label={`Edit ${tenant.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-2 text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayingTenant(tenant);
                          }}
                        >
                          Record Payment
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTenantToDelete(tenant);
                          }}
                          aria-label={`Delete ${tenant.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
            <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {tenantToDelete?.name ?? "this tenant"} and related payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!tenantToDelete) return;
                deleteTenant.mutate(tenantToDelete.id, {
                  onSettled: () => setTenantToDelete(null),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
