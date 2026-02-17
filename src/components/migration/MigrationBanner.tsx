// src/components/migration/MigrationBanner.tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAutoMigration } from '@/hooks/useAutoMigration';

interface MigrationStateLike {
  isChecking: boolean;
  isMigrating: boolean;
  migrationComplete: boolean;
  error: string | null;
}

interface MigrationBannerProps {
  migration: MigrationStateLike;
}

export function MigrationBanner({ migration }: MigrationBannerProps) {
  // Don't show anything if checking or already complete
  if (migration.isChecking || migration.migrationComplete) {
    return null;
  }

  // Show migration in progress
  if (migration.isMigrating) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Upgrading your account...</strong>
          <p className="mt-1 text-sm">
            We're migrating your data to our improved tracking system. This will only take a moment.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Show error if migration failed
  if (migration.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Migration issue:</strong> {migration.error}
          <p className="mt-1 text-sm">
            Your data is safe. Please refresh the page or contact support if this persists.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Full-screen migration overlay for blocking UI during migration
 * Use this if you want to prevent user interaction during migration
 */
export function MigrationOverlay() {
  const migration = useAutoMigration();

  if (!migration.isMigrating) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
        <div className="mb-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Upgrading Your Account
        </h2>
        <p className="text-slate-600 text-sm">
          We're migrating your data to our improved tracking system.
          This will only take a moment and your data is completely safe.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Please don't close this page</span>
        </div>
      </div>
    </div>
  );
}
