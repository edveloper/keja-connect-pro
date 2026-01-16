import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses, useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { 
  TrendingUp, TrendingDown, Wallet, Banknote, 
  PieChart, Calendar, Receipt, ChevronLeft, ChevronRight 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  // 1. Unified Date State
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const monthKey = selectedDate ? selectedDate.toISOString().slice(0, 7) : null;
  const dateLabel = selectedDate ? format(selectedDate, "MMMM yyyy") : "All-Time Financials";

  // 2. Data Fetching (Synced with monthKey)
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData(selectedDate);
  const { data: totalExpenses, isLoading: expensesLoading } = useTotalExpenses(monthKey);
  const { data: expenses } = useExpenses(monthKey);
  const { data: categories } = useExpenseCategories();
  const { data: paymentsData } = usePayments(); // Note: If your usePayments hook doesn't support month filtering yet, it will show all payments.

  // 3. Financial Calculations
  const totalCollected = dashboardData?.stats?.totalCollected || 0;
  const totalExpensesAmount = totalExpenses || 0;
  const netIncome = totalCollected - totalExpensesAmount;
  const isProfit = netIncome >= 0;

  const expectedRent = useMemo(() => {
    return dashboardData?.units?.reduce((sum, unit) => sum + (unit.rent_amount || 0), 0) || 0;
  }, [dashboardData]);

  const collectionRate = expectedRent > 0 ? (totalCollected / expectedRent) * 100 : 0;

  const expensesByCategory = useMemo(() => {
    return expenses?.reduce((acc, expense) => {
      const categoryName = categories?.find(c => c.id === expense.category_id)?.name || 'Other';
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>) || {};
  }, [expenses, categories]);

  const isLoading = dashboardLoading || expensesLoading;

  return (
    <PageContainer title="Financial Reports" subtitle={dateLabel}>
      
      {/* --- DATE SELECTOR --- */}
      <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSelectedDate(prev => prev ? subMonths(prev, 1) : new Date())}
        >
          <ChevronLeft className="h-5 w-5 text-slate-400" />
        </Button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <h2 className="font-bold text-sm sm:text-base text-slate-800">{dateLabel}</h2>
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
          onClick={() => setSelectedDate(prev => prev ? addMonths(prev, 1) : new Date())}
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
          {/* Net Income Card - Updated to Softer Blue Style */}
          <Card className={cn(
            "p-5 sm:p-6 border-none shadow-md transition-all",
            isProfit 
              ? "bg-blue-50/80 text-blue-900" 
              : "bg-destructive/5 text-destructive"
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold mb-1 uppercase tracking-widest opacity-70">
                  {isProfit ? 'Net Surplus' : 'Net Deficit'}
                </p>
                <p className="text-2xl sm:text-4xl font-black tracking-tighter truncate">
                  KES {Math.abs(netIncome).toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                    {isProfit ? 'Profit' : 'Loss'} for {selectedDate ? format(selectedDate, "MMM") : 'Period'}
                  </span>
                </div>
              </div>
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shrink-0",
                isProfit ? 'bg-blue-500/10' : 'bg-destructive/10'
              )}>
                {isProfit ? (
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
              </div>
            </div>
          </Card>

          {/* Income vs Expenses Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-4 border-slate-100 shadow-sm bg-white">
              <div className="flex flex-col gap-1">
                <div className="p-2 w-fit rounded-lg bg-emerald-50 mb-1">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Revenue</p>
                <p className="text-lg font-black text-slate-900">
                  KES {(totalCollected / 1000).toFixed(1)}K
                </p>
              </div>
            </Card>
            <Card className="p-4 border-slate-100 shadow-sm bg-white">
              <div className="flex flex-col gap-1">
                <div className="p-2 w-fit rounded-lg bg-rose-50 mb-1">
                  <Wallet className="h-4 w-4 text-rose-600" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expenses</p>
                <p className="text-lg font-black text-slate-900">
                  KES {(totalExpensesAmount / 1000).toFixed(1)}K
                </p>
              </div>
            </Card>
          </div>

          {/* Collection Rate Progress */}
          <Card className="p-5 border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700">Collection Efficiency</span>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                {collectionRate.toFixed(0)}%
              </Badge>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 mt-4 pt-4 border-t border-slate-50 gap-4">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Actual</p>
                <p className="text-xs font-bold text-slate-900">KES {totalCollected.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Potential</p>
                <p className="text-xs font-bold text-slate-900">KES {expectedRent.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {/* Expenses Breakdown */}
          <Card className="p-5 border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4 text-rose-500" />
              <span className="text-xs sm:text-sm font-bold text-slate-700">Spending by Category</span>
            </div>
            <div className="space-y-2">
              {Object.entries(expensesByCategory).length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">No Data Available</p>
                </div>
              ) : (
                Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                      <span className="text-xs font-bold text-slate-600 truncate mr-2 capitalize">{category}</span>
                      <span className="text-xs font-black text-slate-900 shrink-0">KES {amount.toLocaleString()}</span>
                    </div>
                  ))
              )}
            </div>
          </Card>

          {/* Recent Payments Section */}
          <Card className="p-5 border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-emerald-500" />
              <span className="text-xs sm:text-sm font-bold text-slate-700">Latest Transactions</span>
            </div>
            <div className="space-y-2">
              {paymentsData?.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-white shadow-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900">KES {payment.amount.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {payment.mpesa_code && (
                    <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded shadow-sm">
                      {payment.mpesa_code}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}