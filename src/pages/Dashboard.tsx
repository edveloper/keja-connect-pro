import { PageContainer } from "@/components/layout/PageContainer";
import { UnitCard } from "@/components/dashboard/UnitCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses } from "@/hooks/useExpenses";
import { formatKES } from "@/lib/number-formatter";
import { Building2, CheckCircle2, AlertTriangle, Banknote, Wallet, ChevronDown, Home, DoorOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const { data, isLoading } = useDashboardData();
  const { data: totalExpenses, isLoading: expensesLoading } = useTotalExpenses();
  const currentMonth = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  const [occupiedOpen, setOccupiedOpen] = useState(true);
  const [vacantOpen, setVacantOpen] = useState(false);

  // Helper for Natural Sorting (1, 2, 10 instead of 1, 10, 2)
  const naturalSort = (a: any, b: any) => 
    a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' });

  // Separate and sort units
  const allUnits = data?.units || [];
  
  const occupiedUnits = useMemo(() => 
    allUnits.filter(u => !!u.tenant_id).sort(naturalSort), 
  [allUnits]);

  const vacantUnits = useMemo(() => 
    allUnits.filter(u => !u.tenant_id).sort(naturalSort), 
  [allUnits]);

  // Secondary sort for Occupied: status first, then unit number
  const sortedOccupied = useMemo(() => {
    return [...occupiedUnits].sort((a, b) => {
      const statusOrder = { unpaid: 0, partial: 1, paid: 2, overpaid: 3 };
      if (statusOrder[a.payment_status as keyof typeof statusOrder] !== statusOrder[b.payment_status as keyof typeof statusOrder]) {
        return statusOrder[a.payment_status as keyof typeof statusOrder] - statusOrder[b.payment_status as keyof typeof statusOrder];
      }
      return naturalSort(a, b);
    });
  }, [occupiedUnits]);

  const stats = data?.stats || {
    totalUnits: 0,
    occupiedUnits: 0,
    paidUnits: 0,
    arrearsUnits: 0,
    totalCollected: 0,
  };

  return (
    <PageContainer title="Dashboard" subtitle={currentMonth}>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {isLoading || expensesLoading ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl col-span-2" />
          </>
        ) : (
          <>
            <StatsCard label="Total Units" value={stats.totalUnits} icon={Building2} />
            <StatsCard 
              label="Collected" 
              value={formatKES(stats.totalCollected)} 
              icon={Banknote} 
              variant="success" 
            />
            <StatsCard label="Paid" value={stats.paidUnits} icon={CheckCircle2} variant="success" />
            <StatsCard 
              label="Arrears" 
              value={stats.arrearsUnits} 
              icon={AlertTriangle} 
              variant={stats.arrearsUnits > 0 ? "danger" : "default"} 
            />
            <div className="col-span-2">
              <StatsCard 
                label="Expenses" 
                value={formatKES(totalExpenses || 0)} 
                icon={Wallet} 
                variant="danger" 
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : allUnits.length === 0 ? (
          <div className="text-center py-12 px-6 bg-card rounded-2xl border border-dashed border-border">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No units yet</h3>
            <p className="text-sm text-muted-foreground">Add properties and units to get started.</p>
          </div>
        ) : (
          <>
            <Collapsible open={occupiedOpen} onOpenChange={setOccupiedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all duration-200 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Occupied Units</span>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">{occupiedUnits.length}</span>
                </div>
                <div className={`p-1.5 rounded-lg bg-muted transition-transform duration-200 ${occupiedOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {sortedOccupied.map((unit, index) => (
                  <div key={unit.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <UnitCard
                      unitNumber={unit.unit_number}
                      propertyName={unit.property_name}
                      tenantName={unit.tenant_name || undefined}
                      tenantPhone={unit.tenant_phone || undefined}
                      rentAmount={unit.rent_amount || undefined}
                      paymentStatus={unit.payment_status}
                      amountPaid={unit.amount_paid}
                      balance={unit.balance}
                    />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={vacantOpen} onOpenChange={setVacantOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all duration-200 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Vacant Units</span>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{vacantUnits.length}</span>
                </div>
                <div className={`p-1.5 rounded-lg bg-muted transition-transform duration-200 ${vacantOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {vacantUnits.map((unit, index) => (
                  <div key={unit.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <UnitCard
                      unitNumber={unit.unit_number}
                      propertyName={unit.property_name}
                      paymentStatus={unit.payment_status}
                    />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </PageContainer>
  );
}