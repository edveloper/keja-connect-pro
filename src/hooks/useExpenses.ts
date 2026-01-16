import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').order('name');
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({ title: 'Success', description: 'New category added' });
    },
  });
}

// MODIFIED: Supports month filtering and "All-Time" (null)
export function useExpenses(month?: string | null) {
  // If undefined is passed, default to current month. If null is passed, it stays null (All-Time).
  const filterMonth = month === undefined ? new Date().toISOString().slice(0, 7) : month;

  return useQuery({
    queryKey: ['expenses', filterMonth],
    queryFn: async (): Promise<Expense[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data: properties } = await supabase.from('properties').select('id').eq('user_id', session.user.id);
      if (!properties || properties.length === 0) return [];
      const propertyIds = properties.map(p => p.id);

      let query = supabase
        .from('expenses')
        .select('*, expense_categories!expenses_category_id_fkey(name), properties!expenses_property_id_fkey(name), units!expenses_unit_id_fkey(unit_number)')
        .in('property_id', propertyIds)
        .order('expense_date', { ascending: false });

      // Only apply month filter if filterMonth is NOT null
      if (filterMonth) {
        query = query.eq('expense_month', filterMonth);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as Expense[];
    },
  });
}

// MODIFIED: Simplified to pass the month/null value through
export function useTotalExpenses(month?: string | null) {
  const { data: expenses, isLoading } = useExpenses(month);
  const total = expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;
  return { data: total, isLoading };
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: any) => {
      const expenseDate = expense.expense_date || new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('expenses')
        .insert({ 
          ...expense, 
          expense_date: expenseDate, 
          expense_month: expenseDate.slice(0, 7) 
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Expense recorded' });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ExpenseRow>) => {
      const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Updated', description: 'Expense record updated' });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Removed', description: 'Expense deleted' });
    },
  });
}