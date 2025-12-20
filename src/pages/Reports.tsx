import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboard";
import { useTotalExpenses, useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { TrendingUp, TrendingDown, Wallet, Banknote, PieChart, Calendar } from "lucide-react";
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
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Net Income Card */}
          <Card className={`p-5 ${isProfit ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Net Income</p>
                <p className={`text-3xl font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
                  KES {Math.abs(netIncome).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isProfit ? 'Profit' : 'Loss'} this month
                </p>
              </div>
              <div className={`p-3 rounded-full ${isProfit ? 'bg-success/20' : 'bg-destructive/20'}`}>
                {isProfit ? (
                  <TrendingUp className="h-8 w-8 text-success" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
              </div>
            </div>
          </Card>

          {/* Income vs Expenses */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <Banknote className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-lg font-bold text-foreground">
                    KES {totalCollected.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <Wallet className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold text-foreground">
                    KES {totalExpensesAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Collection Rate */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Collection Rate</span>
              </div>
              <span className="text-sm font-bold text-foreground">{collectionRate.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Collected: KES {totalCollected.toLocaleString()}</span>
              <span>Expected: KES {expectedRent.toLocaleString()}</span>
            </div>
          </Card>

          {/* Expenses Breakdown */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Expenses by Category</span>
            </div>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No expenses recorded this month
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{category}</span>
                      <span className="text-sm font-medium text-foreground">
                        KES {amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Recent Payments */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Recent Payments</h3>
            {!paymentsData || paymentsData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payments recorded
              </p>
            ) : (
              <div className="space-y-2">
                {paymentsData.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        KES {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {payment.mpesa_code && (
                      <span className="text-xs text-muted-foreground font-mono">
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
