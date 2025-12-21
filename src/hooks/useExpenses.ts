import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

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

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async (): Promise<ExpenseCategory[]> => {
      // @ts-ignore
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
    queryFn: async (): Promise<Expense[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) return [];
      
      // First, get user's properties
      // @ts-ignore
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', session.user.id);
      
      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];
      
      const propertyIds = properties.map(p => p.id);
      
      // Then get expenses for those properties
      // @ts-ignore
      const { data, error } = await supabase
        .from('expenses')
        // FIX APPLIED HERE: Explicitly naming foreign keys to prevent 400 Bad Request
        .select('*, expense_categories!expenses_category_id_fkey(name), properties!expenses_property_id_fkey(name), units!expenses_unit_id_fkey(unit_number)')
        .in('property_id', propertyIds)
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
      
      // Prepare the insert data - only include unit_id if it's not null
      const insertData: any = {
        property_id: expense.property_id,
        category_id: expense.category_id,
        amount: expense.amount,
        expense_date: expenseDate,
        expense_month: expenseMonth,
      };
      
      // Only add unit_id if it's not null
      if (expense.unit_id) {
        insertData.unit_id = expense.unit_id;
      }
      
      // Only add description if it exists
      if (expense.description) {
        insertData.description = expense.description;
      }
      
      console.log('Inserting expense:', insertData); // Debug log
      
      // @ts-ignore
      const { data, error } = await supabase
        .from('expenses')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Expense insert error:', error); // Debug log
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Expense recorded successfully' });
    },
    onError: (error: any) => {
      console.error('Full error:', error); // Debug log
      const errorMessage = error?.message || 'Failed to record expense';
      toast({ 
        title: 'Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      // @ts-ignore
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
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expenseId: string) => {
      // @ts-ignore
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
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useTotalExpenses(month?: string) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  
  return useQuery({
    queryKey: ['total-expenses', currentMonth],
    queryFn: async (): Promise<number> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) return 0;
      
      // First, get user's properties
      // @ts-ignore
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', session.user.id);
      
      if (propError) throw propError;
      if (!properties || properties.length === 0) return 0;
      
      const propertyIds = properties.map(p => p.id);
      
      // Then get expenses for those properties
      // @ts-ignore
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .in('property_id', propertyIds)
        .eq('expense_month', currentMonth);
      
      if (error) throw error;
      return data?.reduce((sum, e) => sum + e.amount, 0) || 0;
    },
  });
}