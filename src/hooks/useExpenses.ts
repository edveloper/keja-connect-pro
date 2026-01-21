// src/hooks/useExpenses.ts
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

export interface Expense extends Omit<ExpenseRow, 'category_id' | 'property_id' | 'unit_id'> {
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

/** Return the current user id or null (do not throw here; caller can decide) */
async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

function toNumberAmount(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/** Fetch expense categories */
export function useExpenseCategories() {
  return useQuery<ExpenseCategory[], Error>({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as ExpenseCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch expenses for the user's properties, optionally filtered by month (YYYY-MM).
 * If `month` is undefined, defaults to current month.
 */
export function useExpenses(month?: string | null) {
  const filterMonth = month === undefined ? new Date().toISOString().slice(0, 7) : month;

  return useQuery<Expense[], Error>({
    queryKey: ['expenses', filterMonth],
    queryFn: async (): Promise<Expense[]> => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', userId);

      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map((p: any) => p.id).filter(Boolean);
      if (propertyIds.length === 0) return [];

      let query = supabase
        .from('expenses')
        .select('*, expense_categories!expenses_category_id_fkey(name), properties!expenses_property_id_fkey(name), units!expenses_unit_id_fkey(unit_number)')
        .in('property_id', propertyIds)
        .order('expense_date', { ascending: false });

      if (filterMonth) {
        query = query.eq('expense_month', filterMonth);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Expense[];
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Compute total expenses for a selected date (Date or string).
 * Returns { data: number, isLoading: boolean }.
 */
export function useTotalExpenses(selectedDate: Date | string | null) {
  let monthString: string | null = null;

  if (selectedDate instanceof Date) {
    monthString = selectedDate.toISOString().slice(0, 7);
  } else if (typeof selectedDate === 'string') {
    // If it's already a string like "2024-05", use it.
    // If it's a full ISO string, slice it.
    monthString = selectedDate.includes('-') ? selectedDate.slice(0, 7) : selectedDate;
  }

  const { data: expenses, isLoading } = useExpenses(monthString);
  const total = (expenses ?? []).reduce((sum, exp) => sum + toNumberAmount(exp.amount), 0);
  return { data: total, isLoading };
}

/** Create expense mutation */
export function useCreateExpense(): UseMutationResult<Expense, any, Partial<Expense> & { expense_date?: string }, unknown> {
  const queryClient = useQueryClient();
  return useMutation<Expense, any, Partial<Expense> & { expense_date?: string }, unknown>({
    mutationFn: async (expense) => {
      const expenseDate = expense.expense_date ?? new Date().toISOString().slice(0, 10);
      const insertPayload = {
        ...expense,
        expense_date: expenseDate,
        expense_month: expenseDate.slice(0, 7),
      } as any;

      const { data, error } = await supabase
        .from('expenses')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Expense recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to record expense', variant: 'destructive' });
    },
  });
}

/** Delete expense mutation */
export function useDeleteExpense(): UseMutationResult<void, any, string, unknown> {
  const queryClient = useQueryClient();
  return useMutation<void, any, string, unknown>({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Deleted', description: 'Expense record removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to delete expense', variant: 'destructive' });
    },
  });
}

/** Create expense category */
export function useCreateCategory(): UseMutationResult<ExpenseCategory, any, string, unknown> {
  const queryClient = useQueryClient();
  return useMutation<ExpenseCategory, any, string, unknown>({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'Success', description: 'Category created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to create category', variant: 'destructive' });
    },
  });
}
