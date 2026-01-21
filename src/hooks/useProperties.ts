import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type NumberingStyle = 'numbers' | 'letters' | 'block_unit' | 'floor_unit';

export const NUMBERING_STYLES: { value: NumberingStyle; label: string; example: string; hint: string }[] = [
  { value: 'numbers', label: 'Plain Numbers', example: '1, 2, 3...', hint: 'e.g., 1, 2, 3' },
  { value: 'letters', label: 'Plain Letters', example: 'A, B, C...', hint: 'e.g., A, B, C' },
  { value: 'block_unit', label: 'Block + Number', example: 'A1, A2, B1...', hint: 'Block letter + Unit number' },
  { value: 'floor_unit', label: 'Floor + Letter', example: '1A, 1B, 2A...', hint: 'Floor number + Unit letter' },
];

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];

/** Return the current user id or null (do not throw here; caller can decide) */
async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** Return the current user id or throw if not authenticated */
async function getUserIdOrThrow(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

/**
 * Fetch properties for the signed-in user
 */
export function useProperties() {
  return useQuery<Property[], Error>({
    queryKey: ['properties'],
    queryFn: async (): Promise<Property[]> => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Property[];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Create a property and attach it to the current user
 */
export function useCreateProperty(): UseMutationResult<Property, any, { name: string; address?: string; numbering_style?: NumberingStyle }, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Property, any, { name: string; address?: string; numbering_style?: NumberingStyle }, unknown>({
    mutationFn: async (property) => {
      const userId = await getUserIdOrThrow();

      const insertPayload: PropertyInsert = {
        name: property.name,
        address: property.address ?? null,
        numbering_style: property.numbering_style ?? 'numbers',
        user_id: userId,
      } as any;

      const { data, error } = await supabase
        .from('properties')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data as Property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Success', description: 'Property created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to create property', variant: 'destructive' });
    },
  });
}

/**
 * Delete a property by id
 */
export function useDeleteProperty(): UseMutationResult<void, any, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation<void, any, string, unknown>({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Property removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to remove property', variant: 'destructive' });
    },
  });
}
