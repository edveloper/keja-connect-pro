import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TenantForm } from "@/components/tenants/TenantForm";
import { RecordPaymentDialog } from "@/components/tenants/RecordPaymentDialog";
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from "@/hooks/useTenants";
import { useCurrentMonthPayments, calculatePaymentStatus } from "@/hooks/usePayments";
import { formatKenyanPhone } from "@/lib/phone-validation";
import { Plus, User, Phone, Banknote, Home, Pencil, Trash2, Users, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  const [payingTenant, setPayingTenant] = useState<TenantWithUnit | null>(null);
  
  const { data: tenants, isLoading } = useTenants();
  const { data: currentMonthPayments } = useCurrentMonthPayments();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  
  const getPaymentStatus = (tenantId: string, rentAmount: number) => {
    const payments = currentMonthPayments?.filter(p => p.tenant_id === tenantId) || [];
    return calculatePaymentStatus(rentAmount, payments);
  };

  // Updated to handle the addAnother parameter
  const handleCreate = (data: { name: string; phone: string; rent_amount: number; unit_id: string | null }, addAnother?: boolean) => {
    createTenant.mutate(
      { tenantData: data, addAnother },
      {
        onSuccess: ({ addAnother }) => {
          // Only close the dialog if NOT adding another tenant
          if (!addAnother) {
            setIsAddOpen(false);
          }
          // If addAnother is true, the form stays open and resets itself
        },
      }
    );
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
          <Button className="w-full mb-6" size="lg">
            <Plus className="h-5 w-5" />
            Add Tenant
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
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
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
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

      {/* Record Payment Dialog */}
      {payingTenant && (
        <RecordPaymentDialog
          open={!!payingTenant}
          onOpenChange={(open) => !open && setPayingTenant(null)}
          tenant={payingTenant}
        />
      )}

      {/* Tenants List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </Card>
          ))
        ) : tenants?.length === 0 ? (
          <div className="text-center py-12 px-6 bg-card rounded-2xl border border-dashed border-border">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No tenants yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first tenant to start tracking payments.
            </p>
          </div>
        ) : (
          tenants?.map((tenant, index) => {
            const paymentStatus = getPaymentStatus(tenant.id, tenant.rent_amount);
            
            return (
              <Card 
                key={tenant.id} 
                className="p-5 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    paymentStatus.status === 'paid' || paymentStatus.status === 'overpaid' 
                      ? "bg-success/15 text-success" 
                      : paymentStatus.status === 'partial'
                      ? "bg-warning/15 text-warning"
                      : "bg-primary/10 text-primary"
                  )}>
                    {paymentStatus.status === 'paid' || paymentStatus.status === 'overpaid' ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : paymentStatus.status === 'partial' ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
                      {paymentStatus.status === 'paid' && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-success/15 text-success font-semibold">
                          Paid
                        </span>
                      )}
                      {paymentStatus.status === 'overpaid' && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary font-semibold">
                          +{paymentStatus.balance.toLocaleString()}
                        </span>
                      )}
                      {paymentStatus.status === 'partial' && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-warning/15 text-warning font-semibold">
                          −{Math.abs(paymentStatus.balance).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="text-sm text-muted-foreground flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-muted">
                          <Phone className="h-3.5 w-3.5" />
                        </div>
                        {formatKenyanPhone(tenant.phone)}
                      </div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-muted">
                          <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        KES {tenant.rent_amount.toLocaleString()}
                      </div>
                      {tenant.units ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-muted">
                            <Home className="h-3.5 w-3.5" />
                          </div>
                          Unit {tenant.units.unit_number} • {(tenant.units.properties as { name: string } | null)?.name}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-muted">
                            <Home className="h-3.5 w-3.5" />
                          </div>
                          No unit assigned
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Record Payment Button */}
                    <Button 
                      variant={paymentStatus.status === 'unpaid' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPayingTenant(tenant as TenantWithUnit)}
                      className="gap-1.5"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay
                    </Button>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        onClick={() => setEditingTenant(tenant as TenantWithUnit)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-sm mx-4 rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove tenant?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {tenant.name} and all their payment records. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(tenant.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}