import { useState, useMemo } from "react";
import { currentMonthKey, toDateKey, toMonthKey } from "@/lib/month";
import { MonthSelector } from "@/components/layout/MonthSelector";
import { LedgerSummary } from "@/components/dashboard/LedgerSummary";
import { useChartTheme } from "@/lib/chart-theme";
import { ShowMore, useProgressiveList } from "@/components/ui/show-more";
import { COMPACT_PAGE_SIZE } from "@/lib/pagination";
import { formatCompact, formatKES, getResponsiveFontClass } from "@/lib/number-formatter";
import { buildMonthlySummary } from "@/lib/monthly-summary";
import { buildArrearsReminder, whatsappLink } from "@/lib/reminders";
import { useLandlordSettings } from "@/hooks/useLandlordSettings";
import { useAnnualStatement } from "@/hooks/useAnnualStatement";
import { PageContainer } from "@/components/layout/PageContainer";
import { useDashboardData } from "@/hooks/useDashboard";
import {
  useTotalExpenses,
  useExpenses,
  useExpenseCategories,
} from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import {
  useRiskSummary,
  useReminderQueue,
  useRunTenantRiskScoring,
  useEnqueueRiskReminders,
  useUpdateReminderAction,
  useTenantRiskSnapshots,
} from "@/hooks/useIntelligence";
import { Download, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { buildAssistantQueue } from "@/lib/assistantQueue";
import { AssistantPanel } from "@/components/intelligence/AssistantPanel";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

import { exportFinancialSummaryExcel } from "@/utils/exports/exportFinancialSummary";
import { exportFinancialStatementExcel } from "@/utils/exports/exportFinancialStatement";
import {
  exportOperationsPack,
  exportLenderPack,
  printLenderPack,
} from "@/utils/exports/exportLandlordDocuments";

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const navigate = useNavigate();

  const monthKey = selectedDate ? toMonthKey(selectedDate) : null;
  const riskMonthKey = selectedDate ? toMonthKey(selectedDate) : currentMonthKey();

  const dateLabel = selectedDate
    ? format(selectedDate, "MMMM yyyy")
    : "All-Time Financials";

  const { data: dashboardData, isLoading: dashboardLoading } =
    useDashboardData(selectedDate);
  const previousDate = selectedDate ? subMonths(selectedDate, 1) : null;
  const { data: previousDashboardData } = useDashboardData(previousDate);

  const { data: totalExpenses, isLoading: expensesLoading } =
    useTotalExpenses(monthKey);
  const previousMonthKey = previousDate ? toMonthKey(previousDate) : null;
  const { data: previousTotalExpenses } = useTotalExpenses(previousMonthKey);

  const { data: expenses } = useExpenses(monthKey);
  const { data: categories } = useExpenseCategories();
  const { data: paymentsData } = usePayments();
  const { summary: riskSummary } = useRiskSummary(riskMonthKey);
  const { data: riskSnapshots = [] } = useTenantRiskSnapshots(riskMonthKey);
  const { data: reminderQueue = [], isLoading: reminderLoading } = useReminderQueue(riskMonthKey);
  const runRiskScan = useRunTenantRiskScoring();
  const enqueueReminders = useEnqueueRiskReminders();
  const updateReminderAction = useUpdateReminderAction();
  const reminderPage = useProgressiveList(reminderQueue, {
    pageSize: COMPACT_PAGE_SIZE,
    resetKey: riskMonthKey,
  });
  const { data: landlordSettings } = useLandlordSettings();
  const { data: annual } = useAnnualStatement(12);
  const chart = useChartTheme();

  // Payments whose stated rent month falls in the selected period.
  const filteredPayments = useMemo(() => {
    if (!paymentsData) return [];

    if (!monthKey) return paymentsData;

    return paymentsData.filter(
      (p) => p.payment_month === monthKey
    );
  }, [paymentsData, monthKey]);

  // Was a hard slice(0, 5) with no way to reach the rest.
  const transactionPage = useProgressiveList(filteredPayments, {
    pageSize: COMPACT_PAGE_SIZE,
    resetKey: monthKey ?? "all",
  });

  /**
   * Two different questions, kept deliberately separate:
   *
   *   billedAmount / appliedAmount — the accrual view. What was charged for
   *     this period and how much has been applied against it. `appliedAmount`
   *     is NOT the cash that arrived this month: a payment clearing June's
   *     arrears in August counts towards June.
   *
   *   cashReceived — the cash view. Money that actually landed in the period.
   *     This is what net income is built from, because expenses are recorded
   *     on the date they were paid, and subtracting cash-dated costs from
   *     accrual-dated revenue gives a figure that means nothing.
   */
  const billedAmount = dashboardData?.stats?.totalCharges ?? 0;
  const appliedAmount = dashboardData?.stats?.totalAllocated ?? 0;

  const cashReceived = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [filteredPayments]
  );

  const totalExpensesAmount = totalExpenses ?? 0;
  const netIncome = cashReceived - totalExpensesAmount;
  const isProfit = netIncome >= 0;
  const outstandingBalance = dashboardData?.stats?.totalBalance ?? 0;
  const totalCredit = dashboardData?.stats?.totalCredit ?? 0;
  const occupiedUnits = dashboardData?.stats?.occupiedUnits ?? 0;
  const totalUnits = dashboardData?.stats?.totalUnits ?? 0;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  const expectedRent = useMemo(() => {
    return (
      dashboardData?.units?.reduce(
        (sum, unit) => sum + (unit.rent_amount || 0),
        0
      ) || 0
    );
  }, [dashboardData]);

  // Collection efficiency is applied-against-billed in every view. It used to
  // switch denominator between the monthly and all-time views, so the same
  // label meant two different things.
  const collectionRate = billedAmount > 0 ? (appliedAmount / billedAmount) * 100 : 0;

  // Kept for the exports, which report cash collections.
  const totalCollected = cashReceived;

  const tenantsInArrears = useMemo(
    () => (dashboardData?.units ?? []).filter((u) => u.tenant_id && u.balance > 0).length,
    [dashboardData]
  );

  const expensesByCategory = useMemo(() => {
    return (
      expenses?.reduce((acc, expense) => {
        const category =
          categories?.find((c) => c.id === expense.category_id)?.name ||
          "Other";
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>) || {}
    );
  }, [expenses, categories]);

  const isLoading = dashboardLoading || expensesLoading;

  const handleExportOperations = async () => {
    try {
      await exportOperationsPack({
        monthKey,
        periodLabel: dateLabel,
        businessName: landlordSettings?.businessName || null,
        cashReceived,
        billed: billedAmount,
        applied: appliedAmount,
        totalExpenses: totalExpensesAmount,
        netIncome,
        collectionRate,
        occupancyRate,
        outstandingBalance,
        units: dashboardData?.units ?? [],
        payments: filteredPayments,
        expenses: expenses ?? [],
        topRiskTenants,
        reminders: reminderQueue,
        tenantNames: Object.fromEntries(
          [...tenantById.entries()].map(([id, t]) => [id, t.name])
        ),
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleExportLender = async () => {
    if (!annual) return;
    try {
      await exportLenderPack({
        businessName: landlordSettings?.businessName || null,
        ...annual,
        units: dashboardData?.units ?? [],
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handlePrintLender = async () => {
    if (!annual) return;
    try {
      await printLenderPack({
        businessName: landlordSettings?.businessName || null,
        ...annual,
        units: dashboardData?.units ?? [],
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleExportSummary = async () => {
    try {
      await exportFinancialSummaryExcel({
        monthKey,
        totalCollected,
        totalExpenses: totalExpensesAmount,
        netIncome,
        intelligence: {
          collectionRate,
          pendingReminders: pendingReminderCount,
          topRiskTenants: topRiskTenants.map((t) => ({
            name: t.name,
            level: t.level,
            score: t.score,
          })),
          anomalies,
        },
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleExportStatement = async () => {
    try {
      await exportFinancialStatementExcel({
        monthKey,
        intelligence: {
          topRiskTenants: topRiskTenants.map((t) => ({
            name: t.name,
            level: t.level,
            score: t.score,
            property: t.property,
            unit: t.unit,
          })),
          anomalies,
        },
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    }
  };


  const topExpenseCategories = useMemo(() => {
    return Object.entries(expensesByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [expensesByCategory]);


  const previousCollected = previousDashboardData?.stats?.totalAllocated ?? 0;
  // NOTE: previous-period cash is approximated by applied amounts; the payments
  // query is not month-scoped for prior periods.
  const previousExpenses = previousTotalExpenses ?? 0;
  const previousNetIncome = previousCollected - previousExpenses;
  const collectionDelta = totalCollected - previousCollected;
  const netDelta = netIncome - previousNetIncome;
  const pendingReminderCount = reminderQueue.filter((r) => r.status === "pending").length;
  const topExpenseShare =
    totalExpensesAmount > 0 && topExpenseCategories.length > 0
      ? topExpenseCategories[0].amount / totalExpensesAmount
      : 0;

  const tenantById = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; property: string }>();
    (dashboardData?.units ?? []).forEach((unit) => {
      if (!unit.tenant_id || !unit.tenant_name) return;
      map.set(unit.tenant_id, {
        name: unit.tenant_name,
        unit: unit.unit_number,
        property: unit.property_name,
      });
    });
    return map;
  }, [dashboardData]);


  const topRiskTenants = useMemo(
    () =>
      riskSnapshots.slice(0, 5).map((snapshot) => {
        const tenant = tenantById.get(snapshot.tenant_id);
        return {
          tenantId: snapshot.tenant_id,
          name: tenant?.name ?? "Tenant",
          unit: tenant?.unit ?? "-",
          property: tenant?.property ?? "Unknown Property",
          score: snapshot.risk_score,
          level: snapshot.risk_level,
        };
      }),
    [riskSnapshots, tenantById]
  );

  /** Things that warrant a second look, written as sentences a landlord uses. */
  const anomalies = useMemo(() => {
    const items: string[] = [];
    if (billedAmount > 0 && cashReceived === 0) {
      items.push("No payments recorded this period, even though rent was billed.");
    }
    if (topExpenseShare >= 0.6 && topExpenseCategories.length > 0) {
      items.push(
        `${topExpenseCategories[0].name} accounts for ${Math.round(topExpenseShare * 100)}% of everything you spent.`
      );
    }
    if (pendingReminderCount >= 5) {
      items.push(`${pendingReminderCount} reminders are queued and still unsent.`);
    }
    if (collectionRate < 50 && billedAmount > 0) {
      items.push(`Only ${collectionRate.toFixed(0)}% of billed rent has come in.`);
    }
    return items.slice(0, 3);
  }, [
    billedAmount,
    cashReceived,
    topExpenseShare,
    topExpenseCategories,
    pendingReminderCount,
    collectionRate,
  ]);

  const topOverdueTenant = useMemo(
    () =>
      [...(dashboardData?.units ?? [])]
        .filter((u) => !!u.tenant_id)
        .sort((a, b) => b.balance - a.balance)
        .find((u) => (u.balance || 0) > 0),
    [dashboardData]
  );

  const topArrearsUnits = useMemo(
    () =>
      [...(dashboardData?.units ?? [])]
        .filter((u) => Number(u.balance || 0) > 0)
        .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
        .slice(0, 5),
    [dashboardData]
  );


  const paymentStatusChartData = useMemo(() => {
    const statusCounts = new Map<string, number>();
    (dashboardData?.units ?? [])
      .filter((u) => !!u.tenant_id)
      .forEach((u) => {
        const key = String(u.payment_status || "unknown");
        statusCounts.set(key, (statusCounts.get(key) || 0) + 1);
      });
    return [...statusCounts.entries()].map(([name, value]) => ({ name, value }));
  }, [dashboardData]);

  const propertyPerformanceChartData = useMemo(() => {
    const map = new Map<string, { expected: number; collected: number; arrears: number }>();
    (dashboardData?.units ?? []).forEach((u) => {
      const key = u.property_name ?? "Unknown";
      const row = map.get(key) || { expected: 0, collected: 0, arrears: 0 };
      row.expected += Number(u.rent_amount || 0);
      row.collected += Number(u.total_allocated || 0);
      row.arrears += Math.max(0, Number(u.balance || 0));
      map.set(key, row);
    });
    return [...map.entries()].map(([property, v]) => ({
      property,
      expected: Math.round(v.expected),
      collected: Math.round(v.collected),
      arrears: Math.round(v.arrears),
    }));
  }, [dashboardData]);

  const cashflowTrendData = useMemo(() => {
    // Keyed by a sortable date so the line runs left to right. Payments arrive
    // newest-first and expenses were appended after them, so the chart used to
    // read backwards with stray points tacked on the end.
    const map = new Map<string, { sortKey: string; collected: number; expenses: number }>();

    const bucket = (isoDate: string) => {
      const d = new Date(isoDate);
      if (Number.isNaN(d.getTime())) return null;
      return selectedDate
        ? { sortKey: toDateKey(d), label: format(d, "MMM d") }
        : { sortKey: toMonthKey(d), label: format(d, "MMM yyyy") };
    };

    const add = (isoDate: string, field: "collected" | "expenses", amount: number) => {
      const b = bucket(isoDate);
      if (!b) return;
      const row = map.get(b.label) ?? { sortKey: b.sortKey, collected: 0, expenses: 0 };
      row[field] += amount;
      map.set(b.label, row);
    };

    filteredPayments.forEach((p) => add(p.payment_date, "collected", Number(p.amount || 0)));
    (expenses ?? []).forEach((e) => add(e.expense_date, "expenses", Number(e.amount || 0)));

    return [...map.entries()]
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([period, v]) => ({
        period,
        collected: Math.round(v.collected),
        expenses: Math.round(v.expenses),
        net: Math.round(v.collected - v.expenses),
      }));
  }, [filteredPayments, expenses, selectedDate]);

  const assistantActions = useMemo(
    () =>
      buildAssistantQueue({
        collectionRate,
        occupiedUnits: dashboardData?.stats.occupiedUnits || 0,
        vacantUnits: dashboardData?.stats.vacantUnits || 0,
        totalBalance: dashboardData?.stats.totalBalance || 0,
        pendingReminders: pendingReminderCount,
        highRiskCount: riskSummary.high,
        topOverdueTenantId: topOverdueTenant?.tenant_id || undefined,
      }),
    [
      collectionRate,
      dashboardData?.stats.occupiedUnits,
      dashboardData?.stats.vacantUnits,
      dashboardData?.stats.totalBalance,
      pendingReminderCount,
      riskSummary.high,
      topOverdueTenant?.tenant_id,
    ]
  );

  return (
    <PageContainer title="Reports" subtitle={dateLabel}>

      <MonthSelector
        value={selectedDate}
        onChange={setSelectedDate}
        allTimeLabel="All-Time Financials"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-5">
          <Tabs defaultValue="money" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="money" className="text-xs px-1">Money</TabsTrigger>
              <TabsTrigger value="charts" className="text-xs px-1">Charts</TabsTrigger>
              <TabsTrigger value="followups" className="text-xs px-1">Follow-ups</TabsTrigger>
              <TabsTrigger value="docs" className="text-xs px-1">Documents</TabsTrigger>
            </TabsList>
          <TabsContent value="money" className="space-y-5 mt-0 focus-visible:outline-none">
            {/* Same ledger shape as the dashboard, so the two screens agree on
                what the figures mean and how they add up. */}
            <LedgerSummary
              period={dateLabel}
              rows={[
                {
                  label: "Rent billed",
                  value: billedAmount,
                  note: `${occupiedUnits} of ${totalUnits} units occupied`,
                },
                {
                  label: "Applied to that rent",
                  value: appliedAmount,
                  tone: "paid",
                  note:
                    collectionRate > 0
                      ? `${collectionRate.toFixed(0)}% of what was billed`
                      : undefined,
                },
                {
                  label: "Still owed",
                  value: outstandingBalance,
                  tone: outstandingBalance > 0 ? "owed" : undefined,
                  note:
                    totalCredit > 0
                      ? `${formatKES(totalCredit)} held in tenant credit`
                      : `${tenantsInArrears} ${tenantsInArrears === 1 ? "tenant" : "tenants"} behind`,
                  ruleAbove: true,
                  onClick: () => navigate("/tenants"),
                },
              ]}
            />

            <LedgerSummary
              period="Cash"
              rows={[
                {
                  label: "Received",
                  value: cashReceived,
                  tone: "paid",
                  note: "Money that actually arrived in the period",
                },
                {
                  label: "Expenses paid",
                  value: totalExpensesAmount,
                  note: topExpenseCategories[0]
                    ? `Mostly ${topExpenseCategories[0].name}`
                    : undefined,
                  onClick: () => navigate("/expenses"),
                },
                {
                  label: isProfit ? "Kept this period" : "Short this period",
                  value: Math.abs(netIncome),
                  total: true,
                },
              ]}
            />

            {selectedDate && (
              <section className="surface-panel p-4">
                <p className="eyebrow mb-3">Against last month</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Cash received</dt>
                    <dd
                      className={cn(
                        "text-sm font-semibold tabular-nums mt-1",
                        collectionDelta > 0 && "text-success",
                        collectionDelta < 0 && "text-destructive"
                      )}
                    >
                      {collectionDelta >= 0 ? "+" : "-"}
                      {formatKES(Math.abs(collectionDelta))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Net income</dt>
                    <dd
                      className={cn(
                        "text-sm font-semibold tabular-nums mt-1",
                        netDelta > 0 && "text-success",
                        netDelta < 0 && "text-destructive"
                      )}
                    >
                      {netDelta >= 0 ? "+" : "-"}
                      {formatKES(Math.abs(netDelta))}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="surface-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-baseline justify-between gap-3">
                <p className="eyebrow">Recent payments</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {transactionPage.total}
                </p>
              </div>

              {transactionPage.total === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                  No payments recorded {selectedDate ? "this month" : "yet"}.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {transactionPage.visible.map((payment) => (
                      <li key={payment.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                          {format(new Date(payment.payment_date), "d MMM")}
                        </span>
                        <span className="text-xs text-muted-foreground truncate flex-1 text-right">
                          {payment.mpesa_code ?? ""}
                        </span>
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {formatKES(payment.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {transactionPage.hasMore && (
                    <div className="p-3 border-t border-border">
                      <ShowMore
                        remaining={transactionPage.remaining}
                        noun="payment"
                        onClick={transactionPage.showMore}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </TabsContent>
          <TabsContent value="charts" className="space-y-5 mt-0 focus-visible:outline-none">
            {/* Occupancy and payment status are four numbers each. Proportional
                bars read them faster than pie slices on a phone, and they carry
                the figure alongside rather than in a tooltip you have to tap. */}
            <section className="surface-panel p-4">
              <p className="eyebrow mb-3">Who has paid, {dateLabel}</p>
              {paymentStatusChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No occupied units this period.</p>
              ) : (
                <dl className="space-y-2.5">
                  {paymentStatusChartData.map((row) => {
                    const share = occupiedUnits > 0 ? row.value / occupiedUnits : 0;
                    const label =
                      row.name === "paid"
                        ? "Paid in full"
                        : row.name === "overpaid"
                          ? "Paid ahead"
                          : row.name === "partial"
                            ? "Part paid"
                            : "Nothing paid";
                    const bar =
                      row.name === "paid" || row.name === "overpaid"
                        ? "bg-success"
                        : row.name === "partial"
                          ? "bg-warning"
                          : "bg-destructive";
                    return (
                      <div key={row.name} className="flex items-center gap-3">
                        <dt className="text-sm min-w-0 flex-1 truncate">{label}</dt>
                        <div className="h-1.5 w-20 bg-muted rounded-sm overflow-hidden shrink-0">
                          <div className={cn("h-full", bar)} style={{ width: `${share * 100}%` }} />
                        </div>
                        <dd className="text-sm font-semibold tabular-nums shrink-0 w-8 text-right">
                          {row.value}
                        </dd>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <dt className="text-sm min-w-0 flex-1">Vacant</dt>
                    <div className="h-1.5 w-20 bg-muted rounded-sm overflow-hidden shrink-0">
                      <div
                        className="h-full bg-muted-foreground/40"
                        style={{
                          width: `${totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <dd className="text-sm font-semibold tabular-nums shrink-0 w-8 text-right">
                      {totalUnits - occupiedUnits}
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="surface-panel p-4 min-w-0">
              <p className="eyebrow mb-3">Money in and out</p>
              {cashflowTrendData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing recorded this period.</p>
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashflowTrendData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke={chart.grid} vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: chart.axis }}
                        tickLine={false}
                        axisLine={{ stroke: chart.grid }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: chart.axis }}
                        tickFormatter={formatCompact}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatKES(value)}
                        contentStyle={{ fontSize: 13, borderRadius: 8 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="collected" stroke={chart.collected} strokeWidth={2} dot={false} name="Collected" />
                      <Line type="monotone" dataKey="expenses" stroke={chart.expenses} strokeWidth={2} dot={false} name="Expenses" />
                      <Line type="monotone" dataKey="net" stroke={chart.net} strokeWidth={2} dot={false} name="Net" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="surface-panel p-4 min-w-0">
              <p className="eyebrow mb-3">How each property is doing</p>
              {propertyPerformanceChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties to compare yet.</p>
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={propertyPerformanceChartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke={chart.grid} vertical={false} />
                      <XAxis
                        dataKey="property"
                        tick={{ fontSize: 11, fill: chart.axis }}
                        tickLine={false}
                        axisLine={{ stroke: chart.grid }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: chart.axis }}
                        tickFormatter={formatCompact}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatKES(value)}
                        contentStyle={{ fontSize: 13, borderRadius: 8 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="expected" fill={chart.billed} name="Rent roll" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="collected" fill={chart.collected} name="Collected" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="arrears" fill={chart.arrears} name="Arrears" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </TabsContent>
          <TabsContent value="followups" className="space-y-5 mt-0 focus-visible:outline-none">
            {/* This tab used to carry five overlapping lists: an action queue,
                biggest arrears, top risk tenants, anomalies and the reminder
                queue — most of them naming the same people. Now: what to do,
                who owes, what to send. */}

            <AssistantPanel
              storageKey="assistant:dismissed:reports"
              actions={assistantActions}
              onAction={(route) => navigate(route)}
            />

            <section className="surface-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-baseline justify-between gap-3">
                <p className="eyebrow">Who owes the most</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {topArrearsUnits.length}
                </p>
              </div>

              {topArrearsUnits.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                  Nobody is behind for {dateLabel}.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {topArrearsUnits.map((unit) => (
                    <li key={unit.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/tenants?tenantId=${unit.tenant_id}`)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {unit.tenant_name || "Unassigned"}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            Unit {unit.unit_number} · {unit.property_name}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-destructive shrink-0">
                          {formatKES(Math.round(Number(unit.balance || 0)))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {anomalies.length > 0 && (
              <section className="surface-panel p-4">
                <p className="eyebrow mb-3">Worth a look</p>
                <ul className="space-y-2">
                  {anomalies.map((item) => (
                    <li key={item} className="text-sm flex gap-2">
                      <span aria-hidden="true" className="text-muted-foreground">
                        &bull;
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="surface-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="eyebrow">Reminders to send</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {pendingReminderCount} pending
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Score your tenants, then queue a reminder for anyone behind.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={runRiskScan.isPending}
                    onClick={() => runRiskScan.mutate(riskMonthKey)}
                  >
                    {runRiskScan.isPending ? "Scoring..." : "Score tenants"}
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={enqueueReminders.isPending}
                    onClick={() => enqueueReminders.mutate(riskMonthKey)}
                  >
                    {enqueueReminders.isPending ? "Queueing..." : "Queue reminders"}
                  </Button>
                </div>
              </div>

              {reminderLoading ? (
                <div className="p-4">
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : reminderQueue.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                  Nothing queued for {dateLabel}.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {reminderPage.visible.map((row) => {
                      const tenant = tenantById.get(row.tenant_id);
                      const unit = dashboardData?.units?.find(
                        (u) => u.tenant_id === row.tenant_id
                      );
                      const isUpdating =
                        updateReminderAction.isPending &&
                        updateReminderAction.variables?.id === row.id;
                      const done = row.status === "sent" || row.status === "cancelled";

                      const sendLink =
                        unit?.tenant_phone && (unit.balance ?? 0) > 0
                          ? whatsappLink(
                              unit.tenant_phone,
                              buildArrearsReminder({
                                tenantName: unit.tenant_name ?? "there",
                                unitNumber: unit.unit_number,
                                amount: unit.balance,
                                monthsBehind: 1,
                                payTo: landlordSettings?.payTo || null,
                              })
                            )
                          : null;

                      return (
                        <li key={row.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {tenant?.name ?? "Tenant"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Unit {tenant?.unit ?? "-"} · {tenant?.property ?? "Unknown"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "text-xs rounded-sm px-2 py-1 shrink-0",
                                row.status === "sent" && "bg-success/10 text-success",
                                row.status === "cancelled" && "bg-muted text-muted-foreground",
                                row.status === "pending" && "bg-warning/10 text-warning",
                                row.status === "scheduled" && "bg-muted text-muted-foreground"
                              )}
                            >
                              {row.status === "sent"
                                ? "Sent"
                                : row.status === "cancelled"
                                  ? "Cancelled"
                                  : row.status === "scheduled"
                                    ? "Snoozed"
                                    : "To send"}
                            </span>
                          </div>

                          {!done && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {sendLink ? (
                                <Button size="sm" disabled={isUpdating} asChild>
                                  <a
                                    href={sendLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() =>
                                      updateReminderAction.mutate({
                                        id: row.id,
                                        monthKey: riskMonthKey,
                                        action: "sent",
                                        notes: "Sent via WhatsApp",
                                      })
                                    }
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Send
                                  </a>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating}
                                  title="No phone number on file, or nothing outstanding"
                                  onClick={() =>
                                    updateReminderAction.mutate({
                                      id: row.id,
                                      monthKey: riskMonthKey,
                                      action: "sent",
                                      notes: "Marked sent manually",
                                    })
                                  }
                                >
                                  Mark sent
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateReminderAction.mutate({
                                    id: row.id,
                                    monthKey: riskMonthKey,
                                    action: "snooze",
                                    snoozeHours: 24,
                                    notes: "Snoozed for a day",
                                  })
                                }
                              >
                                Snooze a day
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateReminderAction.mutate({
                                    id: row.id,
                                    monthKey: riskMonthKey,
                                    action: "cancel",
                                    notes: "Cancelled from reports",
                                  })
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {reminderPage.hasMore && (
                    <div className="p-3 border-t border-border">
                      <ShowMore
                        remaining={reminderPage.remaining}
                        noun="reminder"
                        onClick={reminderPage.showMore}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </TabsContent>
          <TabsContent value="docs" className="space-y-5 mt-0 focus-visible:outline-none">
            <section className="surface-panel p-4">
              <p className="eyebrow mb-3">Which file do I need?</p>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold">Operations Pack</dt>
                  <dd className="text-muted-foreground mt-0.5">
                    One period, everything in it — rent roll, arrears ranked by size, every
                    payment and every cost. Your own month-end file.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Lender Pack</dt>
                  <dd className="text-muted-foreground mt-0.5">
                    Twelve months of collections and costs, with the average monthly net a
                    bank underwrites against.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Full Statement</dt>
                  <dd className="text-muted-foreground mt-0.5">
                    The raw per-tenant, per-month ledger, for an accountant.
                  </dd>
                </div>
              </dl>
            </section>

        <div className="surface-panel p-3 space-y-4">
          <div>
            <p className="text-sm font-semibold">Operations Pack</p>
            <p className="text-xs text-muted-foreground mb-2">
              {dateLabel}: summary, rent roll, arrears, collections, expenses, per-property
              performance and the reminder queue. This replaced the old Master Pack and
              covers everything it did.
            </p>
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleExportOperations}>
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          </div>

          <div className="border-t border-border/60 pt-3">
            <p className="text-sm font-semibold">Lender Pack</p>
            <p className="text-xs text-muted-foreground mb-2">
              {annual
                ? `${annual.from} to ${annual.to}: twelve months of income history, average monthly net and collection rate — what a bank asks for.`
                : "Twelve months of income history for a loan application."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" className="w-full sm:w-auto" disabled={!annual} onClick={handleExportLender}>
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
              <Button size="sm" variant="outline" className="w-full sm:w-auto" disabled={!annual} onClick={handlePrintLender}>
                Print as PDF
              </Button>
            </div>
          </div>

          <div className="border-t border-border/60 pt-3">
            <p className="text-sm font-semibold">Accounting exports</p>
            <p className="text-xs text-muted-foreground mb-2">
              Ledger-level detail for an accountant or auditor.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleExportSummary}>
                <Download className="h-4 w-4 mr-2" />
                KPI Summary
              </Button>
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleExportStatement}>
                <Download className="h-4 w-4 mr-2" />
                Full Statement
              </Button>
            </div>
          </div>
        </div>
          </TabsContent>
          </Tabs>
        </div>
      )}
    </PageContainer>
  );
}
