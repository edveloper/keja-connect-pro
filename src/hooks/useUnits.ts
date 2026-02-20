// src/hooks/useUnits.ts
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Unit = Database['public']['Tables']['units']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];
type CreateUnitInput = { property_id: string; unit_number: string };
type BulkCreateUnitsInput = CreateUnitInput[];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

type UnitWithProperty = Unit & {
  properties?: {
    id: string;
    name: string;
    address: string | null;
    user_id: string | null;
  } | null;
};

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
 * Fetch units. If propertyId is provided, returns units for that property (only if the property belongs to the signed-in user).
 * If propertyId is omitted, returns all units for properties owned by the signed-in user.
 */
export function useUnits(propertyId?: string) {
  return useQuery<UnitWithProperty[], Error>({
    queryKey: ['units', propertyId ?? null],
    queryFn: async (): Promise<UnitWithProperty[]> => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      // If propertyId is provided, ensure it belongs to the user
      if (propertyId) {
        const { data: prop, error: propErr } = await supabase
          .from('properties')
          .select('id, user_id')
          .eq('id', propertyId)
          .single();

        if (propErr) throw propErr;
        if (!prop || prop.user_id !== userId) return [];
      }

      // Join properties to ensure we only return units for properties owned by the user
      let query = supabase
        .from('units')
        .select('*, properties!inner(id, name, address, user_id)')
        .eq('properties.user_id', userId)
        .order('unit_number', { ascending: true });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as UnitWithProperty[];
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Create a single unit. Validates that the property belongs to the signed-in user.
 */
export function useCreateUnit(): UseMutationResult<Unit, Error, CreateUnitInput, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Unit, Error, CreateUnitInput, unknown>({
    mutationFn: async (unit) => {
      const userId = await getUserIdOrThrow();

      // Verify property ownership
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('id, user_id')
        .eq('id', unit.property_id)
        .single();

      if (propErr) throw propErr;
      if (!prop || prop.user_id !== userId) throw new Error('Property not found or not owned by current user');

      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single();

      if (error) throw error;
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Unit created successfully' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

/**
 * Bulk create units. Validates that all units belong to the same property and that the property is owned by the user.
 * Accepts an array of { property_id, unit_number }.
 */
export function useBulkCreateUnits(): UseMutationResult<Unit[], Error, BulkCreateUnitsInput, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Unit[], Error, BulkCreateUnitsInput, unknown>({
    mutationFn: async (units) => {
      if (!Array.isArray(units) || units.length === 0) throw new Error('No units provided');

      const userId = await getUserIdOrThrow();

      // Ensure all units reference the same property (common case) or validate each property individually
      const propertyIds = Array.from(new Set(units.map(u => u.property_id).filter(Boolean)));
      if (propertyIds.length === 0) throw new Error('Invalid property ids');

      // Verify ownership for each property
      const { data: props, error: propErr } = await supabase
        .from('properties')
        .select('id, user_id')
        .in('id', propertyIds);

      if (propErr) throw propErr;
      const ownedProps = (props ?? []).filter((p: Property) => p.user_id === userId).map((p: Property) => p.id);
      const notOwned = propertyIds.filter(pid => !ownedProps.includes(pid));
      if (notOwned.length > 0) throw new Error('One or more properties are not owned by the current user');

      const { data, error } = await supabase
        .from('units')
        .insert(units)
        .select();

      if (error) throw error;
      return (data ?? []) as Unit[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: `${data.length} units created` });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

/**
 * Delete a unit. Ensures the unit belongs to a property owned by the current user before deleting.
 */
export function useDeleteUnit(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, unknown>({
    mutationFn: async (unitId: string) => {
      const userId = await getUserIdOrThrow();

      // Fetch unit with its property owner
      const { data: unitRow, error: unitErr } = await supabase
        .from('units')
        .select('id, property_id, properties!inner(user_id)')
        .eq('id', unitId)
        .single();

      if (unitErr) throw unitErr;
      if (!unitRow) throw new Error('Unit not found');

      const ownerId = unitRow.properties?.user_id ?? null;
      if (ownerId !== userId) throw new Error('Not authorized to delete this unit');

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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

/**
 * Update a unit (number and/or availability), ensuring ownership via property.
 */
export function useUpdateUnit(): UseMutationResult<
  Unit,
  Error,
  { id: string; unit_number?: string; is_available?: boolean },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation<
    Unit,
    Error,
    { id: string; unit_number?: string; is_available?: boolean },
    unknown
  >({
    mutationFn: async ({ id, ...updates }) => {
      const userId = await getUserIdOrThrow();

      const { data: unitRow, error: unitErr } = await supabase
        .from('units')
        .select('id, property_id, properties!inner(user_id)')
        .eq('id', id)
        .single();

      if (unitErr) throw unitErr;
      if (!unitRow || unitRow.properties?.user_id !== userId) throw new Error('Not authorized to update this unit');

      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Success', description: 'Unit updated' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}
