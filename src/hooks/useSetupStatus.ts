// src/hooks/useSetupStatus.ts
//
// How far through setup a landlord is.
//
// The dashboard used to render six KES 0 stat cards and an assistant panel
// saying "no urgent actions, your collection signals look stable" to someone who
// had not yet added a property. This is what lets it show a setup path instead.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeSetupProgress } from "@/lib/setup-progress";

export interface SetupStatus {
  /** Used to scope the "don't show me this again" preference. */
  userId: string | null;
  properties: number;
  units: number;
  tenants: number;
  hasPayTo: boolean;

  /** Nothing at all has been set up yet. */
  isEmpty: boolean;
  /** At least one tenant exists, so the dashboard has something real to show. */
  isReady: boolean;
  /** Which step the landlord is on: 1 property, 2 units, 3 tenant, 4 paybill. */
  currentStep: 1 | 2 | 3 | 4;
  /** 0-4, for the progress indicator. */
  completedSteps: number;
}

const EMPTY: SetupStatus = {
  userId: null,
  properties: 0,
  units: 0,
  tenants: 0,
  hasPayTo: false,
  isEmpty: true,
  isReady: false,
  currentStep: 1,
  completedSteps: 0,
};

/**
 * Row counts without pulling the rows.
 *
 * Written as three explicit queries rather than one parameterised helper:
 * reassigning a Supabase query builder inside a conditional makes TypeScript
 * recurse through the generated schema types until it gives up.
 */
async function countProperties(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

async function countUnits(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

async function countActiveTenants(userId: string): Promise<number> {
  // Archived tenants are past occupants and do not count as setup.
  const { count, error } = await supabase
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

export function useSetupStatus() {
  return useQuery<SetupStatus, Error>({
    queryKey: ["setup-status"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) return EMPTY;

      const [properties, units, tenants, settings] = await Promise.all([
        countProperties(userId),
        countUnits(userId),
        countActiveTenants(userId),
        supabase
          .from("landlord_settings")
          .select("pay_to")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const hasPayTo = Boolean(settings.data?.pay_to?.trim());

      return {
        userId,
        properties,
        units,
        tenants,
        hasPayTo,
        ...computeSetupProgress({ properties, units, tenants, hasPayTo }),
      };
    },
  });
}
