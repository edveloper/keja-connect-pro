import { PageContainer } from "@/components/layout/PageContainer";
import { UnitCard } from "@/components/dashboard/UnitCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses } from "@/hooks/useExpenses";
import { Building2, CheckCircle2, AlertTriangle, Banknote, Wallet, ChevronDown, ChevronUp, Home, DoorOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export default function Dashboard() {
  const { data, isLoading } = useDashboardData();
  const { data: totalExpenses, isLoading: expensesLoading } = useTotalExpenses();
  const currentMonth = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  const [occupiedOpen, setOccupiedOpen] = useState(true);
  const [vacantOpen, setVacantOpen] = useState(false);

  // Separate occupied and vacant units
  const allUnits = data?.units || [];
  const occupiedUnits = allUnits.filter(u => !!u.tenant_id);
  const vacantUnits = allUnits.filter(u => !u.tenant_id);

  // Sort occupied: arrears first, then partial, then paid
  const sortedOccupied = [...occupiedUnits].sort((a, b) => {
    const statusOrder = { unpaid: 0, partial: 1, paid: 2, overpaid: 3 };
    return statusOrder[a.payment_status] - statusOrder[b.payment_status];
  });

  const stats = data?.stats || {
    totalUnits: 0,
    occupiedUnits: 0,
    paidUnits: 0,
    arrearsUnits: 0,
    totalCollected: 0,
  };

  return (
    <PageContainer title="Dashboard" subtitle={currentMonth}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {isLoading || expensesLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl col-span-2" />
          </>
        ) : (
          <>
            <StatsCard
              label="Total Units"
              value={stats.totalUnits}
              icon={Building2}
            />
            <StatsCard
              label="Collected"
              value={`KES ${(stats.totalCollected / 1000).toFixed(0)}K`}
              icon={Banknote}
              variant="success"
            />
            <StatsCard
              label="Paid"
              value={stats.paidUnits}
              icon={CheckCircle2}
              variant="success"
            />
            <StatsCard
              label="Arrears"
              value={stats.arrearsUnits}
              icon={AlertTriangle}
              variant={stats.arrearsUnits > 0 ? "danger" : "default"}
            />
            <div className="col-span-2">
              <StatsCard
                label="Expenses"
                value={`KES ${((totalExpenses || 0) / 1000).toFixed(0)}K`}
                icon={Wallet}
                variant="danger"
              />
            </div>
          </>
        )}
      </div>

      {/* Units Collapsibles */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : allUnits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No units yet. Add properties and units to get started.</p>
          </div>
        ) : (
          <>
            {/* Occupied Units */}
            <Collapsible open={occupiedOpen} onOpenChange={setOccupiedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Occupied Units
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {occupiedUnits.length}
                  </span>
                </div>
                {occupiedOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {sortedOccupied.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No occupied units
                  </p>
                ) : (
                  sortedOccupied.map((unit, index) => (
                    <div
                      key={unit.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
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
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Vacant Units */}
            <Collapsible open={vacantOpen} onOpenChange={setVacantOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    Vacant Units
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {vacantUnits.length}
                  </span>
                </div>
                {vacantOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {vacantUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No vacant units
                  </p>
                ) : (
                  vacantUnits.map((unit, index) => (
                    <div
                      key={unit.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <UnitCard
                        unitNumber={unit.unit_number}
                        propertyName={unit.property_name}
                        paymentStatus={unit.payment_status}
                      />
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </PageContainer>
  );
}
