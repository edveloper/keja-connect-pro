import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { migrateToChargesSystem } from "@/scripts/migrateToCharges";

interface MigrationState {
  isChecking: boolean;
  isMigrating: boolean;
  needsMigration: boolean;
  migrationComplete: boolean;
  error: string | null;
}

const MIGRATION_KEY = "charges_v1";

/**
 * Auto-migrate legacy users to charges system.
 * Migration state is persisted in DB (user_migrations), not localStorage.
 */
export function useAutoMigration() {
  const [state, setState] = useState<MigrationState>({
    isChecking: true,
    isMigrating: false,
    needsMigration: false,
    migrationComplete: false,
    error: null,
  });

  useEffect(() => {
    checkAndMigrate();
  }, []);

  async function upsertMigrationState(
    userId: string,
    values: {
      status: "pending" | "running" | "completed" | "failed";
      last_error?: string | null;
      started_at?: string | null;
      completed_at?: string | null;
    }
  ) {
    await supabase.from("user_migrations").upsert(
      {
        user_id: userId,
        migration_key: MIGRATION_KEY,
        ...values,
      },
      { onConflict: "user_id,migration_key" }
    );
  }

  async function checkAndMigrate() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState((prev) => ({ ...prev, isChecking: false }));
        return;
      }

      const { data: migrationRow } = await supabase
        .from("user_migrations")
        .select("status, last_error")
        .eq("user_id", user.id)
        .eq("migration_key", MIGRATION_KEY)
        .maybeSingle();

      if (migrationRow?.status === "completed") {
        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: false,
          migrationComplete: true,
          error: null,
        });
        return;
      }

      // If previous run failed, surface error and avoid infinite retry loops.
      if (migrationRow?.status === "failed") {
        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: true,
          migrationComplete: false,
          error: migrationRow.last_error ?? "Previous migration attempt failed.",
        });
        return;
      }

      const needsMigration = await checkIfMigrationNeeded(user.id);
      if (!needsMigration) {
        await upsertMigrationState(user.id, {
          status: "completed",
          last_error: null,
          completed_at: new Date().toISOString(),
        });

        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: false,
          migrationComplete: true,
          error: null,
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        isChecking: false,
        isMigrating: true,
        needsMigration: true,
        error: null,
      }));

      await upsertMigrationState(user.id, {
        status: "running",
        last_error: null,
        started_at: new Date().toISOString(),
        completed_at: null,
      });

      const results = await migrateToChargesSystem();
      const hasErrors = results.some((r) => r.errors.length > 0);

      if (hasErrors) {
        const errorMessage =
          "Migration completed with warnings. Open /migrate for details.";

        await upsertMigrationState(user.id, {
          status: "failed",
          last_error: errorMessage,
          completed_at: null,
        });

        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: true,
          migrationComplete: false,
          error: errorMessage,
        });
        return;
      }

      await upsertMigrationState(user.id, {
        status: "completed",
        last_error: null,
        completed_at: new Date().toISOString(),
      });

      setState({
        isChecking: false,
        isMigrating: false,
        needsMigration: false,
        migrationComplete: true,
        error: null,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Migration failed";

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          await upsertMigrationState(user.id, {
            status: "failed",
            last_error: message,
            completed_at: null,
          });
        }
      } catch {
        // Ignore secondary persistence failures here; UI still gets the root error.
      }

      setState({
        isChecking: false,
        isMigrating: false,
        needsMigration: true,
        migrationComplete: false,
        error: message,
      });
    }
  }

  return state;
}

/**
 * Returns true if user has tenants but no charges yet.
 */
async function checkIfMigrationNeeded(userId: string): Promise<boolean> {
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", userId);

  if (!properties?.length) return false;

  const propertyIds = properties.map((p) => p.id);
  const { data: units } = await supabase
    .from("units")
    .select("id")
    .in("property_id", propertyIds);

  if (!units?.length) return false;

  const unitIds = units.map((u) => u.id);
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id")
    .in("unit_id", unitIds);

  if (!tenants?.length) return false;

  const tenantIds = tenants.map((t) => t.id);
  const { data: charges } = await supabase
    .from("charges")
    .select("id")
    .in("tenant_id", tenantIds)
    .limit(1);

  return !charges || charges.length === 0;
}

