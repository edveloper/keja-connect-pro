import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type NumberingStyle = 'numbers' | 'letters' | 'block_unit' | 'floor_unit';

export const NUMBERING_STYLES: { value: NumberingStyle; label: string; example: string; hint: string }[] = [
  { value: 'numbers', label: 'Plain Numbers', example: '1, 2, 3...', hint: 'e.g., 1, 2, 3' },
  { value: 'letters', label: 'Plain Letters', example: 'A, B, C...', hint: 'e.g., A, B, C' },
  { value: 'block_unit', label: 'Block + Number', example: 'A1, A2, B1...', hint: 'Block letter + Unit number' },
  { value: 'floor_unit', label: 'Floor + Letter', example: '1A, 1B, 2A...', hint: 'Floor number + Unit letter' },
];

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (property: { name: string; address?: string; numbering_style: NumberingStyle }) => {
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
      toast({ title: 'Success', description: 'Property created' });
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
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Property removed' });
    },
  });
}