// src/components/migration/MigrationRunner.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { migrateToChargesSystem } from '@/scripts/migrateToCharges';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

type MigrationResult = Awaited<ReturnType<typeof migrateToChargesSystem>>[number];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Migration failed';
}

export function MigrationRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<MigrationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const migrationResults = await migrateToChargesSystem();
      setResults(migrationResults);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔄 Migrate to Charges-Based System</CardTitle>
        <CardDescription>
          This will migrate your existing tenant data to the new charges-based tracking system.
          This is a one-time operation and is safe to run multiple times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>What this does:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Creates opening balance charges from existing data</li>
              <li>Generates rent charges for all months since lease start</li>
              <li>Allocates existing payments to charges</li>
              <li>Does NOT delete any existing data</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runMigration} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRunning ? 'Migrating...' : 'Start Migration'}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Migration completed!</strong> Processed {results.length} tenant(s).
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {results.map((result, idx) => (
                <Card key={idx}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{result.tenantName}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-1 text-sm">
                    {result.openingBalanceCharge && (
                      <p className="text-green-600">✓ Opening balance created</p>
                    )}
                    <p>✓ Rent charges created: {result.rentChargesCreated}</p>
                    <p>✓ Payments allocated: {result.paymentsAllocated}</p>
                    {result.errors.length > 0 && (
                      <div className="text-red-600 mt-2">
                        <p className="font-semibold">⚠️ Errors:</p>
                        <ul className="list-disc list-inside">
                          {result.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
