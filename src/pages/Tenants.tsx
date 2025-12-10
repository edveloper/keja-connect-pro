import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TenantForm } from "@/components/tenants/TenantForm";
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from "@/hooks/useTenants";
import { formatKenyanPhone } from "@/lib/phone-validation";
import { Plus, User, Phone, Banknote, Home, Pencil, Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;

type TenantWithUnit = Tenant & { 
  units?: { 
    id: string; 
    unit_number: string; 
    properties?: { id: string; name: string } | null 
  } | null 
};

export default function Tenants() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithUnit | null>(null);
  
  const { data: tenants, isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const handleCreate = (data: { name: string; phone: string; rent_amount: number; unit_id: string | null }) => {
    createTenant.mutate(data, {
      onSuccess: () => setIsAddOpen(false),
    });
  };

  const handleUpdate = (data: { name: string; phone: string; rent_amount: number; unit_id: string | null }) => {
    if (!editingTenant) return;
    updateTenant.mutate({ id: editingTenant.id, ...data }, {
      onSuccess: () => setEditingTenant(null),
    });
  };

  const handleDelete = (id: string) => {
    deleteTenant.mutate(id);
  };

  return (
    <PageContainer title="Tenants" subtitle="Manage your tenants">
      {/* Add Tenant Button */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mb-6 h-12 text-base font-semibold">
            <Plus className="h-5 w-5 mr-2" />
            Add Tenant
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Add a tenant with their phone number for M-Pesa reconciliation.
            </DialogDescription>
          </DialogHeader>
          <TenantForm 
            onSubmit={handleCreate} 
            onCancel={() => setIsAddOpen(false)}
            isLoading={createTenant.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information.
            </DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <TenantForm 
              tenant={editingTenant}
              onSubmit={handleUpdate} 
              onCancel={() => setEditingTenant(null)}
              isLoading={updateTenant.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Tenants List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </Card>
          ))
        ) : tenants?.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No tenants yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first tenant to start tracking payments.
            </p>
          </Card>
        ) : (
          tenants?.map((tenant, index) => (
            <Card 
              key={tenant.id} 
              className="p-4 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
                  <div className="space-y-1 mt-1.5">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      {formatKenyanPhone(tenant.phone)}
                    </p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                      KES {tenant.rent_amount.toLocaleString()}
                    </p>
                    {tenant.units ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Home className="h-3.5 w-3.5" />
                        Unit {tenant.units.unit_number} • {(tenant.units.properties as { name: string } | null)?.name}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                        <Home className="h-3.5 w-3.5" />
                        No unit assigned
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditingTenant(tenant as TenantWithUnit)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-sm mx-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove tenant?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {tenant.name} and all their payment records. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(tenant.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}