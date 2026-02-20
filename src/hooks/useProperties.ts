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

type PropertyLocationFields = {
  address?: string;
  street_address?: string;
  neighborhood?: string;
  town_city?: string;
  county?: string;
  landmark?: string;
  postal_code?: string;
};

type CreatePropertyInput = { name: string; numbering_style?: NumberingStyle } & PropertyLocationFields;
type UpdatePropertyInput = { id: string; name: string; numbering_style?: NumberingStyle } & PropertyLocationFields;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

async function getUserIdOrThrow(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

function composeLegacyAddress(location: PropertyLocationFields): string | null {
  const parts = [
    location.street_address?.trim(),
    location.neighborhood?.trim(),
    location.town_city?.trim(),
    location.county?.trim(),
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(', ');
  return location.address?.trim() || null;
}

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
    staleTime: 1000 * 60,
  });
}

export function useCreateProperty(): UseMutationResult<Property, Error, CreatePropertyInput, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Property, Error, CreatePropertyInput, unknown>({
    mutationFn: async (property) => {
      const userId = await getUserIdOrThrow();

      const insertPayload: PropertyInsert = {
        name: property.name,
        address: composeLegacyAddress(property),
        street_address: property.street_address ?? null,
        neighborhood: property.neighborhood ?? null,
        town_city: property.town_city ?? null,
        county: property.county ?? null,
        landmark: property.landmark ?? null,
        postal_code: property.postal_code ?? null,
        numbering_style: property.numbering_style ?? 'numbers',
        user_id: userId,
      };

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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

export function useDeleteProperty(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, unknown>({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Property removed' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

export function useUpdateProperty(): UseMutationResult<Property, Error, UpdatePropertyInput, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Property, Error, UpdatePropertyInput, unknown>({
    mutationFn: async ({ id, ...updates }) => {
      const userId = await getUserIdOrThrow();

      const { data: existing, error: checkError } = await supabase
        .from('properties')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!existing || existing.user_id !== userId) throw new Error('Not authorized to update this property');

      const { data, error } = await supabase
        .from('properties')
        .update({
          name: updates.name,
          address: composeLegacyAddress(updates),
          street_address: updates.street_address ?? null,
          neighborhood: updates.neighborhood ?? null,
          town_city: updates.town_city ?? null,
          county: updates.county ?? null,
          landmark: updates.landmark ?? null,
          postal_code: updates.postal_code ?? null,
          numbering_style: updates.numbering_style ?? 'numbers',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Property updated' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}
