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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { toMonthKey } from "@/lib/month";
import { MonthSelector } from "@/components/layout/MonthSelector";
import { formatKES } from "@/lib/number-formatter";

export default function Expenses() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  // 1. New Date State (matches Dashboard logic)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Format for the database: "YYYY-MM"
  const monthKey = selectedDate ? toMonthKey(selectedDate) : null;
  
  // 2. Pass monthKey to hooks
  const { data: expenses, isLoading: expensesLoading } = useExpenses(monthKey);
  const { data: totalExpenses } = useTotalExpenses(monthKey);

  const { data: categories } = useExpenseCategories();
  const { data: properties } = useProperties();
  const { data: units } = useUnits();
  
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  };

  const dateLabel = selectedDate ? format(selectedDate, "MMMM yyyy") : "All-Time Expenses";

  return (
    <PageContainer 
      title="Expenses" 
      subtitle={dateLabel}
    >
      <MonthSelector
        value={selectedDate}
        onChange={setSelectedDate}
        allTimeLabel="All-Time Expenses"
      />

      {/* Total Expenses Summary (Using a softer blue-style for specific cards) */}
      <Card className="mb-6 bg-accent/60 border-accent shadow-none">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-primary tracking-tight mb-1">Total Outflow</p>
              <p className="text-2xl font-black text-accent-foreground leading-none">
                {formatKES(totalExpenses || 0)}
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)} size="sm" className="rounded-full px-4 shadow-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Expense Breakdown
            </h2>
            <Badge variant="outline" className="text-[10px] font-bold">
                {expenses?.length || 0} items
            </Badge>
        </div>
        
        {expensesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="text-center py-12 bg-muted/40 rounded-3xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No expenses recorded for this time period.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id} className="relative border-border shadow-sm overflow-hidden group">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-none text-[10px] px-1.5 py-0">
                        {expense.expense_categories?.name || 'General'}
                      </Badge>
                      {expense.unit_id ? (
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                          <Home className="h-2.5 w-2.5" />
                          Unit {expense.units?.unit_number}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                          <Building2 className="h-2.5 w-2.5" />
                          Property
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-foreground text-lg leading-tight mb-1">
                      KES {expense.amount.toLocaleString()}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground mb-2 italic">
                        "{expense.description}"
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                         <p className="text-[10px] font-medium text-muted-foreground">
                        {expense.properties?.name} | {formatDate(expense.expense_date)}
                        </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
                    onClick={() => setExpenseToDelete(expense.id)}
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

      <AlertDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => {
          if (!open) setExpenseToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this expense record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!expenseToDelete) return;
                deleteExpense.mutate(expenseToDelete, {
                  onSettled: () => setExpenseToDelete(null),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

