import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut, Smartphone, Archive, HelpCircle, Shield, Mail } from "lucide-react";
import { OnboardingImportPanel } from "@/components/settings/OnboardingImportPanel";
import { useLandlordSettings, useSaveLandlordSettings } from "@/hooks/useLandlordSettings";
import { useTenants } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { parseDateKey } from "@/lib/month";

export default function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useLandlordSettings();
  const saveSettings = useSaveLandlordSettings();
  const { data: allTenants } = useTenants({ includeArchived: true });

  const [payTo, setPayTo] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (!settings) return;
    setPayTo(settings.payTo);
    setBusinessName(settings.businessName);
  }, [settings]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
  }, []);

  const archived = (allTenants ?? []).filter((t) => t.status === "archived");
  const isDirty =
    payTo !== (settings?.payTo ?? "") || businessName !== (settings?.businessName ?? "");

  return (
    <PageContainer title="Settings" subtitle="Your account, payment details and data">
      <div className="space-y-5 pb-24">
        {/* Payment details — used in reminders and on exports */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              How tenants pay you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="pay-to" className="text-xs font-bold">
                    Paybill, till or account
                  </Label>
                  <Input
                    id="pay-to"
                    value={payTo}
                    onChange={(e) => setPayTo(e.target.value)}
                    placeholder="e.g. Paybill 247247, account 0700"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Included at the end of every rent reminder you send, so tenants do not
                    have to ask where to send the money.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="business-name" className="text-xs font-bold">
                    Name on documents
                  </Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Kamau Properties"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Appears on statements and lender packs you export.
                  </p>
                </div>

                <Button
                  className="w-full"
                  disabled={!isDirty || saveSettings.isPending}
                  onClick={() => saveSettings.mutate({ payTo, businessName })}
                >
                  {saveSettings.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Spreadsheet import */}
        <OnboardingImportPanel />

        {/* Past tenants */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="h-4 w-4 text-primary" />
              Past tenants
              <Badge variant="outline" className="ml-auto">
                {archived.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {archived.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tenants you move out appear here. Their payment history is kept, so past
                months keep reporting the same figures.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {archived.map((tenant) => (
                  <div key={tenant.id} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span className="font-medium truncate">{tenant.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {tenant.moved_out_on
                        ? `Left ${format(parseDateKey(tenant.moved_out_on), "MMM yyyy")}`
                        : "Moved out"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{email ?? "Signed in"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your data is isolated at the database level — no other landlord can read or
              change your records.
            </p>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Help */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate("/help")}>
            <HelpCircle className="h-4 w-4" />
            <span className="text-xs">Help</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1"
            onClick={() => navigate("/privacy")}
          >
            <Shield className="h-4 w-4" />
            <span className="text-xs">Privacy</span>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">Keja-Connect v1.2.0</p>
      </div>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to see your properties.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth", { replace: true });
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
