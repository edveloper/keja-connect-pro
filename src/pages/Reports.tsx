import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboard";
import {
  useTotalExpenses,
  useExpenses,
  useExpenseCategories,
} from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import {
  useReportNarrative,
  useGenerateReportNarrative,
  useAiServiceHealth,
} from "@/hooks/useReportNarrative";
import {
  useRiskSummary,
  useReminderQueue,
  useRunTenantRiskScoring,
  useEnqueueRiskReminders,
  useUpdateReminderAction,
  useTenantRiskSnapshots,
} from "@/hooks/useIntelligence";
import {
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Sparkles,
  Wifi,
  WifiOff,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { buildAssistantQueue } from "@/lib/assistantQueue";
import { AssistantPanel } from "@/components/intelligence/AssistantPanel";

import { exportFinancialSummaryExcel } from "@/utils/exports/exportFinancialSummary";
import { exportFinancialStatementExcel } from "@/utils/exports/exportFinancialStatement";

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const navigate = useNavigate();

  const monthKey = selectedDate ? format(selectedDate, "yyyy-MM") : null;
  const narrativeMonthKey = monthKey ?? "all-time";
  const riskMonthKey = selectedDate ? format(selectedDate, "yyyy-MM") : new Date().toISOString().slice(0, 7);

  const dateLabel = selectedDate
    ? format(selectedDate, "MMMM yyyy")
    : "All-Time Financials";

  const { data: dashboardData, isLoading: dashboardLoading } =
    useDashboardData(selectedDate);
  const previousDate = selectedDate ? subMonths(selectedDate, 1) : null;
  const { data: previousDashboardData } = useDashboardData(previousDate);

  const { data: totalExpenses, isLoading: expensesLoading } =
    useTotalExpenses(monthKey);
  const previousMonthKey = previousDate ? format(previousDate, "yyyy-MM") : null;
  const { data: previousTotalExpenses } = useTotalExpenses(previousMonthKey);

  const { data: expenses } = useExpenses(monthKey);
  const { data: categories } = useExpenseCategories();
  const { data: paymentsData } = usePayments();
  const { summary: riskSummary, isLoading: riskLoading } = useRiskSummary(riskMonthKey);
  const { data: riskSnapshots = [] } = useTenantRiskSnapshots(riskMonthKey);
  const { data: reminderQueue = [], isLoading: reminderLoading } = useReminderQueue(riskMonthKey);
  const runRiskScan = useRunTenantRiskScoring();
  const enqueueReminders = useEnqueueRiskReminders();
  const updateReminderAction = useUpdateReminderAction();

  /** ----------------------------
   *  FILTERED PAYMENTS (MONTH-AWARE)
   *  ---------------------------- */
  const filteredPayments = useMemo(() => {
    if (!paymentsData) return [];

    if (!monthKey) return paymentsData;

    return paymentsData.filter(
      (p) => p.payment_month === monthKey
    );
  }, [paymentsData, monthKey]);

  /** ----------------------------
   *  Financial Math (FINAL LOGIC)
   *  ---------------------------- */
  const billedAmount = dashboardData?.stats?.totalCharges ?? 0;
  const allocatedAmount = dashboardData?.stats?.totalAllocated ?? 0;
  const totalCollected = allocatedAmount;

  const totalExpensesAmount = totalExpenses ?? 0;
  const netIncome = totalCollected - totalExpensesAmount;
  const isProfit = netIncome >= 0;

  const expectedRent = useMemo(() => {
    return (
      dashboardData?.units?.reduce(
        (sum, unit) => sum + (unit.rent_amount || 0),
        0
      ) || 0
    );
  }, [dashboardData]);

  const collectionRateBase = monthKey ? expectedRent : billedAmount;
  const collectionRate =
    collectionRateBase > 0 ? (totalCollected / collectionRateBase) * 100 : 0;

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
  const { data: narrative, isLoading: narrativeLoading } = useReportNarrative(narrativeMonthKey);
  const generateNarrative = useGenerateReportNarrative();
  const {
    data: aiHealth,
    isLoading: aiHealthLoading,
    isFetching: aiHealthChecking,
    refetch: refetchAiHealth,
  } = useAiServiceHealth();

  /** ----------------------------
   *  EXPORT HANDLERS
   *  ---------------------------- */
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
      const message = error instanceof Error ? error.message : "Failed to export summary";
      toast({
        title: "Export failed",
        description: message,
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
      const message = error instanceof Error ? error.message : "Failed to export statement";
      toast({
        title: "Export failed",
        description: message,
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

  const topRiskTenants = useMemo(() => {
    return riskSnapshots
      .slice(0, 5)
      .map((snapshot) => {
        const tenant = tenantById.get(snapshot.tenant_id);
        return {
          tenantId: snapshot.tenant_id,
          name: tenant?.name ?? "Tenant",
          unit: tenant?.unit ?? "-",
          property: tenant?.property ?? "Unknown Property",
          score: snapshot.risk_score,
          level: snapshot.risk_level,
        };
      });
  }, [riskSnapshots, tenantById]);

  const anomalies = useMemo(() => {
    const items: string[] = [];
    if (expectedRent > 0 && totalCollected === 0) {
      items.push("No collections recorded for this period despite billed rent.");
    }
    if (topExpenseShare >= 0.6 && topExpenseCategories.length > 0) {
      items.push(
        `Expense concentration risk: ${topExpenseCategories[0].name} is ${Math.round(
          topExpenseShare * 100
        )}% of all expenses.`
      );
    }
    if (pendingReminderCount >= 5) {
      items.push(`Reminder pressure is high: ${pendingReminderCount} pending reminders.`);
    }
    if (collectionRate < 50 && expectedRent > 0) {
      items.push(`Collection efficiency is low at ${collectionRate.toFixed(0)}%.`);
    }
    return items.slice(0, 3);
  }, [
    expectedRent,
    totalCollected,
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

  const handleGenerateNarrative = () => {
    generateNarrative.mutate({
      monthKey: narrativeMonthKey,
      input: {
        monthLabel: dateLabel,
        totalCollected,
        totalExpenses: totalExpensesAmount,
        netIncome,
        collectionRate,
        billedAmount,
        expectedRent,
        topExpenseCategories,
      },
    });
  };

  const aiStatus: "ready" | "offline" | "retrying" | "failed" = generateNarrative.isPending
    ? "retrying"
    : generateNarrative.isError
      ? "failed"
      : aiHealth?.ok
        ? "ready"
        : "offline";

  const aiStatusBadge = (() => {
    if (aiHealthLoading || aiHealthChecking) {
      return (
        <Badge variant="outline" className="gap-1">
          <RotateCw className="h-3 w-3 animate-spin" />
          Checking
        </Badge>
      );
    }
    if (aiStatus === "ready") {
      return (
        <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700">
          <Wifi className="h-3 w-3" />
          Ready
        </Badge>
      );
    }
    if (aiStatus === "retrying") {
      return (
        <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
          <RotateCw className="h-3 w-3 animate-spin" />
          Retrying
        </Badge>
      );
    }
    if (aiStatus === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  })();

  return (
    <PageContainer title="Financial Reports" subtitle={dateLabel}>
      {/* EXPORT ACTIONS */}
      <div className="surface-panel mb-4 p-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleExportSummary}>
          <Download className="h-4 w-4 mr-2" />
          Export Summary
        </Button>

        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleExportStatement}>
          <Download className="h-4 w-4 mr-2" />
          Export Statement
        </Button>
        </div>
      </div>

      {/* DATE SELECTOR */}
      <div className="surface-panel flex items-center justify-between mb-6 p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setSelectedDate((prev) => (prev ? subMonths(prev, 1) : new Date()))
          }
        >
          <ChevronLeft className="h-5 w-5 text-slate-400" />
        </Button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <h2 className="font-bold text-sm sm:text-base text-foreground">
              {dateLabel}
            </h2>
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
          onClick={() =>
            setSelectedDate((prev) => (prev ? addMonths(prev, 1) : new Date()))
          }
        >
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* NET SURPLUS */}
          <Card
            className={cn(
              "p-5 sm:p-6 border-none shadow-md",
              isProfit
                ? "bg-blue-50/80 text-blue-900"
                : "bg-destructive/5 text-destructive"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {isProfit ? "Net Surplus" : "Net Deficit"}
            </p>
            <p className="text-3xl font-black">
              KES {Math.abs(netIncome).toLocaleString()}
            </p>
          </Card>

          {/* REVENUE / EXPENSES */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs uppercase font-bold text-slate-400">
                Collections
              </p>
              <p className="text-xl font-black">
                KES {totalCollected.toLocaleString()}
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs uppercase font-bold text-slate-400">
                Expenses
              </p>
              <p className="text-xl font-black">
                KES {totalExpensesAmount.toLocaleString()}
              </p>
            </Card>
          </div>

          {/* COLLECTION RATE */}
          <Card className="p-5">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold">
                Collection Efficiency
              </span>
              <Badge>{collectionRate.toFixed(0)}%</Badge>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
          </Card>

          {/* LATEST PAYMENTS */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4" />
              <span className="font-bold text-sm">
                Latest Transactions
              </span>
            </div>

            <div className="space-y-2">
              {filteredPayments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>KES {p.amount.toLocaleString()}</span>
                  <span>
                    {format(new Date(p.payment_date), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Collapsible open={intelligenceOpen} onOpenChange={setIntelligenceOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Intelligence & AI</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">6 sections</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${intelligenceOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-5">
              <AssistantPanel
                storageKey="assistant:dismissed:reports"
                subtitle={`Action queue for ${dateLabel}`}
                stats={[
                  { label: "High Risk", value: String(riskSummary.high) },
                  { label: "Pending Queue", value: String(pendingReminderCount) },
                  { label: "Collection", value: `${collectionRate.toFixed(0)}%` },
                  { label: "Vacant Units", value: String(dashboardData?.stats.vacantUnits || 0) },
                ]}
                actions={assistantActions}
                onAction={(route) => navigate(route)}
              />

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Trend Signals</h3>
                  <Badge variant="outline">
                    {selectedDate ? `vs ${format(previousDate ?? new Date(), "MMM yyyy")}` : "All-time"}
                  </Badge>
                </div>
                {selectedDate ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Collections Delta</p>
                      <p className={cn("text-lg font-black", collectionDelta >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {collectionDelta >= 0 ? "+" : "-"}KES {Math.abs(collectionDelta).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Net Income Delta</p>
                      <p className={cn("text-lg font-black", netDelta >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {netDelta >= 0 ? "+" : "-"}KES {Math.abs(netDelta).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Trend deltas are shown in monthly view.</p>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Top Risk Tenants</h3>
                  <Badge variant="outline">{topRiskTenants.length} shown</Badge>
                </div>
                {riskLoading ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : topRiskTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No risk profiles available for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {topRiskTenants.map((row) => (
                      <button
                        key={row.tenantId}
                        type="button"
                        className="w-full rounded-xl border border-border/60 p-3 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => navigate(`/tenants?tenantId=${row.tenantId}`)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{row.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              Unit {row.unit} | {row.property}
                            </p>
                          </div>
                          <Badge
                            variant={
                              row.level === "high"
                                ? "destructive"
                                : row.level === "medium"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {row.level} ({row.score})
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Anomalies</h3>
                  <Badge variant="outline">{anomalies.length}</Badge>
                </div>
                {anomalies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No major anomalies detected for this period.</p>
                ) : (
                  <ul className="space-y-2">
                    {anomalies.map((item) => (
                      <li key={item} className="text-sm rounded-xl border border-border/60 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">AI Summary</span>
                {aiStatusBadge}
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={aiHealthChecking}
                  onClick={() => refetchAiHealth()}
                >
                  Check AI
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={generateNarrative.isPending || !aiHealth?.ok}
                  onClick={handleGenerateNarrative}
                >
                  {generateNarrative.isPending
                    ? "Generating..."
                    : narrative
                      ? "Regenerate"
                      : "Generate Summary"}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mb-3 break-all">
              {aiHealth?.ok
                ? `AI endpoint online at ${aiHealth.baseUrl} (${aiHealth.model}).`
                : aiHealth?.error ?? "AI service is offline. Use Check AI after starting the service."}
            </p>

            {narrativeLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : narrative?.narrative_text ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {narrative.narrative_text}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI summary yet. Generate one for this period.
              </p>
            )}
              </Card>

              <Card>
                <CardContent className="py-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                        Intelligence Snapshot
                      </p>
                      <h3 className="text-sm font-bold text-foreground mt-1">
                        Risk and reminder queue for {riskMonthKey}
                      </h3>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={runRiskScan.isPending}
                        onClick={() => runRiskScan.mutate(riskMonthKey)}
                      >
                        {runRiskScan.isPending ? "Running..." : "Run Risk Scan"}
                      </Button>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={enqueueReminders.isPending}
                        onClick={() => enqueueReminders.mutate(riskMonthKey)}
                      >
                        {enqueueReminders.isPending ? "Queueing..." : "Queue Reminders"}
                      </Button>
                    </div>
                  </div>

                  {riskLoading || reminderLoading ? (
                    <Skeleton className="h-14 rounded-xl" />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">High Risk: {riskSummary.high}</Badge>
                      <Badge variant="secondary">Medium Risk: {riskSummary.medium}</Badge>
                      <Badge variant="outline">Low Risk: {riskSummary.low}</Badge>
                      <Badge variant="outline">
                        Queue Pending: {reminderQueue.filter((r) => r.status === "pending").length}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground">Reminder Queue</h3>
                    <Badge variant="outline">{reminderQueue.length} item(s)</Badge>
                  </div>

                  {reminderLoading ? (
                    <Skeleton className="h-16 rounded-xl" />
                  ) : reminderQueue.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No queued reminders for {riskMonthKey}. Run risk scan, then queue reminders.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reminderQueue.slice(0, 6).map((row) => {
                        const tenant = tenantById.get(row.tenant_id);
                        const meta = (row.metadata_json ?? {}) as { risk_level?: string; risk_score?: number };
                        const riskLevel = meta.risk_level ?? "unknown";
                        const riskScore = meta.risk_score ?? 0;
                        const isRowUpdating =
                          updateReminderAction.isPending &&
                          updateReminderAction.variables?.id === row.id;

                        return (
                          <div
                            key={row.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/60 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => navigate(`/tenants?tenantId=${row.tenant_id}`)}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {tenant?.name ?? "Tenant"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Unit {tenant?.unit ?? "-"} | {tenant?.property ?? "Unknown Property"}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <Badge
                                variant={
                                  riskLevel === "high"
                                    ? "destructive"
                                    : riskLevel === "medium"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {riskLevel} ({riskScore})
                              </Badge>
                              <Badge variant="outline">P{row.priority}</Badge>
                              <Badge variant={row.status === "pending" ? "default" : "outline"}>
                                {row.status}
                              </Badge>
                              {row.scheduled_for ? (
                                <Badge variant="outline">
                                  {`Scheduled ${format(new Date(row.scheduled_for), "MMM d, HH:mm")}`}
                                </Badge>
                              ) : null}
                              <div
                                className="flex flex-wrap items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={
                                    isRowUpdating ||
                                    row.status === "sent" ||
                                    row.status === "cancelled"
                                  }
                                  onClick={() =>
                                    updateReminderAction.mutate({
                                      id: row.id,
                                      monthKey: riskMonthKey,
                                      action: "sent",
                                      notes: "Marked sent from reports queue",
                                    })
                                  }
                                >
                                  Mark Sent
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={
                                    isRowUpdating ||
                                    row.status === "sent" ||
                                    row.status === "cancelled"
                                  }
                                  onClick={() =>
                                    updateReminderAction.mutate({
                                      id: row.id,
                                      monthKey: riskMonthKey,
                                      action: "snooze",
                                      snoozeHours: 24,
                                      notes: "Snoozed for 24 hours",
                                    })
                                  }
                                >
                                  Snooze 24h
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={
                                    isRowUpdating ||
                                    row.status === "sent" ||
                                    row.status === "cancelled"
                                  }
                                  onClick={() =>
                                    updateReminderAction.mutate({
                                      id: row.id,
                                      monthKey: riskMonthKey,
                                      action: "cancel",
                                      notes: "Cancelled from reports queue",
                                    })
                                  }
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </PageContainer>
  );
}
