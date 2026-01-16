import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TenantForm } from "@/components/tenants/TenantForm";
import { RecordPaymentDialog } from "@/components/tenants/RecordPaymentDialog";
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from "@/hooks/useTenants";
import { useCurrentMonthPayments, calculatePaymentStatus } from "@/hooks/usePayments";
import { formatKenyanPhone } from "@/lib/phone-validation";
import { Plus, User, Phone, Banknote, Home, Pencil, Trash2, Users, CreditCard, CheckCircle, AlertCircle, Building2, Search, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'> & {
  opening_balance?: number;
  security_deposit?: number;
};

type TenantWithUnit = Tenant & { 
  units?: { 
    id: string; 
    unit_number: string; 
    properties?: { id: string; name: string } | null 
  } | null 
};

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithUnit | null>(null);
  const [payingTenant, setPayingTenant] = useState<TenantWithUnit | null>(null);
  
  const { data: tenants, isLoading } = useTenants();
  const { data: currentMonthPayments } = useCurrentMonthPayments();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const groupedTenants = useMemo(() => {
    if (!tenants) return {};
    const filtered = tenants.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.units?.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      const propA = a.units?.properties?.name || "Unassigned";
      const propB = b.units?.properties?.name || "Unassigned";
      if (propA !== propB) return propA.localeCompare(propB);
      const unitA = a.units?.unit_number || "";
      const unitB = b.units?.unit_number || "";
      return unitA.localeCompare(unitB, undefined, { numeric: true });
    });
    return sorted.reduce((acc, tenant) => {
      const propName = tenant.units?.properties?.name || "Unassigned";
      if (!acc[propName]) acc[propName] = [];
      acc[propName].push(tenant);
      return acc;
    }, {} as Record<string, TenantWithUnit[]>);
  }, [tenants, searchTerm]);
  
  const getFinancials = (tenant: TenantWithUnit) => {
    const payments = currentMonthPayments?.filter(p => p.tenant_id === tenant.id) || [];
    const monthlyStatus = calculatePaymentStatus(tenant.rent_amount, payments);
    const openingArrears = Number(tenant.opening_balance) || 0;
    const currentMonthArrears = Math.abs(Math.min(0, monthlyStatus.balance)); 
    const currentMonthCredit = Math.max(0, monthlyStatus.balance);
    const totalBalance = openingArrears + currentMonthArrears - currentMonthCredit;
    return {
      ...monthlyStatus,
      totalBalance,
      isPaid: monthlyStatus.status === 'paid' || monthlyStatus.status === 'overpaid',
      deposit: Number(tenant.security_deposit) || 0
    };
  };

  const handleCreate = (data: any, addAnother?: boolean) => {
    createTenant.mutate({ tenantData: data, addAnother }, {
      onSuccess: ({ addAnother }) => { if (!addAnother) setIsAddOpen(false); },
    });
  };

  const handleUpdate = (data: any) => {
    if (!editingTenant) return;
    updateTenant.mutate({ id: editingTenant.id, ...data }, {
      onSuccess: () => setEditingTenant(null),
    });
  };

  return (
    <PageContainer title="Tenants" subtitle="Directory & Payment Status">
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name, phone or unit..." 
            className="pl-10 h-12 bg-white shadow-sm border-slate-200 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 text-base font-semibold shadow-md" size="lg">
              <Plus className="h-5 w-5 mr-1" /> Add New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader><DialogTitle>Add New Tenant</DialogTitle></DialogHeader>
            <TenantForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} isLoading={createTenant.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader><DialogTitle>Edit Tenant</DialogTitle></DialogHeader>
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

      <div className="space-y-8 pb-24">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : (
          Object.entries(groupedTenants).map(([propertyName, propertyTenants]) => (
            <div key={propertyName} className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">{propertyName}</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {propertyTenants.map((tenant) => {
                  const fin = getFinancials(tenant);
                  
                  return (
                    <Card key={tenant.id} className="p-4 border border-slate-100 shadow-sm relative overflow-hidden group">
                      {/* Fixed Strip: Added pointer-events-none and z-0 */}
                      <div 
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-1.5 z-0 pointer-events-none",
                          fin.totalBalance > 0 ? "bg-red-500" : fin.totalBalance < 0 ? "bg-emerald-500" : "bg-slate-200"
                        )} 
                      />

                      {/* Content Wrapper: Added z-10 and relative to ensure it's on top */}
                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                            fin.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {fin.isPaid ? <CheckCircle className="h-5 w-5" /> : <User className="h-5 w-5" />}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h3 className="font-bold text-slate-900 truncate">{tenant.name}</h3>
                              {fin.totalBalance > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-100">
                                  KES {fin.totalBalance.toLocaleString()} Owed
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="font-bold text-primary px-1.5 py-0.5 bg-primary/5 rounded">Unit {tenant.units?.unit_number}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-500 font-medium">{formatKenyanPhone(tenant.phone)}</span>
                              {fin.deposit > 0 && (
                                <span className="flex items-center gap-0.5 text-slate-400 italic">
                                  <ShieldCheck className="h-3 w-3" /> Dep: {fin.deposit.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                           <Button 
                            variant={fin.isPaid ? "outline" : "default"}
                            size="sm"
                            onClick={() => setPayingTenant(tenant as TenantWithUnit)}
                            className={cn(
                              "rounded-lg h-8 px-3 text-xs font-bold transition-all", 
                              fin.isPaid ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "shadow-md hover:translate-y-[-1px]"
                            )}
                          >
                            {fin.isPaid ? "Payment" : "Record Pay"}
                          </Button>
                          
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100" onClick={() => setEditingTenant(tenant as TenantWithUnit)}>
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5 text-slate-300" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-xs rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {tenant.name}?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2">
                                  <AlertDialogCancel className="flex-1 mt-0">No</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTenant.mutate(tenant.id)} className="flex-1 bg-red-600">Yes</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}