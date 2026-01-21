// src/hooks/useAutoMigration.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { migrateToChargesSystem } from '@/scripts/migrateToCharges';

interface MigrationState {
  isChecking: boolean;
  isMigrating: boolean;
  needsMigration: boolean;
  migrationComplete: boolean;
  error: string | null;
}

/**
 * Hook that automatically migrates user data to charges system
 * Runs once per user by tracking migration status in localStorage
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

  async function checkAndMigrate() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isChecking: false }));
        return;
      }

      // Check if this user has already been migrated
      const migrationKey = `migration_complete_${user.id}`;
      const alreadyMigrated = localStorage.getItem(migrationKey);

      if (alreadyMigrated === 'true') {
        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: false,
          migrationComplete: true,
          error: null,
        });
        return;
      }

      // Check if user actually needs migration (has tenants but no charges)
      const needsMigration = await checkIfMigrationNeeded(user.id);

      if (!needsMigration) {
        // No migration needed, mark as complete
        localStorage.setItem(migrationKey, 'true');
        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: false,
          migrationComplete: true,
          error: null,
        });
        return;
      }

      // Migration needed - run it automatically
      setState(prev => ({
        ...prev,
        isChecking: false,
        isMigrating: true,
        needsMigration: true,
      }));

      console.log('🔄 Auto-migrating user data to charges system...');
      const results = await migrateToChargesSystem();
      
      // Check if migration had any errors
      const hasErrors = results.some(r => r.errors.length > 0);
      
      if (hasErrors) {
        console.warn('⚠️ Migration completed with some errors:', results);
        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: false,
          migrationComplete: true,
          error: 'Migration completed with warnings. Check console for details.',
        });
      } else {
        console.log('✅ Auto-migration completed successfully!');
        setState({
          isChecking: false,
          isMigrating: false,
          needsMigration: false,
          migrationComplete: true,
          error: null,
        });
      }

      // Mark as migrated
      localStorage.setItem(migrationKey, 'true');

    } catch (err: any) {
      console.error('❌ Auto-migration failed:', err);
      setState({
        isChecking: false,
        isMigrating: false,
        needsMigration: true,
        migrationComplete: false,
        error: err.message,
      });
    }
  }

  return state;
}

/**
 * Check if user actually needs migration
 * Returns true if user has tenants but no charges
 */
async function checkIfMigrationNeeded(userId: string): Promise<boolean> {
  // Get user's properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('user_id', userId);

  if (!properties || properties.length === 0) {
    return false; // No properties = no migration needed
  }

  const propertyIds = properties.map(p => p.id);

  // Get units for these properties
  const { data: units } = await supabase
    .from('units')
    .select('id')
    .in('property_id', propertyIds);

  if (!units || units.length === 0) {
    return false; // No units = no migration needed
  }

  const unitIds = units.map(u => u.id);

  // Get tenants for these units
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .in('unit_id', unitIds);

  if (!tenants || tenants.length === 0) {
    return false; // No tenants = no migration needed
  }

  const tenantIds = tenants.map(t => t.id);

  // Check if charges exist for any of these tenants
  const { data: charges } = await supabase
    .from('charges')
    .select('id')
    .in('tenant_id', tenantIds)
    .limit(1);

  // If no charges exist, migration is needed
  return !charges || charges.length === 0;
}