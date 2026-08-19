// src/hooks/useTenantBalances.ts
//
// Lifetime arrears per tenant — everything ever billed, less everything ever
// applied.
//
// The dashboard and tenant list both work a month at a time, so their `balance`
// is the balance for that month alone. A tenant can be square for August and
// still owe 60,000 from earlier in the year, which is exactly the person a
// landlord needs to see.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantBalance {
  totalCharged: number;
  totalPaid: number;
  /** Positive means owed, negative means in credit. */
  balance: number;
  /** Whole months of rent the arrears represent. 0 when rent is unknown. */
  monthsBehind: number;
}

export type TenantBalanceMap = Map<string, TenantBalance>;

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Aggregated in the browser from two narrow queries rather than in Postgres.
 *
 * Each row is a uuid and an integer, and a fifty-unit portfolio over three
 * years is a few thousand of them, so this is comfortably cheaper than a round
 * trip per tenant. If a landlord ever runs into the high hundreds of units this
 * should become a `get_tenant_balances()` RPC returning one row per tenant.
 */
export function useTenantBalances(rentByTenant?: Map<string, number>) {
  return useQuery<TenantBalanceMap, Error>({
    queryKey: ["tenant-balances"],
    staleTime: 30_000,
    queryFn: async () => {
      const balances: TenantBalanceMap = new Map();

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) return balances;

      // Row-level security scopes both tables to the caller's own tenants.
      const [chargesRes, allocationsRes] = await Promise.all([
        supabase.from("charges").select("tenant_id, amount"),
        supabase.from("payment_allocations").select("tenant_id, amount"),
      ]);

      if (chargesRes.error) throw chargesRes.error;
      if (allocationsRes.error) throw allocationsRes.error;

      const ensure = (id: string): TenantBalance => {
        let row = balances.get(id);
        if (!row) {
          row = { totalCharged: 0, totalPaid: 0, balance: 0, monthsBehind: 0 };
          balances.set(id, row);
        }
        return row;
      };

      (chargesRes.data ?? []).forEach((c) => {
        ensure(c.tenant_id).totalCharged += toNumber(c.amount);
      });
      (allocationsRes.data ?? []).forEach((a) => {
        if (!a.tenant_id) return;
        ensure(a.tenant_id).totalPaid += toNumber(a.amount);
      });

      balances.forEach((row, id) => {
        row.totalCharged = Math.round(row.totalCharged);
        row.totalPaid = Math.round(row.totalPaid);
        row.balance = row.totalCharged - row.totalPaid;

        const rent = rentByTenant?.get(id) ?? 0;
        row.monthsBehind = rent > 0 && row.balance > 0 ? Math.floor(row.balance / rent) : 0;
      });

      return balances;
    },
  });
}
