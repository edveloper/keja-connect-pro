import { PageContainer } from "@/components/layout/PageContainer";
import { UnitCard } from "@/components/dashboard/UnitCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses } from "@/hooks/useExpenses";
import { formatKES } from "@/lib/number-formatter";
import { 
  Building2, AlertTriangle, Banknote, 
  Wallet, ChevronDown, Home, DoorOpen, ChevronLeft, 
  ChevronRight, ShieldCheck, Calendar 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { format, addMonths, subMonths } from "date-fns";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  const { data, isLoading } = useDashboardData(selectedDate);
  // Pass the month key to expenses to filter expenses by month too
  const monthKey = selectedDate ? format(selectedDate, "yyyy-MM") : null;
  const { data: totalExpenses, isLoading: expensesLoading } = useTotalExpenses();

  const [occupiedOpen, setOccupiedOpen] = useState(true);
  const [vacantOpen, setVacantOpen] = useState(false);

  const dateLabel = selectedDate ? format(selectedDate, "MMMM yyyy") : "All-Time Records";

  const naturalSort = (a: any, b: any) => 
    a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' });

  const allUnits = data?.units || [];
  
  const occupiedUnits = useMemo(() => 
    allUnits.filter(u => !!u.tenant_id).sort(naturalSort), 
  [allUnits]);

  const vacantUnits = useMemo(() => 
    allUnits.filter(u => !u.tenant_id).sort(naturalSort), 
  [allUnits]);

  const sortedOccupied = useMemo(() => {
    return [...occupiedUnits].sort((a, b) => {
      const statusOrder = { unpaid: 0, partial: 1, paid: 2, overpaid: 3 };
      const statusA = statusOrder[a.payment_status as keyof typeof statusOrder];
      const statusB = statusOrder[b.payment_status as keyof typeof statusOrder];
      if (statusA !== statusB) return statusA - statusB;
      return naturalSort(a, b);
    });
  }, [occupiedUnits]);

  return (
    <PageContainer title="Dashboard" subtitle="Property Overview">
      
      {/* --- DATE SELECTOR --- */}
      <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSelectedDate(prev => prev ? subMonths(prev, 1) : new Date())}
        >
          <ChevronLeft className="h-5 w-5 text-slate-400" />
        </Button>
        
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <h2 className="font-bold text-sm sm:text-base text-slate-800">{dateLabel}</h2>
          </div>
          <button 
            onClick={() => setSelectedDate(selectedDate ? null : new Date())}
            className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5 hover:underline"
          >
            {selectedDate ? "Switch to All-Time" : "Back to Monthly View"}
          </button>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSelectedDate(prev => prev ? addMonths(prev, 1) : new Date())}
        >
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Button>
      </div>

      {/* --- STATS GRID --- */}
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
            <StatsCard 
              label="Occupied" 
              value={`${data?.stats.occupiedUnits}/${data?.stats.totalUnits}`} 
              icon={Building2} 
            />
            
            <StatsCard 
              label="Month's Collection" 
              value={formatKES(data?.stats.totalCollected || 0)} 
              icon={Banknote} 
              variant="success" 
            />

            <StatsCard 
              label="Total Arrears" 
              value={formatKES(data?.stats.totalArrearsValue || 0)} 
              icon={AlertTriangle} 
              variant={(data?.stats.totalArrearsValue || 0) > 0 ? "danger" : "success"} 
            />

            <StatsCard 
              label="Monthly Expenses" 
              value={formatKES(totalExpenses || 0)} 
              icon={Wallet} 
              variant="danger" 
            />

            <div className="col-span-2">
              <StatsCard 
                label="Total Security Deposits Held" 
                value={formatKES(data?.stats.totalDeposits || 0)} 
                icon={ShieldCheck} 
                className="bg-blue-50/80 text-blue-900 border-blue-100 shadow-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* --- UNIT LISTS --- */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : allUnits.length === 0 ? (
          <div className="text-center py-12 px-6 bg-card rounded-2xl border border-dashed border-border">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No units yet</h3>
          </div>
        ) : (
          <>
            <Collapsible open={occupiedOpen} onOpenChange={setOccupiedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Home className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">Occupied Units</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{occupiedUnits.length}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${occupiedOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {sortedOccupied.map((unit) => (
                  <UnitCard 
                    key={unit.id} 
                    unitNumber={unit.unit_number} 
                    propertyName={unit.property_name}
                    tenantName={unit.tenant_name || undefined}
                    tenantPhone={unit.tenant_phone || undefined}
                    rentAmount={unit.rent_amount || undefined}
                    paymentStatus={unit.payment_status}
                    amountPaid={unit.amount_paid}
                    balance={unit.balance}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={vacantOpen} onOpenChange={setVacantOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                    <DoorOpen className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">Vacant Units</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{vacantUnits.length}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${vacantOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {vacantUnits.map((unit) => (
                  <UnitCard 
                    key={unit.id} 
                    unitNumber={unit.unit_number} 
                    propertyName={unit.property_name}
                    paymentStatus={unit.payment_status}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </PageContainer>
  );
}