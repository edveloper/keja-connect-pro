import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Lock, EyeOff, Scale } from "lucide-react";

export default function Privacy() {
  return (
    <>
      {/* SEO METADATA */}
      <Helmet>
        <title>Privacy Policy | Keja-Connect</title>
        <meta
          name="description"
          content="Read Keja-Connect’s privacy policy outlining how landlord and tenant data is stored, protected, and used in Kenya."
        />
      </Helmet>

      <PageContainer title="Privacy & Policy" subtitle="Data handling and usage terms">
        <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm animate-in fade-in">

          {/* SEO INTRO */}
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Keja-Connect is committed to protecting landlord and tenant data.
            This privacy policy explains how information is collected, stored,
            and used within the platform in compliance with responsible data
            handling practices in Kenya.
          </p>

          <div className="flex items-center gap-3 text-primary mb-6">
            <ShieldCheck className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Our Commitment</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Keja Connect Privacy Standards
              </p>
            </div>
          </div>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

              <section>
                <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                  <Lock className="h-4 w-4 text-primary" />
                  <h3>1. Secure Data Management</h3>
                </div>
                <p>
                  Keja Connect stores property details, tenant contact information,
                  and financial records strictly for rent collection and expense
                  tracking. We do not sell or distribute your private data to
                  third-party marketing agencies.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                  <EyeOff className="h-4 w-4 text-primary" />
                  <h3>2. Tenant Confidentiality</h3>
                </div>
                <p>
                  Landlords are responsible for ensuring tenant consent before
                  storing personal data. Keja Connect functions solely as a
                  digital management ledger and does not independently contact
                  tenants.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                  <Scale className="h-4 w-4 text-primary" />
                  <h3>3. Accuracy & Disclaimers</h3>
                </div>
                <p>
                  All calculations within Keja Connect are derived from user-
                  provided data. Users should verify records before making legal,
                  tax, or financial decisions based on generated reports.
                </p>
              </section>

              <section className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <h3 className="font-bold text-foreground mb-2 text-xs uppercase">
                  Compliance Note
                </h3>
                <p className="text-xs italic">
                  By using Keja Connect, you agree to safeguard your login
                  credentials and ensure lawful use of stored tenant data.
                </p>
              </section>

              <div className="text-center pt-4 border-t border-border/50">
                <p className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                  Keja Connect — Property Management Simplified
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </PageContainer>
    </>
  );
}
