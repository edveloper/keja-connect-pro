import { useState, useMemo } from "react";
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TenantForm } from "@/components/tenants/TenantForm";
import RecordPaymentDialog from "@/components/tenants/RecordPaymentDialog";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
} from "@/hooks/useTenants";
import { formatKenyanPhone } from "@/lib/phone-validation";
import {
  Plus,
  User,
  Pencil,
  Trash2,
  CheckCircle,
  Building2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Tenant = Tables<"tenants"> & {
  opening_balance?: number;
  security_deposit?: number;
  payment_status?: "paid" | "partial" | "unpaid" | "overpaid";
  balance?: number;
};

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
  const [editingTenant, setEditingTenant] =
    useState<TenantWithUnit | null>(null);
  const [payingTenant, setPayingTenant] =
    useState<TenantWithUnit | null>(null);

  const { data: tenants, isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const groupedTenants = useMemo(() => {
    if (!tenants) return {};

    const filtered = tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone?.includes(searchTerm) ||
        t.units?.unit_number
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
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

  const handleCreate = (data: any, addAnother?: boolean) => {
    createTenant.mutate(
      { tenantData: data, addAnother },
      {
        onSuccess: ({ addAnother }) => {
          if (!addAnother) setIsAddOpen(false);
        },
      }
    );
  };

  const handleUpdate = (data: any) => {
    if (!editingTenant) return;
    updateTenant.mutate(
      { id: editingTenant.id, ...data },
      { onSuccess: () => setEditingTenant(null) }
    );
  };

  return (
    <PageContainer title="Tenants" subtitle="Directory & Payment Status">
      <div className="flex flex-col gap-4 mb-6">
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
            <Button className="h-12">
              <Plus className="h-5 w-5 mr-1" /> Add New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <TenantForm
              onSubmit={handleCreate}
              onCancel={() => setIsAddOpen(false)}
              isLoading={createTenant.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {payingTenant && (
        <RecordPaymentDialog
          open
          onOpenChange={(open) => !open && setPayingTenant(null)}
          tenant={{
            tenant_id: payingTenant.id,
            tenant_name: payingTenant.name,
            unit_number: payingTenant.units?.unit_number ?? "—",
            property_name: payingTenant.units?.properties?.name ?? null,
            balance: payingTenant.balance ?? 0,
          }}
        />
      )}


      <div className="space-y-8 pb-24">
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          Object.entries(groupedTenants).map(
            ([propertyName, propertyTenants]) => (
              <div key={propertyName} className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <h2 className="text-xs font-bold uppercase">
                    {propertyName}
                  </h2>
                </div>

                {propertyTenants.map((tenant) => {
                  const balance = tenant.balance ?? 0;
                  const isPaid =
                    tenant.payment_status === "paid" ||
                    tenant.payment_status === "overpaid";

                  return (
                    <Card key={tenant.id} className="p-4 relative">
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
                            Unit {tenant.units?.unit_number} ·{" "}
                            {formatKenyanPhone(tenant.phone)}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => setPayingTenant(tenant)}
                        >
                          Payment
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )
        )}
      </div>
    </PageContainer>
  );
}
