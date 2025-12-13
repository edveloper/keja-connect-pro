import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ExpenseCategory {
  id: string;
  name: string;
  is_preset: boolean;
}

export interface Expense {
  id: string;
  property_id: string;
  unit_id: string | null;
  category_id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  expense_month: string;
  created_at: string;
  expense_categories?: { name: string };
  properties?: { name: string };
  units?: { unit_number: string } | null;
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('is_preset', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

export function useExpenses(month?: string) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  
  return useQuery({
    queryKey: ['expenses', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories(name), properties(name), units(unit_number)')
        .eq('expense_month', currentMonth)
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: {
      property_id: string;
      unit_id?: string | null;
      category_id: string;
      amount: number;
      description?: string;
      expense_date?: string;
    }) => {
      const expenseDate = expense.expense_date || new Date().toISOString().slice(0, 10);
      const expenseMonth = expenseDate.slice(0, 7);
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          expense_date: expenseDate,
          expense_month: expenseMonth,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Expense recorded successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name, is_preset: false })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'Success', description: 'Category created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Expense deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useTotalExpenses(month?: string) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  
  return useQuery({
    queryKey: ['total-expenses', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_month', currentMonth);
      
      if (error) throw error;
      return data?.reduce((sum, e) => sum + e.amount, 0) || 0;
    },
  });
}
