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
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  PieChart,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { exportFinancialSummaryExcel } from "@/utils/exports/exportFinancialSummary";
import { exportFinancialStatementExcel } from "@/utils/exports/exportFinancialStatement";

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthKey = selectedDate ? format(selectedDate, "yyyy-MM") : null;

  const dateLabel = selectedDate
    ? format(selectedDate, "MMMM yyyy")
    : "All-Time Financials";

  const { data: dashboardData, isLoading: dashboardLoading } =
    useDashboardData(selectedDate);

  const { data: totalExpenses, isLoading: expensesLoading } =
    useTotalExpenses(monthKey);

  const { data: expenses } = useExpenses(monthKey);
  const { data: categories } = useExpenseCategories();
  const { data: paymentsData } = usePayments();

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
  const totalCollected =
    dashboardData?.stats?.totalCharges ?? 0;


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

  const collectionRate =
    expectedRent > 0 ? (totalCollected / expectedRent) * 100 : 0;

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

  /** ----------------------------
   *  EXPORT HANDLERS
   *  ---------------------------- */
  const handleExportSummary = async () => {
    await exportFinancialSummaryExcel({
      monthKey,
      totalCollected,
      totalExpenses: totalExpensesAmount,
      netIncome,
    });
  };

  const handleExportStatement = async () => {
    await exportFinancialStatementExcel({ monthKey });
  };

  return (
    <PageContainer title="Financial Reports" subtitle={dateLabel}>
      {/* EXPORT ACTIONS */}
      <div className="flex justify-end gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={handleExportSummary}>
          <Download className="h-4 w-4 mr-2" />
          Export Summary
        </Button>

        <Button size="sm" variant="outline" onClick={handleExportStatement}>
          <Download className="h-4 w-4 mr-2" />
          Export Statement
        </Button>
      </div>

      {/* DATE SELECTOR */}
      <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
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
            <h2 className="font-bold text-sm sm:text-base text-slate-800">
              {dateLabel}
            </h2>
          </div>
          <button
            onClick={() => setSelectedDate(selectedDate ? null : new Date())}
            className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5 hover:underline"
          >
            {selectedDate ? "Switch to All-Time" : "Back to Monthly"}
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
                Revenue
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
        </div>
      )}
    </PageContainer>
  );
}
