import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Building2, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenses, useExpenseCategories, useCreateExpense, useDeleteExpense, useTotalExpenses } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useUnits } from "@/hooks/useUnits";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Expenses() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const { data: expenses, isLoading: expensesLoading } = useExpenses(currentMonth);
  const { data: categories } = useExpenseCategories();
  const { data: properties } = useProperties();
  const { data: units } = useUnits();
  const { data: totalExpenses } = useTotalExpenses(currentMonth);
  
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  };

  const isLoading = expensesLoading;

  return (
    <PageContainer 
      title="Expenses" 
      subtitle={new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
    >
      {/* Total Expenses Summary */}
      <Card className="mb-6 bg-destructive/10 border-destructive/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-destructive">
                KES {(totalExpenses || 0).toLocaleString()}
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          This Month's Expenses
        </h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No expenses recorded this month.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id} className="relative">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {expense.expense_categories?.name || 'Unknown'}
                      </Badge>
                      {expense.unit_id ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {expense.units?.unit_number}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Property-wide
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-foreground">
                      KES {expense.amount.toLocaleString()}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {expense.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {expense.properties?.name} • {formatDate(expense.expense_date)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteExpense.mutate(expense.id)}
                    disabled={deleteExpense.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ExpenseForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        categories={categories || []}
        properties={properties || []}
        units={units || []}
        onSubmit={(data) => {
          createExpense.mutate(data, {
            onSuccess: () => setIsAddOpen(false),
          });
        }}
        isLoading={createExpense.isPending}
      />
    </PageContainer>
  );
}
