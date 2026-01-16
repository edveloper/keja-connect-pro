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

  // GROUP, SORT & FILTER LOGIC
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
    
    // Total Balance = (Opening Arrears) + (Rent - Paid This Month)
    // Note: monthlyStatus.balance is (Paid - Rent), so we negate it for "Arrears"
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

  return (
    <PageContainer title="Tenants" subtitle="Directory & Payment Status">
      <div className="flex flex-col gap-4 mb-6">
        {/* Search Bar */}
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

      <div className="space-y-8 pb-24">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : (
          Object.entries(groupedTenants).map(([propertyName, propertyTenants]) => (
            <div key={propertyName} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{propertyName}</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {propertyTenants.map((tenant) => {
                  const fin = getFinancials(tenant);
                  
                  return (
                    <Card key={tenant.id} className="p-4 border-none shadow-sm overflow-hidden relative">
                      {/* Financial Indicator Strip */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        fin.totalBalance > 0 ? "bg-destructive" : fin.totalBalance < 0 ? "bg-emerald-500" : "bg-slate-200"
                      )} />

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                            fin.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}>
                            {fin.isPaid ? <CheckCircle className="h-6 w-6" /> : <User className="h-6 w-6" />}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 truncate">{tenant.name}</h3>
                              {/* Balance Badge */}
                              {fin.totalBalance > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">
                                  Arrears: KES {fin.totalBalance.toLocaleString()}
                                </span>
                              )}
                              {fin.totalBalance < 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                  Credit: KES {Math.abs(fin.totalBalance).toLocaleString()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-primary">Unit {tenant.units?.unit_number}</span>
                              <span className="text-muted-foreground text-xs">•</span>
                              <span className="text-xs text-muted-foreground">{formatKenyanPhone(tenant.phone)}</span>
                              {fin.deposit > 0 && (
                                <div className="flex items-center gap-1 ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <ShieldCheck className="h-3 w-3" /> Dep: {fin.deposit.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                           <Button 
                            variant={fin.isPaid ? "outline" : "default"}
                            size="sm"
                            onClick={() => setPayingTenant(tenant as TenantWithUnit)}
                            className={cn("rounded-lg h-9 px-4 font-bold", fin.isPaid && "border-emerald-200 text-emerald-700 hover:bg-emerald-50")}
                          >
                            {fin.isPaid ? "Record More" : "Pay Rent"}
                          </Button>
                          
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTenant(tenant as TenantWithUnit)}>
                              <Pencil className="h-4 w-4 text-slate-400" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4 text-slate-300 hover:text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-xs rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Tenant?</AlertDialogTitle>
                                  <AlertDialogDescription>This removes all history for {tenant.name}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTenant.mutate(tenant.id)} className="bg-destructive">Delete</AlertDialogAction>
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