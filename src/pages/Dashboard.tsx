import { PageContainer } from "@/components/layout/PageContainer";
import { UnitCard } from "@/components/dashboard/UnitCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getUnitsWithDetails, getStats } from "@/stores/mockData";
import { Building2, CheckCircle2, AlertTriangle, Banknote } from "lucide-react";

export default function Dashboard() {
  const units = getUnitsWithDetails();
  const stats = getStats();
  const currentMonth = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  
  // Sort: arrears first, then paid, then vacant
  const sortedUnits = [...units].sort((a, b) => {
    const aHasTenant = !!a.tenant;
    const bHasTenant = !!b.tenant;
    const aIsPaid = !!a.current_month_payment;
    const bIsPaid = !!b.current_month_payment;
    
    if (!aHasTenant && bHasTenant) return 1;
    if (aHasTenant && !bHasTenant) return -1;
    if (!aIsPaid && bIsPaid) return -1;
    if (aIsPaid && !bIsPaid) return 1;
    return 0;
  });

  return (
    <PageContainer title="Dashboard" subtitle={currentMonth}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
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
      </div>

      {/* Units List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          All Units
        </h2>
        {sortedUnits.map((unit, index) => (
          <div 
            key={unit.id} 
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <UnitCard
              unitNumber={unit.unit_number}
              propertyName={unit.property?.name || "Unknown"}
              tenantName={unit.tenant?.name}
              tenantPhone={unit.tenant?.phone}
              rentAmount={unit.tenant?.rent_amount}
              isPaid={!!unit.current_month_payment}
            />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
