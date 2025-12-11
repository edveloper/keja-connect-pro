import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export type NumberingStyle = 'numbers' | 'letters' | 'block_unit' | 'floor_unit';

export const NUMBERING_STYLES: { value: NumberingStyle; label: string; example: string; hint: string }[] = [
  { value: 'numbers', label: 'Numbers', example: '1, 2, 3...', hint: 'Enter a number (e.g., 1, 2, 3)' },
  { value: 'letters', label: 'Letters', example: 'A, B, C...', hint: 'Enter a letter (e.g., A, B, C)' },
  { value: 'block_unit', label: 'Block + Unit', example: 'A1, A2, B1, B2...', hint: 'Enter block letter + unit number (e.g., A1, B2)' },
  { value: 'floor_unit', label: 'Floor + Unit', example: '1A, 1B, 2A, 2B...', hint: 'Enter floor number + unit letter (e.g., 1A, 2B)' },
];

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (property: { name: string; address?: string; numbering_style?: NumberingStyle }) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(property)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Success', description: 'Property created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Property deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
