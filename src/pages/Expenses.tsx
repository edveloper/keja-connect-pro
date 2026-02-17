import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Building2, Home, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
import { format, addMonths, subMonths } from "date-fns";

export default function Expenses() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  // 1. New Date State (matches Dashboard logic)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Format for the database: "YYYY-MM"
  const monthKey = selectedDate ? selectedDate.toISOString().slice(0, 7) : null;
  
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
      {/* --- DATE SELECTOR (Same as Dashboard) --- */}
      <div className="surface-panel flex items-center justify-between mb-6 p-2">
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
            <h2 className="font-bold text-sm sm:text-base text-foreground">{dateLabel}</h2>
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
          onClick={() => setSelectedDate(prev => prev ? addMonths(prev, 1) : new Date())}
        >
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Button>
      </div>

      {/* Total Expenses Summary (Using a softer blue-style for specific cards) */}
      <Card className="mb-6 bg-blue-50/50 border-blue-100 shadow-none">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-600 tracking-tight mb-1">Total Outflow</p>
              <p className="text-2xl font-black text-blue-900 leading-none">
                KES {(totalExpenses || 0).toLocaleString()}
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
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
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
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No expenses recorded for this time period.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id} className="relative border-slate-100 shadow-sm overflow-hidden group">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none text-[10px] px-1.5 py-0">
                        {expense.expense_categories?.name || 'General'}
                      </Badge>
                      {expense.unit_id ? (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                          <Home className="h-2.5 w-2.5" />
                          Unit {expense.units?.unit_number}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                          <Building2 className="h-2.5 w-2.5" />
                          Property
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-lg leading-tight mb-1">
                      KES {expense.amount.toLocaleString()}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-slate-500 mb-2 italic">
                        "{expense.description}"
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                         <p className="text-[10px] font-medium text-slate-400">
                        {expense.properties?.name} | {formatDate(expense.expense_date)}
                        </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/5"
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

