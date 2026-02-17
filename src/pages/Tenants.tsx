import { useMemo, useState } from "react";
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
import { useTenants, useCreateTenant, useDeleteTenant } from "@/hooks/useTenants";
import { useDashboardData } from "@/hooks/useDashboard";
import { formatKenyanPhone } from "@/lib/phone-validation";
import { Plus, Building2, Search, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

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
  const [payingTenant, setPayingTenant] = useState<TenantWithUnit | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<TenantWithUnit | null>(null);

  const { data: tenants, isLoading } = useTenants();
  const { data: dashboardData } = useDashboardData(null);
  const createTenant = useCreateTenant();
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

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 sm:w-auto">
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
                  <Card key={tenant.id} className="p-4 relative elevate">
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

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{tenant.name}</h3>
                        <div className="text-xs text-muted-foreground">
                          Unit {tenant.units?.unit_number} | {formatKenyanPhone(tenant.phone)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setPayingTenant(tenant)}>
                          Record Payment
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setTenantToDelete(tenant)}
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
