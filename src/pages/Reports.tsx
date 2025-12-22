import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses, useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { TrendingUp, TrendingDown, Wallet, Banknote, PieChart, Calendar, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Reports() {
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData();
  const { data: totalExpenses, isLoading: expensesLoading } = useTotalExpenses();
  const { data: expenses } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: paymentsData } = usePayments();

  const currentMonth = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  
  const totalCollected = dashboardData?.stats?.totalCollected || 0;
  const totalExpensesAmount = totalExpenses || 0;
  const netIncome = totalCollected - totalExpensesAmount;
  const isProfit = netIncome >= 0;

  const expectedRent = dashboardData?.units?.reduce((sum, unit) => {
    return sum + (unit.rent_amount || 0);
  }, 0) || 0;

  const collectionRate = expectedRent > 0 ? (totalCollected / expectedRent) * 100 : 0;

  const expensesByCategory = expenses?.reduce((acc, expense) => {
    const categoryName = categories?.find(c => c.id === expense.category_id)?.name || 'Other';
    acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const isLoading = dashboardLoading || expensesLoading;

  return (
    <PageContainer title="Financial Reports" subtitle={currentMonth}>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Net Income Card - Responsive Font Sizes */}
          <Card className={cn(
            "p-5 sm:p-6 transition-all",
            isProfit 
              ? "bg-gradient-to-br from-success/5 via-success/10 to-success/5 border-success/20" 
              : "bg-gradient-to-br from-destructive/5 via-destructive/10 to-destructive/5 border-destructive/20"
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1 uppercase tracking-wider">Net Income</p>
                {/* Scaled Text: text-2xl on tiny phones, text-4xl on desktop */}
                <p className={cn(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight truncate",
                  isProfit ? 'text-success' : 'text-destructive'
                )}>
                  KES {Math.abs(netIncome).toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={cn("text-xs sm:text-sm font-semibold", isProfit ? 'text-success' : 'text-destructive')}>
                    {isProfit ? 'Profit' : 'Loss'} this month
                  </span>
                </div>
              </div>
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shrink-0",
                isProfit ? 'bg-success/15' : 'bg-destructive/15'
              )}>
                {isProfit ? (
                  <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-success" />
                ) : (
                  <TrendingDown className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
                )}
              </div>
            </div>
          </Card>

          {/* Income vs Expenses Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-xl bg-success/15 shrink-0">
                  <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase">Income</p>
                  <p className="text-base sm:text-xl font-bold text-foreground truncate">
                    {(totalCollected / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-xl bg-destructive/15 shrink-0">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase">Expenses</p>
                  <p className="text-base sm:text-xl font-bold text-foreground truncate">
                    {(totalExpensesAmount / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Collection Rate - Compacted for mobile */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold">Collection Rate</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-primary">{collectionRate.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-3 gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <span>Collected: <span className="font-medium text-foreground">KES {totalCollected.toLocaleString()}</span></span>
              <span>Expected: <span className="font-medium text-foreground">KES {expectedRent.toLocaleString()}</span></span>
            </div>
          </Card>

          {/* Expenses Breakdown - Better row handling */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4 text-destructive" />
              <span className="text-xs sm:text-sm font-semibold">Expenses by Category</span>
            </div>
            <div className="space-y-2">
              {Object.entries(expensesByCategory).length === 0 ? (
                <p className="text-xs text-center py-4 text-muted-foreground">No expenses recorded</p>
              ) : (
                Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                      <span className="text-xs sm:text-sm truncate mr-2">{category}</span>
                      <span className="text-xs sm:text-sm font-semibold shrink-0">KES {amount.toLocaleString()}</span>
                    </div>
                  ))
              )}
            </div>
          </Card>

          {/* Recent Payments - Mono font for codes */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-success" />
              <span className="text-xs sm:text-sm font-semibold">Recent Payments</span>
            </div>
            <div className="space-y-2">
              {paymentsData?.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate">KES {payment.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(payment.payment_date), 'MMM d')}</p>
                  </div>
                  {payment.mpesa_code && (
                    <span className="text-[9px] sm:text-xs font-mono bg-background border px-2 py-1 rounded">
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