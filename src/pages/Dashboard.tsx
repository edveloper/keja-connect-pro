import { PageContainer } from "@/components/layout/PageContainer";
import UnitCard from "@/components/dashboard/UnitCard";
import RecordPaymentDialog from "@/components/tenants/RecordPaymentDialog";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses } from "@/hooks/useExpenses";
import { useRiskSummary, useReminderQueue } from "@/hooks/useIntelligence";
import type { DashboardUnit } from "@/hooks/useDashboard";
import { formatKES } from "@/lib/number-formatter";
import { buildAssistantQueue } from "@/lib/assistantQueue";
import { AssistantPanel } from "@/components/intelligence/AssistantPanel";
import {
  Building2,
  ChevronDown,
  Smartphone,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { useNavigate } from "react-router-dom";
import { currentMonthKey, toMonthKey } from "@/lib/month";
import { MonthSelector } from "@/components/layout/MonthSelector";
import { LedgerSummary } from "@/components/dashboard/LedgerSummary";
import { useTenantBalances } from "@/hooks/useTenantBalances";
import { ShowMore, useProgressiveList } from "@/components/ui/show-more";
import MpesaReconcileDialog from "@/components/payments/MpesaReconcileDialog";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import { shouldClearDismissal, shouldShowSetupGuide } from "@/lib/setup-progress";

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const { data: setup, isLoading: setupLoading } = useSetupStatus();
  const { data, isLoading } = useDashboardData(selectedDate);

  // Rent per tenant, so lifetime arrears can be expressed in months behind.
  const rentByTenant = useMemo(() => {
    const map = new Map<string, number>();
    (data?.units ?? []).forEach((u) => {
      if (u.tenant_id) map.set(u.tenant_id, u.rent_amount ?? 0);
    });
    return map;
  }, [data?.units]);
  const { data: lifetimeBalances } = useTenantBalances(rentByTenant);
  const { data: thisMonthData } = useDashboardData(new Date());
  const { data: totalExpenses, isLoading: expensesLoading } = useTotalExpenses(selectedDate);
  const riskMonthKey = selectedDate ? toMonthKey(selectedDate) : currentMonthKey();
  const { summary: riskSummary } = useRiskSummary(riskMonthKey);
  const { data: reminderQueue = [] } = useReminderQueue(riskMonthKey);

  // Open on arrival: the list of who has paid is the reason to open this page.
  const [occupiedOpen, setOccupiedOpen] = useState(true);
  const [vacantOpen, setVacantOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<DashboardUnit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  // Remembered per account so hiding the guide sticks across visits. Cleared
  // automatically once setup is genuinely finished, so it cannot get wedged.
  const dismissKey = setup?.userId ? `rentkonnect:setup-hidden:${setup.userId}` : null;
  const [setupDismissed, setSetupDismissed] = useState(false);

  useEffect(() => {
    if (!dismissKey) return;
    setSetupDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  useEffect(() => {
    if (dismissKey && shouldClearDismissal(Boolean(setup?.isReady))) {
      localStorage.removeItem(dismissKey);
    }
  }, [dismissKey, setup?.isReady]);

  const dismissSetup = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setSetupDismissed(true);
  };


  const naturalSort = (a: DashboardUnit, b: DashboardUnit) =>
    a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' });

  const allUnits = useMemo(() => data?.units ?? [], [data?.units]);

  const occupiedUnits = useMemo(() =>
    allUnits.filter(u => !!u.tenant_id).sort(naturalSort),
    [allUnits]);

  const vacantUnits = useMemo(() =>
    allUnits.filter(u => !u.tenant_id).sort(naturalSort),
    [allUnits]);

  const sortedOccupied = useMemo(() => {
    return [...occupiedUnits].sort((a, b) => {
      const statusOrder = { unpaid: 0, partial: 1, paid: 2, overpaid: 3 };
      const statusA = statusOrder[a.payment_status as keyof typeof statusOrder] ?? 0;
      const statusB = statusOrder[b.payment_status as keyof typeof statusOrder] ?? 0;
      if (statusA !== statusB) return statusA - statusB;
      return naturalSort(a, b);
    });
  }, [occupiedUnits]);

  // Applied against billed, matching the Reports page. Measuring collections
  // against the rent roll instead double-counted arrears and could exceed 100%.
  const billed = data?.stats.totalCharges || 0;
  const collected = data?.stats.totalAllocated || 0;
  const collectionRate = billed > 0 ? (collected / billed) * 100 : 0;
  const pendingReminders = reminderQueue.filter((r) => r.status === "pending").length;
  const topOverdueTenant = useMemo(
    () => [...occupiedUnits].sort((a, b) => b.balance - a.balance).find((u) => (u.balance || 0) > 0),
    [occupiedUnits]
  );

  const assistantActions = useMemo(
    () =>
      buildAssistantQueue({
        collectionRate,
        occupiedUnits: data?.stats.occupiedUnits || 0,
        vacantUnits: data?.stats.vacantUnits || 0,
        totalBalance: data?.stats.totalBalance || 0,
        pendingReminders,
        highRiskCount: riskSummary.high,
        topOverdueTenantId: topOverdueTenant?.tenant_id || undefined,
      }),
    [collectionRate, data?.stats, pendingReminders, riskSummary.high, topOverdueTenant?.tenant_id]
  );

  const upToDateThisMonth = useMemo(
    () =>
      (thisMonthData?.units ?? []).filter(
        (u) => !!u.tenant_id && (u.payment_status === "paid" || u.payment_status === "overpaid")
      ).length,
    [thisMonthData]
  );
  const occupiedThisMonth = useMemo(
    () => (thisMonthData?.units ?? []).filter((u) => !!u.tenant_id).length,
    [thisMonthData]
  );

  // Both lists are drawn a page at a time. A 120-unit portfolio rendered every
  // card on first paint before this.
  const occupiedPage = useProgressiveList(sortedOccupied, {
    resetKey: `${riskMonthKey}-occupied`,
  });
  const vacantPage = useProgressiveList(vacantUnits, {
    resetKey: `${riskMonthKey}-vacant`,
  });

  function openRecordPayment(unit: DashboardUnit) {
    setSelectedUnit(unit);
    setDialogOpen(true);
  }

  // Until there is a tenant there is nothing to report, and figures of zero
  // read as "all clear" rather than "not set up yet".
  //
  // The card is deliberately tied to the three required steps only. The paybill
  // is optional — many landlords collect on a personal number — so keeping the
  // card alive for it would leave a permanent, unclosable nag on the dashboard.
  const isSetUp = setup?.isReady ?? false;

  if (setupLoading) {
    return (
      <PageContainer title="Dashboard" subtitle="Property overview">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </PageContainer>
    );
  }

  if (setup && shouldShowSetupGuide({ isReady: isSetUp, dismissed: setupDismissed })) {
    return (
      <PageContainer title="Dashboard" subtitle="Getting started">
        <SetupChecklist status={setup} onDismiss={dismissSetup} />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" subtitle="Property overview">
      <MonthSelector value={selectedDate} onChange={setSelectedDate} />

      {isSetUp && (
        <div className="mb-6">
          <Button className="w-full h-12" onClick={() => setReconcileOpen(true)}>
            <Smartphone className="h-4 w-4 mr-2" />
            Record payments from M-Pesa
          </Button>
        </div>
      )}

      {isLoading || expensesLoading ? (
        <div className="space-y-4 mb-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          <LedgerSummary
            period={selectedDate ? format(selectedDate, "MMMM yyyy") : "All time"}
            rows={[
              {
                label: "Rent billed",
                value: data?.stats.totalCharges ?? 0,
                note: `${data?.stats.occupiedUnits ?? 0} of ${data?.stats.totalUnits ?? 0} units occupied`,
                onClick: () => navigate("/reports"),
              },
              {
                label: "Collected",
                value: data?.stats.totalAllocated ?? 0,
                tone: "paid",
                onClick: () => navigate("/reports"),
              },
              {
                label: "Still owed",
                value: data?.stats.totalBalance ?? 0,
                tone: (data?.stats.totalBalance ?? 0) > 0 ? "owed" : undefined,
                note:
                  (data?.stats.totalCredit ?? 0) > 0
                    ? `${formatKES(data?.stats.totalCredit ?? 0)} held in tenant credit`
                    : undefined,
                ruleAbove: true,
                onClick: () => navigate("/tenants"),
              },
              {
                label: "Expenses paid",
                value: totalExpenses ?? 0,
                note: `${upToDateThisMonth} of ${occupiedThisMonth} tenants up to date`,
                onClick: () => navigate("/expenses"),
              },
              {
                label: "Kept this period",
                value: (data?.stats.totalAllocated ?? 0) - (totalExpenses ?? 0),
                total: true,
              },
            ]}
          />

          <button
            type="button"
            onClick={() => navigate("/tenants")}
            className="surface-panel w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-muted/40 transition-colors"
          >
            <span className="min-w-0">
              <span className="block eyebrow">Deposits held</span>
              <span className="block text-xs text-muted-foreground mt-1">
                Money you are holding on behalf of tenants
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums shrink-0">
              {formatKES(data?.stats.totalDeposits ?? 0)}
            </span>
          </button>
        </div>
      )}

      {!isLoading ? (
        <div className="mb-8">
          <Collapsible open={assistantOpen} onOpenChange={setAssistantOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-lg text-left transition-colors hover:border-foreground/25">
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="text-sm font-semibold">What needs doing</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {assistantActions.length}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                  assistantOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <AssistantPanel
                storageKey="assistant:dismissed:dashboard"
                actions={assistantActions}
                onAction={(route) => navigate(route)}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : null}

      {/* --- UNIT LISTS --- */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : allUnits.length === 0 ? (
          <div className="text-center py-12 px-6 bg-card rounded-lg border border-dashed border-border">
            <Building2 className="h-8 w-8 text-muted-foreground/60 mx-auto mb-4" aria-hidden="true" />
            <h3 className="font-semibold text-foreground mb-1">No units yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add units to a property and your tenants will appear here.
            </p>
            <Button onClick={() => navigate("/properties")}>
              <Building2 className="h-4 w-4 mr-2" />
              Go to properties
            </Button>
          </div>
        ) : (
          <>
            <Collapsible open={occupiedOpen} onOpenChange={setOccupiedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-lg text-left transition-colors hover:border-foreground/25">
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-semibold">Occupied</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{occupiedUnits.length}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                    occupiedOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {occupiedPage.visible.map((unit) => {
                  const lifetime = unit.tenant_id
                    ? lifetimeBalances?.get(unit.tenant_id)
                    : undefined;
                  return (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      onRecordPayment={openRecordPayment}
                      totalOwed={lifetime?.balance}
                      monthsBehind={lifetime?.monthsBehind}
                    />
                  );
                })}
                {occupiedPage.hasMore && (
                  <ShowMore
                    remaining={occupiedPage.remaining}
                    noun="unit"
                    onClick={occupiedPage.showMore}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={vacantOpen} onOpenChange={setVacantOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-lg text-left transition-colors hover:border-foreground/25">
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-semibold">Vacant</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{vacantUnits.length}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                    vacantOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {vacantPage.visible.map((unit) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    onRecordPayment={openRecordPayment}
                  />
                ))}
                {vacantPage.hasMore && (
                  <ShowMore
                    remaining={vacantPage.remaining}
                    noun="unit"
                    onClick={vacantPage.showMore}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>

      <MpesaReconcileDialog open={reconcileOpen} onOpenChange={setReconcileOpen} />

      {selectedUnit && (
        <RecordPaymentDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedUnit(null);
          }}
          tenant={selectedUnit}
        />
      )}
    </PageContainer>
  );
}
