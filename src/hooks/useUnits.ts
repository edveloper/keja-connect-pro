import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useUnits(propertyId?: string) {
  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // We join properties to check the user_id of the owner
      let query = supabase
        .from('units')
        .select('*, properties!inner(name, address, user_id)')
        .eq('properties.user_id', session?.user?.id)
        .order('unit_number', { ascending: true });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unit: { property_id: string; unit_number: string }) => {
      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Unit created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkCreateUnits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (units: { property_id: string; unit_number: string }[]) => {
      const { data, error } = await supabase
        .from('units')
        .insert(units)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: `${data.length} units created` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Success', description: 'Unit deleted' });
    },
  });
}