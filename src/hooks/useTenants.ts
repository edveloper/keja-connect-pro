import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async (): Promise<TenantWithRelations[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];

      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', session.user.id);

      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];
      const propertyIds = properties.map(p => p.id);

      const { data: units, error: unitError } = await supabase
        .from('units')
        .select('id')
        .in('property_id', propertyIds);

      if (unitError) throw unitError;
      if (!units || units.length === 0) return [];
      const unitIds = units.map(u => u.id);

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
      return data as unknown as TenantWithRelations[];
    },
  });
}

export function useUserProperties() {
  return useQuery({
    queryKey: ['user-properties'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', session.user.id)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      tenantData, 
      addAnother 
    }: { 
      tenantData: { 
        name: string; 
        phone: string; 
        rent_amount: number; 
        unit_id?: string | null;
        opening_balance?: number;
        security_deposit?: number;
      },
      addAnother?: boolean 
    }) => {
      const { data, error } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();
      
      if (error) throw error;
      return { data, addAnother };
    },
    onSuccess: ({ addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ 
        title: addAnother ? 'Tenant Added' : 'Success', 
        description: addAnother ? 'Ready for next entry' : 'Tenant created successfully' 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Tenant updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
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
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}