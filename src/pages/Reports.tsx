import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses, useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { TrendingUp, TrendingDown, Wallet, Banknote, PieChart, Calendar, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

  // Calculate expected rent
  const expectedRent = dashboardData?.units?.reduce((sum, unit) => {
    return sum + (unit.rent_amount || 0);
  }, 0) || 0;

  const collectionRate = expectedRent > 0 ? (totalCollected / expectedRent) * 100 : 0;

  // Group expenses by category
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
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Net Income Card */}
          <Card className={`p-6 ${isProfit ? 'bg-gradient-to-br from-success/5 via-success/10 to-success/5 border-success/20' : 'bg-gradient-to-br from-destructive/5 via-destructive/10 to-destructive/5 border-destructive/20'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Net Income</p>
                <p className={`text-4xl font-bold tracking-tight ${isProfit ? 'text-success' : 'text-destructive'}`}>
                  KES {Math.abs(netIncome).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  {isProfit ? 'Profit' : 'Loss'} this month
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${isProfit ? 'bg-success/15' : 'bg-destructive/15'}`}>
                {isProfit ? (
                  <TrendingUp className="h-10 w-10 text-success" />
                ) : (
                  <TrendingDown className="h-10 w-10 text-destructive" />
                )}
              </div>
            </div>
          </Card>

          {/* Income vs Expenses */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/15">
                  <Banknote className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Income</p>
                  <p className="text-xl font-bold text-foreground">
                    KES {(totalCollected / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/15">
                  <Wallet className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expenses</p>
                  <p className="text-xl font-bold text-foreground">
                    KES {(totalExpensesAmount / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Collection Rate */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Collection Rate</span>
              </div>
              <span className="text-lg font-bold text-primary">{collectionRate.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              <span>Collected: <span className="font-medium text-foreground">KES {totalCollected.toLocaleString()}</span></span>
              <span>Expected: <span className="font-medium text-foreground">KES {expectedRent.toLocaleString()}</span></span>
            </div>
          </Card>

          {/* Expenses Breakdown */}
          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-destructive/10">
                <PieChart className="h-4 w-4 text-destructive" />
              </div>
              <span className="text-sm font-semibold text-foreground">Expenses by Category</span>
            </div>
            {Object.keys(expensesByCategory).length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-xl">
                <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No expenses recorded this month</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount], index) => (
                    <div 
                      key={category} 
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span className="text-sm text-foreground font-medium">{category}</span>
                      <span className="text-sm font-semibold text-foreground">
                        KES {amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Recent Payments */}
          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-success/10">
                <Receipt className="h-4 w-4 text-success" />
              </div>
              <span className="text-sm font-semibold text-foreground">Recent Payments</span>
            </div>
            {!paymentsData || paymentsData.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-xl">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No payments recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentsData.slice(0, 5).map((payment, index) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        KES {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {payment.mpesa_code && (
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1 rounded-lg">
                        {payment.mpesa_code}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
