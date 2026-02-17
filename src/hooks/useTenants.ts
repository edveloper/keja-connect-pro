import { useMutation, useQuery, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export function useTenants() {
  return useQuery<TenantWithRelations[], Error>({
    queryKey: ["tenants"],
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

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          units!tenants_unit_id_fkey(
            id,
            unit_number,
            properties!units_property_id_fkey(id, name)
          )
        `)
        .in("unit_id", unitIds)
        .order("name", { ascending: true });

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

        const base: Tenant = {
          id: r.id,
          name: r.name,
          phone: r.phone,
          rent_amount: r.rent_amount,
          unit_id: r.unit_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
          user_id: r.user_id,
          lease_start: r.lease_start,
          opening_balance: r.opening_balance,
          security_deposit: r.security_deposit,
          first_month_override: r.first_month_override,
          is_prorated: r.is_prorated,
        };

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
        const leaseMonth =
          tenantData.lease_start?.slice(0, 7) || new Date().toISOString().slice(0, 7);

        try {
          await supabase.rpc("create_opening_balance_charge", {
            p_tenant_id: tenant.id,
            p_amount: tenantData.opening_balance,
            p_effective_month: leaseMonth,
            p_note: "Opening balance - arrears before lease start",
          });
        } catch (err: unknown) {
          console.error("Failed to create opening balance charge:", err);
        }
      }

      if (tenantData.lease_start && tenantData.rent_amount) {
        const leaseStart = new Date(tenantData.lease_start);
        const currentMonth = new Date();
        let chargeDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        let isFirstMonth = true;
        const chargesToCreate: Database["public"]["Tables"]["charges"]["Insert"][] = [];

        while (chargeDate <= endDate) {
          const chargeMonth = chargeDate.toISOString().slice(0, 7);
          let chargeAmount = tenantData.rent_amount;

          if (isFirstMonth && tenantData.is_prorated && tenantData.first_month_override) {
            chargeAmount = tenantData.first_month_override;
          }

          chargesToCreate.push({
            tenant_id: tenant.id,
            amount: chargeAmount,
            charge_month: chargeMonth,
            type: "rent",
            note: isFirstMonth ? "First month rent" : "Monthly rent",
          });

          isFirstMonth = false;
          chargeDate.setMonth(chargeDate.getMonth() + 1);
        }

        if (chargesToCreate.length > 0) {
          const { error: chargesError } = await supabase.from("charges").insert(chargesToCreate);
          if (chargesError) {
            console.error("Failed to create rent charges:", chargesError);
          }
        }
      }

      return { data: tenant as Tenant, addAnother };
    },
    onSuccess: ({ addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      toast({
        title: addAnother ? "Tenant Added" : "Success",
        description: addAnother
          ? "Tenant and charges created. Ready for next entry"
          : "Tenant and charges created successfully",
      });
    },
    onError: (error: unknown) => {
      console.error("Create tenant error:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
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
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Success", description: "Tenant updated" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

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
      toast({ title: "Success", description: "Tenant and all related data removed" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

