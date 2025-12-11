import { PageContainer } from "@/components/layout/PageContainer";
import { UnitCard } from "@/components/dashboard/UnitCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useDashboardData } from "@/hooks/useDashboard";
import { Building2, CheckCircle2, AlertTriangle, Banknote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data, isLoading } = useDashboardData();
  const currentMonth = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  // Sort: arrears first, then paid, then vacant
  const sortedUnits = [...(data?.units || [])].sort((a, b) => {
    const aHasTenant = !!a.tenant_id;
    const bHasTenant = !!b.tenant_id;
    const aIsPaid = a.current_month_paid;
    const bIsPaid = b.current_month_paid;

    if (!aHasTenant && bHasTenant) return 1;
    if (aHasTenant && !bHasTenant) return -1;
    if (!aIsPaid && bIsPaid) return -1;
    if (aIsPaid && !bIsPaid) return 1;
    return 0;
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
        {isLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
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
          </>
        )}
      </div>

      {/* Units List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          All Units
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedUnits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No units yet. Add properties and units to get started.</p>
          </div>
        ) : (
          sortedUnits.map((unit, index) => (
            <div
              key={unit.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <UnitCard
                unitNumber={unit.unit_number}
                propertyName={unit.property_name}
                tenantName={unit.tenant_name || undefined}
                tenantPhone={unit.tenant_phone || undefined}
                rentAmount={unit.rent_amount || undefined}
                isPaid={unit.current_month_paid}
              />
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}
