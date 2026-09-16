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
import { currentMonthKey, toMonthKey, timestampToMonthKey } from "@/lib/month";
import { MonthSelector } from "@/components/layout/MonthSelector";
import { LedgerSummary } from "@/components/dashboard/LedgerSummary";
import { useTenantBalances } from "@/hooks/useTenantBalances";
import { usePayments } from "@/hooks/usePayments";
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

  /**
   * Cash actually banked in the selected month.
   *
   * The closing line used to read `totalAllocated - totalExpenses`: rent
   * matched to this month's charges, minus expenses recorded on the day they
   * were paid. Subtracting a cash figure from an accrual one gives a number
   * that answers no question, and it disagreed with the identically-labelled
   * row on Reports, which was built from cash. Both screens now use cash.
   *
   * payment_date is TIMESTAMPTZ, so the month is read in local time: 21:00Z on
   * 30 September is 1 October in Nairobi, and reading the raw string would file
   * that payment under September.
   */
  const { data: paymentsData } = usePayments();

  const cashReceived = useMemo(() => {
    if (!paymentsData) return 0;
    const key = selectedDate ? toMonthKey(selectedDate) : null;

    return paymentsData
      .filter((p) => !key || timestampToMonthKey(p.payment_date) === key)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [paymentsData, selectedDate]);

  /**
   * Tenants in credit are never netted against tenants in arrears — one
   * tenant's overpayment cannot settle another's debt — so "Still owed"
   * counts only who is behind, and the credit is reported beside it.
   */
  const arrearsNote = useMemo(() => {
    const behind = (data?.units ?? []).filter((u) => u.tenant_id && u.balance > 0).length;
    const credit = data?.stats.totalCredit ?? 0;
    const phrase = `${behind} ${behind === 1 ? "tenant is" : "tenants are"} behind`;

    return credit > 0
      ? `${phrase}. A separate ${formatKES(credit)} sits in credit and is not subtracted here.`
      : phrase;
  }, [data]);

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

      {/* A unit with two active tenants shows one card, so the other tenant is
          invisible on the rent roll. Their money is counted either way now,
          but silence about it is how 22,000 of arrears went unexplained across
          two screens. Almost always it means someone moved out and was never
          archived. */}
      {(data?.sharedUnitTenants?.length ?? 0) > 0 && (
        <div className="surface-panel border-warning/50 bg-warning/10 p-4 mb-4">
          <p className="text-sm font-semibold text-foreground">
            {data!.sharedUnitTenants.length === 1
              ? "1 tenant shares a unit and has no card below"
              : `${data!.sharedUnitTenants.length} tenants share a unit and have no card below`}
          </p>
          <ul className="mt-2 space-y-1.5">
            {data!.sharedUnitTenants.map((t) => (
              <li key={t.tenantId} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.tenantName}</span>
                {" — Unit "}
                {t.unitNumber} · {t.propertyName}, where {t.shownInstead} is shown instead
                {t.balance > 0 && (
                  <span className="text-destructive font-semibold">
                    {" · owes "}
                    {formatKES(t.balance)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Their rent and arrears are included in the totals above. If someone has moved out,
            archive them in Settings so the unit shows one tenant.
          </p>
        </div>
      )}

      {isLoading || expensesLoading ? (
        <div className="space-y-4 mb-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {/* Two cards, matching Reports, because these are two questions.
              Rent is tied to the month it was FOR, whenever it was paid; cash
              is tied to the day it arrived, whatever month it settled. The
              single card these replaced mixed the two and closed on a total
              that subtracted cash expenses from accrual rent. */}
          <LedgerSummary
            period={selectedDate ? `${format(selectedDate, "MMMM yyyy")} rent` : "All-time rent"}
            rows={[
              {
                label: "Rent due",
                value: data?.stats.totalCharges ?? 0,
                note: `${data?.stats.occupiedUnits ?? 0} of ${data?.stats.totalUnits ?? 0} units occupied`,
                onClick: () => navigate("/reports"),
              },
              {
                label: "Paid off",
                value: data?.stats.totalAllocated ?? 0,
                tone: "paid",
                note: `${upToDateThisMonth} of ${occupiedThisMonth} tenants fully up to date`,
                onClick: () => navigate("/reports"),
              },
              {
                label: "Still owed",
                value: data?.stats.totalBalance ?? 0,
                tone: (data?.stats.totalBalance ?? 0) > 0 ? "owed" : undefined,
                note: arrearsNote,
                ruleAbove: true,
                onClick: () => navigate("/tenants"),
              },
            ]}
          />

          <LedgerSummary
            period={selectedDate ? `Cash in ${format(selectedDate, "MMMM")}` : "Cash, all time"}
            rows={[
              {
                label: "Money in",
                value: cashReceived,
                tone: "paid",
                note: selectedDate
                  ? `Everything banked in ${format(selectedDate, "MMMM")}, whichever month's rent it settled`
                  : "Every payment ever banked",
                onClick: () => navigate("/reports"),
              },
              {
                label: "Money out",
                value: totalExpenses ?? 0,
                note: "Expenses you recorded as paid",
                onClick: () => navigate("/expenses"),
              },
              {
                label: (cashReceived - (totalExpenses ?? 0)) >= 0 ? "Kept" : "Short",
                value: Math.abs(cashReceived - (totalExpenses ?? 0)),
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
