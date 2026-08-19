import { useMutation, useQuery, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { buildRentCharges } from "@/lib/charges";
import { currentMonthKey, parseDateKey, toMonthKey } from "@/lib/month";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

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

type PropertyIdRow = { id: string };
type UnitIdRow = { id: string };
type TenantSelectRow = Tenant & {
  units?: {
    id: string;
    unit_number: string;
    properties?: { id: string; name: string } | null;
  } | null;
};

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export function useTenants(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;

  return useQuery<TenantWithRelations[], Error>({
    queryKey: ["tenants", includeArchived ? "all" : "active"],
    queryFn: async (): Promise<TenantWithRelations[]> => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = (properties as PropertyIdRow[]).map((p) => p.id).filter(Boolean);
      if (propertyIds.length === 0) return [];

      const { data: units, error: unitError } = await supabase
        .from("units")
        .select("id")
        .in("property_id", propertyIds);

      if (unitError) throw unitError;
      if (!units || units.length === 0) return [];

      const unitIds = (units as UnitIdRow[]).map((u) => u.id).filter(Boolean);
      if (unitIds.length === 0) return [];

      let query = supabase
        .from("tenants")
        .select(`
          *,
          units!tenants_unit_id_fkey(
            id,
            unit_number,
            properties!units_property_id_fkey(id, name)
          )
        `)
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (!includeArchived) {
        // Archived tenants have no unit, so scope to the caller's units only
        // when we are excluding them.
        query = query.eq("status", "active").in("unit_id", unitIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data ?? []) as TenantSelectRow[];
      return rows.map((r) => {
        const unitsRel = r.units
          ? {
              id: r.units.id,
              unit_number: r.units.unit_number,
              properties: r.units.properties
                ? { id: r.units.properties.id, name: r.units.properties.name }
                : null,
            }
          : null;

        const { units: _units, ...base } = r;
        return { ...base, units: unitsRel } as TenantWithRelations;
      });
    },
    staleTime: 1000 * 30,
  });
}

export function useUserProperties() {
  return useQuery<{ id: string; name: string }[], Error>({
    queryKey: ["user-properties"],
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId) return [];

      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId)
        .order("name");

      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateTenant(): UseMutationResult<
  { data: Tenant; addAnother?: boolean },
  Error,
  { tenantData: Partial<Tenant> & { name: string; phone: string }; addAnother?: boolean },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation<
    { data: Tenant; addAnother?: boolean },
    Error,
    { tenantData: Partial<Tenant> & { name: string; phone: string }; addAnother?: boolean },
    unknown
  >({
    mutationFn: async ({ tenantData, addAnother }) => {
      const userId = await getUserIdOrNull();
      if (!userId) throw new Error("Not authenticated");

      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({ ...tenantData, user_id: userId })
        .select()
        .single();

      if (tenantError) throw tenantError;

      if (tenantData.opening_balance && tenantData.opening_balance > 0) {
        const leaseMonth = tenantData.lease_start
          ? toMonthKey(parseDateKey(tenantData.lease_start))
          : currentMonthKey();

        const { error: openingError } = await supabase.rpc("create_opening_balance_charge", {
          p_tenant_id: tenant.id,
          p_amount: Math.round(tenantData.opening_balance),
          p_effective_month: leaseMonth,
          p_note: "Opening balance - arrears before lease start",
        });
        if (openingError) throw openingError;
      }

      if (tenantData.lease_start && tenantData.rent_amount) {
        const chargesToCreate = buildRentCharges({
          rentAmount: tenantData.rent_amount,
          leaseStart: tenantData.lease_start,
          isProrated: tenantData.is_prorated,
          firstMonthOverride: tenantData.first_month_override,
        }).map<Database["public"]["Tables"]["charges"]["Insert"]>((charge) => ({
          ...charge,
          tenant_id: tenant.id,
        }));

        if (chargesToCreate.length > 0) {
          const { error: chargesError } = await supabase.from("charges").insert(chargesToCreate);
          if (chargesError) throw chargesError;
        }
      }

      return { data: tenant as Tenant, addAnother };
    },
    onSuccess: ({ addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      toast({
        title: "Tenant added",
        description: addAnother
          ? "Rent charged from their lease start. Ready for the next one."
          : "Rent has been charged from their lease start date.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not add tenant",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTenant(): UseMutationResult<
  Tenant,
  Error,
  Partial<Tenant> & { id: string },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, Partial<Tenant> & { id: string }, unknown>({
    mutationFn: async ({ id, ...updates }) => {
      const { data: before, error: beforeError } = await supabase
        .from("tenants")
        .select("rent_amount, opening_balance, lease_start")
        .eq("id", id)
        .single();
      if (beforeError) throw beforeError;

      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      const tenant = data as Tenant;

      // The row and the ledger have to move together. Changing rent used to
      // update the tenant record while leaving every charge at the old amount.
      const rentChanged =
        updates.rent_amount !== undefined &&
        Number(updates.rent_amount) !== Number(before.rent_amount ?? 0);
      const leaseChanged =
        updates.lease_start !== undefined && updates.lease_start !== before.lease_start;

      if (rentChanged || leaseChanged) {
        const { error: syncError } = await supabase.rpc("sync_tenant_charges", {
          p_tenant_id: id,
          p_reprice_from: null,
        });
        if (syncError) throw syncError;
      }

      const openingChanged =
        updates.opening_balance !== undefined &&
        Number(updates.opening_balance) !== Number(before.opening_balance ?? 0);

      if (openingChanged && Number(updates.opening_balance) > 0) {
        const effectiveMonth = tenant.lease_start
          ? toMonthKey(parseDateKey(tenant.lease_start))
          : currentMonthKey();

        const { error: openingError } = await supabase.rpc("create_opening_balance_charge", {
          p_tenant_id: id,
          p_amount: Math.round(Number(updates.opening_balance)),
          p_effective_month: effectiveMonth,
          p_note: "Opening balance - arrears before lease start",
        });
        if (openingError) throw openingError;
      }

      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      toast({ title: "Tenant updated", description: "Rent and charges are back in sync." });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update tenant",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Move a tenant out. Keeps their payment history and frees the unit.
 * Use this rather than deletion — deleting cascades away every charge and
 * payment, which retroactively changes months you have already closed.
 */
export function useArchiveTenant(): UseMutationResult<
  void,
  Error,
  { id: string; movedOutOn?: string | null },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; movedOutOn?: string | null }, unknown>({
    mutationFn: async ({ id, movedOutOn }) => {
      const { error } = await supabase.rpc("archive_tenant", {
        p_tenant_id: id,
        p_moved_out_on: movedOutOn ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({
        title: "Tenant moved out",
        description: "Their payment history is kept and the unit is free again.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not move tenant out",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Permanently erase a tenant and everything attached to them.
 * Only for records created in error — for a real move-out use `useArchiveTenant`.
 */
export function useDeleteTenant(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, unknown>({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_tenant_cascade", {
        p_tenant_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "Tenant deleted", description: "The record and its history are gone." });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete tenant",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

