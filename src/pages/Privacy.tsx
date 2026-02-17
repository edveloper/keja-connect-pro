import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, EyeOff, Scale, Database, UserCheck } from "lucide-react";

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Keja-Connect</title>
        <meta
          name="description"
          content="Read Keja-Connect's privacy policy explaining how property and tenant data is collected, used, and protected."
        />
      </Helmet>

      <PageContainer title="Privacy Policy" subtitle="How your data is handled">
        <div className="space-y-5">
          <Card className="surface-panel">
            <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">
              Keja-Connect is designed to help landlords manage rental operations responsibly. This page
              explains what data is used, why it is used, and your responsibilities when storing tenant
              information.
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  1. Data We Store
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Property details, unit records, tenant profile information, payment entries, and expense
                records are stored to power core product features.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  2. Protection & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Access is scoped to authenticated users. Data visibility and operations are controlled via
                row-level access rules to reduce unintended cross-account exposure.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-primary" />
                  3. Confidentiality
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Keja-Connect does not sell your operational data for advertising. You remain responsible for
                lawful capture and storage of tenant personal information.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  4. Reporting Disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Financial outputs are generated from user-entered records. Always verify your figures before
                making legal, tax, or statutory submissions.
              </CardContent>
            </Card>
          </div>

          <Card className="surface-panel border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Your Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Keep your login credentials secure and private.</p>
              <p>Use accurate data to maintain reliable records and reports.</p>
              <p>Only store tenant details where you have a lawful basis to do so.</p>
              <p className="pt-1 text-xs uppercase tracking-wider font-semibold text-foreground">
                Last reviewed: February 17, 2026
              </p>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground uppercase tracking-widest">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Keja-Connect Privacy Standards
            </span>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
