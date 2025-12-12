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

      {/* Record Payment Dialog */}
      {payingTenant && (
        <RecordPaymentDialog
          open={!!payingTenant}
          onOpenChange={(open) => !open && setPayingTenant(null)}
          tenant={payingTenant}
        />
      )}

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
          tenants?.map((tenant, index) => {
            const paymentStatus = getPaymentStatus(tenant.id, tenant.rent_amount);
            
            return (
              <Card 
                key={tenant.id} 
                className="p-4 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-full",
                    paymentStatus.status === 'paid' || paymentStatus.status === 'overpaid' 
                      ? "bg-emerald-100 text-emerald-600" 
                      : paymentStatus.status === 'partial'
                      ? "bg-amber-100 text-amber-600"
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
                      {paymentStatus.status === 'paid' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          Paid
                        </span>
                      )}
                      {paymentStatus.status === 'overpaid' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          +{paymentStatus.balance.toLocaleString()}
                        </span>
                      )}
                      {paymentStatus.status === 'partial' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          -{Math.abs(paymentStatus.balance).toLocaleString()}
                        </span>
                      )}
                    </div>
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
                  <div className="flex flex-col gap-1">
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
                        className="h-8 w-8"
                        onClick={() => setEditingTenant(tenant as TenantWithUnit)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
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
                </div>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}