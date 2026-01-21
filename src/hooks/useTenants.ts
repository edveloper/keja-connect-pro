// src/hooks/useTenants.ts
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Tenant = Database['public']['Tables']['tenants']['Row'];

type TenantWithRelations = Tenant & {
  units: {
    id: string;
    unit_number: string;
    properties: {
      id: string;
      name: string;
    } | null;
  } | null;
};

/** Return the current user id or null (do not throw here; caller can decide) */
async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/**
 * Fetch tenants that belong to the current user's properties.
 * Returns an array of TenantWithRelations.
 */
export function useTenants() {
  return useQuery<TenantWithRelations[], Error>({
    queryKey: ['tenants'],
    queryFn: async (): Promise<TenantWithRelations[]> => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      // 1) Get properties for this user
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', userId);

      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map((p: any) => p.id).filter(Boolean);
      if (propertyIds.length === 0) return [];

      // 2) Get units for those properties
      const { data: units, error: unitError } = await supabase
        .from('units')
        .select('id')
        .in('property_id', propertyIds);

      if (unitError) throw unitError;
      if (!units || units.length === 0) return [];

      const unitIds = units.map((u: any) => u.id).filter(Boolean);
      if (unitIds.length === 0) return [];

      // 3) Get tenants for those units and include the nested unit/property relation
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          units!tenants_unit_id_fkey(
            id,
            unit_number,
            properties!units_property_id_fkey(id, name)
          )
        `)
        .in('unit_id', unitIds)
        .order('name', { ascending: true });

      if (error) throw error;

      // The nested select returns a shape that isn't directly typed by our Database type.
      // Cast carefully after a runtime check.
      const rows = (data ?? []) as any[];
      return rows.map(r => {
        // Normalize the nested shape to TenantWithRelations
        const unitsRel = r.units
          ? {
              id: r.units.id,
              unit_number: r.units.unit_number,
              properties: r.units.properties ? { id: r.units.properties.id, name: r.units.properties.name } : null,
            }
          : null;

        const base: Tenant = {
          id: r.id,
          name: r.name,
          phone: r.phone,
          rent_amount: r.rent_amount,
          unit_id: r.unit_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };

        return { ...base, units: unitsRel } as TenantWithRelations;
      });
    },
    staleTime: 1000 * 30, // 30s
  });
}

/**
 * Fetch properties for the current user (id + name)
 */
export function useUserProperties() {
  return useQuery<{ id: string; name: string }[], Error>({
    queryKey: ['user-properties'],
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Create tenant
 */
export function useCreateTenant(): UseMutationResult<
  { data: Tenant; addAnother?: boolean },
  any,
  { tenantData: Partial<Tenant> & { name: string; phone: string }; addAnother?: boolean },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation<
    { data: Tenant; addAnother?: boolean },
    any,
    { tenantData: Partial<Tenant> & { name: string; phone: string }; addAnother?: boolean },
    unknown
  >({
    mutationFn: async ({ tenantData, addAnother }) => {
      const { data, error } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Tenant, addAnother };
    },
    onSuccess: ({ addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: addAnother ? 'Tenant Added' : 'Success',
        description: addAnother ? 'Ready for next entry' : 'Tenant created successfully',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to create tenant', variant: 'destructive' });
    },
  });
}

/**
 * Update tenant
 */
export function useUpdateTenant(): UseMutationResult<Tenant, any, Partial<Tenant> & { id: string }, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Tenant, any, Partial<Tenant> & { id: string }, unknown>({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Tenant updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to update tenant', variant: 'destructive' });
    },
  });
}

/**
 * Delete tenant
 */
export function useDeleteTenant(): UseMutationResult<void, any, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation<void, any, string, unknown>({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Tenant removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to delete tenant', variant: 'destructive' });
    },
  });
}
